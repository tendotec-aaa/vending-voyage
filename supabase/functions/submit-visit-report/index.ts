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
  // For swaps: what was the old product before replacement
  previousProductId: string | null;
  previousStock: number;
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
  // Source warehouse for inventory operations
  sourceWarehouseId: string | null;
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

    // Verify user
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

    // Use service role for the transaction (bypasses RLS)
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
    const lineItems = slots.map((s) => ({
      spot_visit_id: visitId,
      machine_id: s.machineId,
      slot_id: s.slotId,
      product_id: s.toyId || null,
      action_type: s.replaceAllToys ? "swap" : actionType,
      quantity_added: s.unitsRefilled,
      quantity_removed: s.unitsRemoved,
      cash_collected: s.cashCollected,
      meter_reading: s.auditedCount,
      photo_url: s.photoUrl,
    }));
    const { error: lineErr } = await db
      .from("visit_line_items")
      .insert(lineItems);
    if (lineErr)
      throw new Error(`visit_line_items insert: ${lineErr.message}`);

    // ── Step 4: Update machine_slots (True-Up) ──
    for (const s of slots) {
      const updateData: Record<string, unknown> = {
        current_stock: s.currentStock,
      };
      if (s.toyId) updateData.current_product_id = s.toyId;
      if (visitType === "installation") {
        updateData.capacity = s.capacity;
        updateData.coin_acceptor = s.pricePerUnit;
      }
      const { error } = await db
        .from("machine_slots")
        .update(updateData)
        .eq("id", s.slotId);
      if (error)
        throw new Error(`machine_slots update (${s.slotId}): ${error.message}`);
    }

    // ── Step 5: Connected Inventory Ledger (Feature 2) ──
    if (sourceWarehouseId) {
      for (const s of slots) {
        // Handle product swap: return old product stock to warehouse
        if (s.replaceAllToys && s.previousProductId && s.previousProductId !== s.toyId) {
          const returnQty = s.previousStock;
          if (returnQty > 0) {
            await upsertInventory(db, s.previousProductId, sourceWarehouseId, returnQty);
          }
        }

        // Deduct refilled units from warehouse
        if (s.unitsRefilled > 0 && s.toyId) {
          const deducted = await deductInventory(
            db,
            s.toyId,
            sourceWarehouseId,
            s.unitsRefilled
          );
          if (!deducted) {
            warnings.push(
              `Insufficient warehouse stock for "${s.toyName}" — refill of ${s.unitsRefilled} recorded but warehouse may go negative`
            );
          }
        }

        // Return removed units to warehouse (non-swap removals)
        if (s.unitsRemoved > 0 && s.toyId && !s.replaceAllToys) {
          await upsertInventory(db, s.toyId, sourceWarehouseId, s.unitsRemoved);
        }
      }
    }

    // ── Step 6: Financial Integrity Trail — inventory_adjustments (Feature 3) ──
    if (visitType === "inventory_audit") {
      const adjustments: Array<Record<string, unknown>> = [];
      for (const s of slots) {
        if (s.auditedCount !== null && s.toyId) {
          const jamAdj = s.jamStatus === "by_coin" ? 1 : 0;
          const expected =
            s.lastStock - (s.unitsSold + jamAdj) + s.unitsRefilled - s.unitsRemoved;
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

    // ── Step 7: Automatic Maintenance Loop (Feature 6) ──
    const tickets: Array<Record<string, unknown>> = [];

    for (const s of slots) {
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
    }

    // Observation-level issue
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
                  s.auditedCount !== null &&
                  s.auditedCount !==
                    s.lastStock -
                      (s.unitsSold + (s.jamStatus === "by_coin" ? 1 : 0)) +
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

// ── Helper: upsert inventory (add quantity) ──
async function upsertInventory(
  db: ReturnType<typeof createClient>,
  itemDetailId: string,
  warehouseId: string,
  quantity: number
) {
  // Try to find existing row
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
    // No inventory row — create one with negative quantity as a warning
    await db.from("inventory").insert({
      item_detail_id: itemDetailId,
      warehouse_id: warehouseId,
      quantity_on_hand: -quantity,
      last_updated: new Date().toISOString(),
    });
    return false;
  }
}
