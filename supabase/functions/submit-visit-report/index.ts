import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SlotPayload {
  slotId: string;
  machineId: string;
  toyId: string;
  toyName: string;
  replaceAllToys: boolean;
  lastStock: number;
  unitsSold: number;
  unitsRefilled: number;
  unitsRemoved: number;
  falseCoins: number;
  auditedCount: number | null;
  currentStock: number;
  pricePerUnit: number;
  jamStatus: string;
  capacity: number;
  reportIssue: boolean;
  issueDescription: string;
  severity: string;
  cashCollected: number;
  photoUrl: string | null;
  previousProductId: string | null;
  previousStock: number;
  // Swap fields
  newToyId: string;
  newToyName: string;
  newToyCapacity: number;
  newUnitsRefilled: number;
  newPricePerUnit: number;
  newCurrentStock: number;
  swapSurplusShortage: number;
}

interface VisitPayload {
  spotId: string;
  locationId: string;
  setupId: string;
  visitDate: string;
  visitType: string;
  actionType: string;
  totalCashCollected: number;
  hasObservationIssue: boolean;
  observationIssueLog: string;
  observationSeverity: string;
  slots: SlotPayload[];
  sourceWarehouseId: string | null;
}

// ── Helper: get latest running balance for a location ──
async function getRunningBalance(
  db: ReturnType<typeof createClient>,
  itemDetailId: string,
  warehouseId: string | null,
  slotId: string | null
): Promise<number> {
  let query = db
    .from("inventory_ledger")
    .select("running_balance")
    .eq("item_detail_id", itemDetailId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (warehouseId) {
    query = query.eq("warehouse_id", warehouseId);
  } else {
    query = query.is("warehouse_id", null);
  }

  if (slotId) {
    query = query.eq("slot_id", slotId);
  } else {
    query = query.is("slot_id", null);
  }

  const { data } = await query.maybeSingle();
  return data?.running_balance ?? 0;
}

// ── Helper: append a ledger entry ──
async function appendLedger(
  db: ReturnType<typeof createClient>,
  entry: {
    item_detail_id: string;
    warehouse_id?: string | null;
    slot_id?: string | null;
    movement_type: string;
    quantity: number;
    running_balance: number;
    reference_id?: string | null;
    reference_type?: string | null;
    performed_by?: string | null;
    notes?: string | null;
  }
) {
  const { error } = await db.from("inventory_ledger").insert({
    item_detail_id: entry.item_detail_id,
    warehouse_id: entry.warehouse_id || null,
    slot_id: entry.slot_id || null,
    movement_type: entry.movement_type,
    quantity: entry.quantity,
    running_balance: entry.running_balance,
    reference_id: entry.reference_id || null,
    reference_type: entry.reference_type || null,
    performed_by: entry.performed_by || null,
    notes: entry.notes || null,
  });
  if (error) {
    console.error("appendLedger error:", JSON.stringify(error));
    throw new Error(`inventory_ledger insert failed: ${error.message}`);
  }
}

// ── Helper: upsert inventory (add quantity) ──
async function upsertInventory(
  db: ReturnType<typeof createClient>,
  itemDetailId: string,
  warehouseId: string,
  quantity: number
) {
  const { data: existing } = await db
    .from("inventory")
    .select("id, quantity_on_hand")
    .eq("item_detail_id", itemDetailId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  if (existing) {
    await db
      .from("inventory")
      .update({
        quantity_on_hand: (existing.quantity_on_hand || 0) + quantity,
        last_updated: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await db.from("inventory").insert({
      item_detail_id: itemDetailId,
      warehouse_id: warehouseId,
      quantity_on_hand: quantity,
      last_updated: new Date().toISOString(),
    });
  }
}

// ── Helper: deduct inventory (subtract quantity) ──
async function deductInventory(
  db: ReturnType<typeof createClient>,
  itemDetailId: string,
  warehouseId: string,
  quantity: number
): Promise<boolean> {
  const { data: existing } = await db
    .from("inventory")
    .select("id, quantity_on_hand")
    .eq("item_detail_id", itemDetailId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  if (existing) {
    const newQty = (existing.quantity_on_hand || 0) - quantity;
    await db
      .from("inventory")
      .update({
        quantity_on_hand: newQty,
        last_updated: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return newQty >= 0;
  } else {
    await db.from("inventory").insert({
      item_detail_id: itemDetailId,
      warehouse_id: warehouseId,
      quantity_on_hand: -quantity,
      last_updated: new Date().toISOString(),
    });
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const db = createClient(supabaseUrl, supabaseServiceKey);

    const payload: VisitPayload = await req.json();
    const {
      spotId,
      locationId,
      setupId,
      visitDate,
      visitType,
      actionType,
      totalCashCollected,
      hasObservationIssue,
      observationIssueLog,
      observationSeverity,
      slots,
      sourceWarehouseId,
    } = payload;

    const warnings: string[] = [];

    // ── Step 1: Insert spot_visits ──
    const { data: visit, error: visitErr } = await db
      .from("spot_visits")
      .insert({
        spot_id: spotId,
        visit_date: visitDate,
        total_cash_collected: totalCashCollected,
        notes: hasObservationIssue
          ? `${observationSeverity}: ${observationIssueLog}`
          : null,
        status: hasObservationIssue ? "flagged" : "completed",
        operator_id: userId,
        visit_type: visitType,
      })
      .select("id")
      .single();

    if (visitErr) throw new Error(`spot_visits insert: ${visitErr.message}`);
    const visitId = visit.id;

    // ── Step 1b: Calculate & persist days_since_last_visit, monthly_rent_per_spot, rent_since_last_visit ──
    {
      // Find previous visit for this spot (same or earlier date, excluding current)
      const { data: prevVisit } = await db
        .from("spot_visits")
        .select("id, visit_date, created_at")
        .eq("spot_id", spotId)
        .neq("id", visitId)
        .lte("visit_date", visitDate)
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const daysSinceLastVisit = prevVisit?.visit_date
        ? Math.max(0, Math.floor((new Date(visitDate).getTime() - new Date(prevVisit.visit_date).getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      // Get location rent and spot count
      const { data: spotRow } = await db
        .from("spots")
        .select("location_id")
        .eq("id", spotId)
        .single();

      let monthlyRentPerSpot: number | null = null;
      let rentSinceLastVisit: number | null = null;

      if (spotRow?.location_id) {
        const { data: loc } = await db
          .from("locations")
          .select("rent_amount")
          .eq("id", spotRow.location_id)
          .single();

        const { count: siblingCount } = await db
          .from("spots")
          .select("id", { count: "exact", head: true })
          .eq("location_id", spotRow.location_id);

        const totalRent = loc?.rent_amount || 0;
        const spotCount = siblingCount || 1;
        monthlyRentPerSpot = totalRent / spotCount;

        if (daysSinceLastVisit !== null) {
          const dailyRent = (monthlyRentPerSpot * 12) / 365;
          rentSinceLastVisit = Math.round((dailyRent * daysSinceLastVisit) * 100) / 100;
        }
      }

      // Update the visit record with calculated fields
      await db
        .from("spot_visits")
        .update({
          days_since_last_visit: daysSinceLastVisit,
          monthly_rent_per_spot: monthlyRentPerSpot,
          rent_since_last_visit: rentSinceLastVisit,
        })
        .eq("id", visitId);
    }

    // ── Step 2: Insert visit_slot_snapshots ──
    const snapshots = slots.map((s) => ({
      visit_id: visitId,
      slot_id: s.slotId,
      previous_product_id: s.previousProductId || s.toyId || null,
      previous_stock: s.lastStock,
      previous_capacity: s.capacity,
      previous_coin_acceptor: s.pricePerUnit,
    }));
    const { error: snapErr } = await db
      .from("visit_slot_snapshots")
      .insert(snapshots);
    if (snapErr)
      throw new Error(`visit_slot_snapshots insert: ${snapErr.message}`);

    // ── Step 3: Insert visit_line_items ──
    const lineItems: Array<Record<string, unknown>> = [];
    for (const s of slots) {
      if (s.replaceAllToys) {
        // Swap: two separate rows — one for old product (swap_out), one for new (swap_in)
        lineItems.push({
          spot_visit_id: visitId,
          machine_id: s.machineId,
          slot_id: s.slotId,
          product_id: s.toyId || s.previousProductId || null,
          action_type: "swap_out",
          quantity_added: 0,
          quantity_removed: s.unitsRemoved,
          cash_collected: s.cashCollected,
          meter_reading: s.auditedCount,
          photo_url: s.photoUrl,
          false_coins: s.falseCoins || 0,
          jam_status: s.jamStatus || "no_jam",
          computed_current_stock: 0,
          units_sold: s.unitsSold,
        });
        lineItems.push({
          spot_visit_id: visitId,
          machine_id: s.machineId,
          slot_id: s.slotId,
          product_id: s.newToyId || null,
          action_type: "swap_in",
          quantity_added: s.newUnitsRefilled,
          quantity_removed: 0,
          cash_collected: 0,
          meter_reading: null,
          photo_url: null,
          false_coins: 0,
          jam_status: "no_jam",
          computed_current_stock: s.newCurrentStock,
          units_sold: 0,
        });
      } else {
        lineItems.push({
          spot_visit_id: visitId,
          machine_id: s.machineId,
          slot_id: s.slotId,
          product_id: s.toyId || null,
          action_type: actionType,
          quantity_added: s.unitsRefilled,
          quantity_removed: s.unitsRemoved,
          cash_collected: s.cashCollected,
          meter_reading: s.auditedCount,
          photo_url: s.photoUrl,
          false_coins: s.falseCoins || 0,
          jam_status: s.jamStatus || "no_jam",
          computed_current_stock: s.currentStock,
          units_sold: s.unitsSold,
        });
      }
    }
    const { error: lineErr } = await db
      .from("visit_line_items")
      .insert(lineItems);
    if (lineErr)
      throw new Error(`visit_line_items insert: ${lineErr.message}`);

    // ── Step 4: Update machine_slots ──
    for (const s of slots) {
      const updateData: Record<string, unknown> = {
        current_stock: s.currentStock,
      };
      if (s.replaceAllToys && s.newToyId) {
        updateData.current_product_id = s.newToyId;
        updateData.current_stock = s.newCurrentStock;
        updateData.capacity = s.newToyCapacity;
        updateData.coin_acceptor = s.newPricePerUnit;
      } else {
        if (s.toyId) updateData.current_product_id = s.toyId;
        if (visitType === "installation") {
          updateData.capacity = s.capacity;
          updateData.coin_acceptor = s.pricePerUnit;
        }
      }
      const { error } = await db
        .from("machine_slots")
        .update(updateData)
        .eq("id", s.slotId);
      if (error)
        throw new Error(`machine_slots update (${s.slotId}): ${error.message}`);
    }

    // ── Step 5: Connected Inventory Ledger + Warehouse Updates ──
    for (const s of slots) {
      if (s.replaceAllToys) {
        // === SWAP FLOW ===
        const oldProductId = s.toyId || s.previousProductId;
        const newProductId = s.newToyId;

        // -- Old product: slot ledger (remove all from slot) --
        if (oldProductId && s.previousStock > 0) {
          await appendLedger(db, {
            item_detail_id: oldProductId,
            slot_id: s.slotId,
            movement_type: "swap_out",
            quantity: -s.previousStock,
            running_balance: 0,
            reference_id: visitId,
            reference_type: "visit",
            performed_by: userId,
            notes: `Old product removed during swap — ${s.toyName}`,
          });
        }

        // -- Old product: return removed units to warehouse --
        if (oldProductId && s.unitsRemoved > 0 && sourceWarehouseId) {
          await upsertInventory(db, oldProductId, sourceWarehouseId, s.unitsRemoved);
          const whBal = await getRunningBalance(db, oldProductId, sourceWarehouseId, null);
          await appendLedger(db, {
            item_detail_id: oldProductId,
            warehouse_id: sourceWarehouseId,
            movement_type: "swap_out",
            quantity: s.unitsRemoved,
            running_balance: whBal + s.unitsRemoved,
            reference_id: visitId,
            reference_type: "visit",
            performed_by: userId,
            notes: `Swap return from slot — ${s.toyName}`,
          });
        }

        // -- Old product: surplus/shortage adjustment --
        if (oldProductId && s.swapSurplusShortage !== 0) {
          await appendLedger(db, {
            item_detail_id: oldProductId,
            slot_id: s.slotId,
            movement_type: "adjustment",
            quantity: s.swapSurplusShortage,
            running_balance: 0,
            reference_id: visitId,
            reference_type: "visit",
            performed_by: userId,
            notes: `Swap ${s.swapSurplusShortage > 0 ? "surplus" : "shortage"}: ${s.swapSurplusShortage}`,
          });
          // Record in inventory_adjustments table
          const expected = s.lastStock - s.unitsSold - s.unitsRemoved - (s.falseCoins || 0) + (s.jamStatus === "by_coin" ? 1 : 0);
          await db.from("inventory_adjustments").insert({
            visit_id: visitId,
            item_detail_id: oldProductId,
            slot_id: s.slotId,
            adjustment_type: s.swapSurplusShortage > 0 ? "surplus" : "shortage",
            expected_quantity: 0,
            actual_quantity: s.swapSurplusShortage,
            difference: s.swapSurplusShortage,
          });
        }

        // -- New product: deduct from warehouse --
        if (newProductId && s.newUnitsRefilled > 0 && sourceWarehouseId) {
          const deducted = await deductInventory(db, newProductId, sourceWarehouseId, s.newUnitsRefilled);
          const whBal = await getRunningBalance(db, newProductId, sourceWarehouseId, null);
          await appendLedger(db, {
            item_detail_id: newProductId,
            warehouse_id: sourceWarehouseId,
            movement_type: "refill",
            quantity: -s.newUnitsRefilled,
            running_balance: whBal - s.newUnitsRefilled,
            reference_id: visitId,
            reference_type: "visit",
            performed_by: userId,
            notes: `Swap refill to field — ${s.newToyName}`,
          });
          if (!deducted) {
            warnings.push(
              `Insufficient warehouse stock for "${s.newToyName}" — refill of ${s.newUnitsRefilled} recorded but warehouse may go negative`
            );
          }
        }

        // -- New product: slot ledger (add to slot) --
        if (newProductId && s.newCurrentStock > 0) {
          await appendLedger(db, {
            item_detail_id: newProductId,
            slot_id: s.slotId,
            movement_type: "swap_in",
            quantity: s.newCurrentStock,
            running_balance: s.newCurrentStock,
            reference_id: visitId,
            reference_type: "visit",
            performed_by: userId,
            notes: `New product loaded during swap — ${s.newToyName}`,
          });
        }

        continue; // Skip normal flow for swap slots
      }

      // === NORMAL (NON-SWAP) FLOW ===
      if (!s.toyId) continue;

      // --- Slot ledger: record the net stock change on the machine slot ---
      const slotBalance = s.currentStock;
      const slotQtyChange = s.currentStock - s.lastStock;
      if (slotQtyChange !== 0) {
        const movementType = slotQtyChange > 0 ? "refill" : "removal";
        await appendLedger(db, {
          item_detail_id: s.toyId,
          slot_id: s.slotId,
          movement_type: movementType,
          quantity: slotQtyChange,
          running_balance: slotBalance,
          reference_id: visitId,
          reference_type: "visit",
          performed_by: userId,
          notes: `${visitType} — ${s.toyName}`,
        });
      }

      // --- Warehouse ledger + inventory updates ---
      if (sourceWarehouseId) {
        // Deduct refilled units from warehouse
        if (s.unitsRefilled > 0) {
          const deducted = await deductInventory(db, s.toyId, sourceWarehouseId, s.unitsRefilled);
          const whBal = await getRunningBalance(db, s.toyId, sourceWarehouseId, null);
          await appendLedger(db, {
            item_detail_id: s.toyId,
            warehouse_id: sourceWarehouseId,
            movement_type: "refill",
            quantity: -s.unitsRefilled,
            running_balance: whBal - s.unitsRefilled,
            reference_id: visitId,
            reference_type: "visit",
            performed_by: userId,
            notes: `Refill to field — ${s.toyName}`,
          });
          if (!deducted) {
            warnings.push(
              `Insufficient warehouse stock for "${s.toyName}" — refill of ${s.unitsRefilled} recorded but warehouse may go negative`
            );
          }
        }

        // Return removed units to warehouse
        if (s.unitsRemoved > 0) {
          await upsertInventory(db, s.toyId, sourceWarehouseId, s.unitsRemoved);
          const whBal = await getRunningBalance(db, s.toyId, sourceWarehouseId, null);
          await appendLedger(db, {
            item_detail_id: s.toyId,
            warehouse_id: sourceWarehouseId,
            movement_type: "removal",
            quantity: s.unitsRemoved,
            running_balance: whBal + s.unitsRemoved,
            reference_id: visitId,
            reference_type: "visit",
            performed_by: userId,
            notes: `Returned from field — ${s.toyName}`,
          });
        }
      }
    }

    // ── Step 6: Financial Integrity Trail — inventory_adjustments ──
    if (visitType === "inventory_audit") {
      const adjustments: Array<Record<string, unknown>> = [];
      for (const s of slots) {
        if (s.replaceAllToys) continue; // Already handled in swap flow
        if (s.auditedCount !== null && s.toyId) {
          const jamAdj = s.jamStatus === "by_coin" ? 1 : 0;
          const falseCoinsAdj = s.falseCoins || 0;
          const expected =
            s.lastStock - s.unitsSold + jamAdj - falseCoinsAdj + s.unitsRefilled - s.unitsRemoved;
          const diff = s.auditedCount - expected;
          if (diff !== 0) {
            adjustments.push({
              visit_id: visitId,
              item_detail_id: s.toyId,
              slot_id: s.slotId,
              adjustment_type: diff > 0 ? "surplus" : "shortage",
              expected_quantity: expected,
              actual_quantity: s.auditedCount,
              difference: diff,
            });
            // Ledger entry for the adjustment
            await appendLedger(db, {
              item_detail_id: s.toyId,
              slot_id: s.slotId,
              movement_type: "adjustment",
              quantity: diff,
              running_balance: s.auditedCount,
              reference_id: visitId,
              reference_type: "visit",
              performed_by: userId,
              notes: `Audit ${diff > 0 ? "surplus" : "shortage"}: expected ${expected}, found ${s.auditedCount}`,
            });
          }
        }
      }
      if (adjustments.length > 0) {
        const { error: adjErr } = await db
          .from("inventory_adjustments")
          .insert(adjustments);
        if (adjErr)
          throw new Error(`inventory_adjustments insert: ${adjErr.message}`);
      }
    }

    // ── Step 7: Automatic Maintenance Loop + Jam Auto-Tickets ──
    const tickets: Array<Record<string, unknown>> = [];

    for (const s of slots) {
      // Slot-level reported issues
      if (s.reportIssue && s.issueDescription) {
        tickets.push({
          location_id: locationId,
          spot_id: spotId,
          machine_id: s.machineId,
          slot_id: s.slotId,
          setup_id: setupId,
          product_id: s.toyId || null,
          visit_id: visitId,
          issue_type: "Field Report",
          description: s.issueDescription,
          priority: s.severity || "medium",
          reporter_id: userId,
          status: "pending",
        });
      }

      // Auto-create jam tickets (auto-resolved)
      if (s.jamStatus && s.jamStatus !== "no_jam") {
        const jamDesc = s.jamStatus === "by_coin"
          ? "Jam by coin (+1 stock adjustment) — resolved during visit"
          : s.jamStatus === "with_coins"
          ? "Jam with coins found — resolved during visit"
          : "Jam without coins — resolved during visit";
        tickets.push({
          location_id: locationId,
          spot_id: spotId,
          machine_id: s.machineId,
          slot_id: s.slotId,
          setup_id: setupId,
          product_id: s.replaceAllToys && s.newToyId ? s.newToyId : (s.toyId || null),
          visit_id: visitId,
          issue_type: "Jam",
          description: jamDesc,
          priority: "low",
          reporter_id: userId,
          status: "completed",
          resolved_at: new Date().toISOString(),
        });
      }
    }

    if (hasObservationIssue && observationIssueLog) {
      tickets.push({
        location_id: locationId,
        spot_id: spotId,
        setup_id: setupId,
        visit_id: visitId,
        issue_type: "Field Report",
        description: observationIssueLog,
        priority: observationSeverity || "medium",
        reporter_id: userId,
        status: "pending",
      });
    }

    if (tickets.length > 0) {
      const { error: ticketErr } = await db
        .from("maintenance_tickets")
        .insert(tickets);
      if (ticketErr)
        throw new Error(`maintenance_tickets insert: ${ticketErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        visitId,
        totalCashCollected,
        slotsProcessed: slots.length,
        ticketsCreated: tickets.length,
        adjustmentsLogged:
          visitType === "inventory_audit"
            ? slots.filter(
                (s) =>
                  !s.replaceAllToys &&
                  s.auditedCount !== null &&
                  s.auditedCount !==
                    s.lastStock -
                      s.unitsSold + (s.jamStatus === "by_coin" ? 1 : 0) -
                      (s.falseCoins || 0) +
                      s.unitsRefilled -
                      s.unitsRemoved
              ).length
            : 0,
        warnings,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("submit-visit-report error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
