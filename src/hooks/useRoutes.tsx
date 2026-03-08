import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Manual interfaces since types.ts may not include routes/route_stops yet
export interface Route {
  id: string;
  name: string;
  scheduled_for: string;
  driver_id: string | null;
  status: string | null;
  created_at: string | null;
  driver?: { first_names: string | null; last_names: string | null } | null;
}

export interface PlannedAction {
  type: "swap";
  slotId: string;
  spotId: string;
  spotName: string;
  machineSerial: string;
  slotNumber: number;
  oldProductId: string;
  oldProductName: string;
  newProductId: string;
  newProductName: string;
  capacity: number;
}

export interface RouteStop {
  id: string;
  route_id: string | null;
  location_id: string | null;
  sort_order: number | null;
  demand_multiplier: number | null;
  planned_actions: PlannedAction[] | null;
  arrival_status: string | null;
  created_at: string | null;
  location?: { id: string; name: string; address: string | null } | null;
}

export interface SlotData {
  id: string;
  slot_number: number;
  capacity: number | null;
  current_stock: number | null;
  current_product_id: string | null;
  coin_acceptor: number | null;
  machine_id: string | null;
  machine_serial: string;
  location_id: string;
  product_name: string | null;
  spot_id: string;
  spot_name: string;
}

export interface MaintenanceTicket {
  id: string;
  issue_type: string;
  description: string | null;
  priority: string;
  status: string;
  location_id: string;
  machine_id: string | null;
  spot_id: string | null;
  created_at: string;
}

export interface VelocityData {
  dailyVelocity: number;
  daysSinceLastVisit: number;
}

/**
 * Compute how many units to refill for a single slot using the velocity model.
 * - If velocity data exists: baseRefill = dailyVelocity × daysSinceLastVisit
 * - Fallback (no history): top-off empty space = capacity - current_stock
 * - Swapped slots should NOT call this function; they use full capacity of new product.
 */
export function computeSlotRefill(
  slot: SlotData,
  velocityMap: Map<string, VelocityData>,
  multiplier: number
): number {
  const v = velocityMap.get(slot.id);
  if (v && v.dailyVelocity > 0) {
    const baseRefill = v.dailyVelocity * v.daysSinceLastVisit;
    return Math.ceil(baseRefill * multiplier);
  }
  // Fallback: top-off empty space
  const emptySpace = Math.max(0, (slot.capacity || 150) - (slot.current_stock || 0));
  return Math.ceil(emptySpace * multiplier);
}

export function useRoutes() {
  const queryClient = useQueryClient();

  const routesQuery = useQuery({
    queryKey: ["routes"],
    queryFn: async (): Promise<Route[]> => {
      const { data, error } = await supabase
        .from("routes")
        .select("*, driver:user_profiles!routes_driver_id_fkey(first_names, last_names)")
        .order("scheduled_for", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Route[];
    },
  });

  const createRoute = useMutation({
    mutationFn: async (route: { name: string; scheduled_for: string; driver_id?: string | null }) => {
      const { data, error } = await supabase.from("routes").insert(route).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast.success("Route created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRoute = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; scheduled_for?: string; driver_id?: string | null; status?: string }) => {
      const { error } = await supabase.from("routes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      queryClient.invalidateQueries({ queryKey: ["route-detail"] });
      toast.success("Route updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: string) => {
      const { error: stopsErr } = await supabase.from("route_stops").delete().eq("route_id", id);
      if (stopsErr) throw stopsErr;
      const { error } = await supabase.from("routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      toast.success("Route deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { routesQuery, createRoute, updateRoute, deleteRoute };
}

export function useRouteDetail(routeId: string | undefined) {
  const queryClient = useQueryClient();

  const routeQuery = useQuery({
    queryKey: ["route-detail", routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*, driver:user_profiles!routes_driver_id_fkey(first_names, last_names)")
        .eq("id", routeId!)
        .single();
      if (error) throw error;
      return data as unknown as Route;
    },
  });

  const stopsQuery = useQuery({
    queryKey: ["route-stops", routeId],
    enabled: !!routeId,
    queryFn: async (): Promise<RouteStop[]> => {
      const { data, error } = await supabase
        .from("route_stops")
        .select("*, location:locations(id, name, address)")
        .eq("route_id", routeId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RouteStop[];
    },
  });

  const locationIds = (stopsQuery.data || [])
    .map((s) => s.location?.id)
    .filter(Boolean) as string[];

  // Fetch all slots for machines at these locations (via spots -> setups -> machines -> slots)
  const slotsQuery = useQuery({
    queryKey: ["route-slots", locationIds],
    enabled: locationIds.length > 0,
    queryFn: async (): Promise<SlotData[]> => {
      // Get spots for locations
      const { data: spots } = await supabase
        .from("spots")
        .select("id, name, location_id")
        .in("location_id", locationIds);
      if (!spots?.length) return [];

      const spotIds = spots.map((s) => s.id);

      // Get setups for spots
      const { data: setups } = await supabase
        .from("setups")
        .select("id, spot_id")
        .in("spot_id", spotIds);
      if (!setups?.length) return [];

      const setupIds = setups.map((s) => s.id);

      // Get machines for setups
      const { data: machines } = await supabase
        .from("machines")
        .select("id, serial_number, setup_id")
        .in("setup_id", setupIds);
      if (!machines?.length) return [];

      const machineIds = machines.map((m) => m.id);

      // Get slots for machines
      const { data: slots } = await supabase
        .from("machine_slots")
        .select("id, slot_number, capacity, current_stock, current_product_id, coin_acceptor, machine_id")
        .in("machine_id", machineIds);
      if (!slots?.length) return [];

      // Get product names
      const productIds = [...new Set(slots.map((s) => s.current_product_id).filter(Boolean))] as string[];
      let productMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("item_details")
          .select("id, name")
          .in("id", productIds);
        productMap = Object.fromEntries((products || []).map((p) => [p.id, p.name]));
      }

      // Build lookup: machine -> setup -> spot -> location
      const setupSpotMap = Object.fromEntries(setups.map((s) => [s.id, s.spot_id]));
      const spotLocationMap = Object.fromEntries(spots.map((s) => [s.id, s.location_id]));
      const spotNameMap = Object.fromEntries(spots.map((s) => [s.id, s.name]));
      const machineMap = Object.fromEntries(machines.map((m) => [m.id, m]));

      return slots.map((slot) => {
        const machine = machineMap[slot.machine_id!];
        const spotId = machine ? setupSpotMap[machine.setup_id!] : null;
        const locationId = spotId ? spotLocationMap[spotId] : null;
        return {
          id: slot.id,
          slot_number: slot.slot_number,
          capacity: slot.capacity,
          current_stock: slot.current_stock,
          current_product_id: slot.current_product_id,
          coin_acceptor: slot.coin_acceptor,
          machine_id: slot.machine_id,
          machine_serial: machine?.serial_number || "Unknown",
          location_id: locationId || "",
          product_name: slot.current_product_id ? productMap[slot.current_product_id] || null : null,
          spot_id: spotId || "",
          spot_name: spotId ? (spotNameMap[spotId] || "") : "",
        };
      });
    },
  });

  const maintenanceQuery = useQuery({
    queryKey: ["route-maintenance", locationIds],
    enabled: locationIds.length > 0,
    queryFn: async (): Promise<MaintenanceTicket[]> => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("id, issue_type, description, priority, status, location_id, machine_id, spot_id, created_at")
        .in("location_id", locationIds)
        .neq("status", "completed");
      if (error) throw error;
      return (data || []) as MaintenanceTicket[];
    },
  });

  // Sales velocity model: compute daily velocity and days-since-last-visit per slot
  const slotSpotIds = [...new Set((slotsQuery.data || []).map((s) => s.spot_id).filter(Boolean))];
  const velocityMapQuery = useQuery({
    queryKey: ["route-velocity-map", slotSpotIds],
    enabled: slotSpotIds.length > 0,
    queryFn: async (): Promise<Map<string, VelocityData>> => {
      const now = new Date();

      // Fetch all visits for these spots, ordered by date desc
      const { data: allVisits } = await supabase
        .from("spot_visits")
        .select("id, spot_id, visit_date, days_since_last_visit")
        .in("spot_id", slotSpotIds)
        .order("visit_date", { ascending: false });
      if (!allVisits?.length) return new Map();

      // Keep only last 2 visits per spot
      const visitCountBySpot = new Map<string, number>();
      const recentVisits: typeof allVisits = [];
      for (const v of allVisits) {
        const count = visitCountBySpot.get(v.spot_id!) || 0;
        if (count < 2) {
          recentVisits.push(v);
          visitCountBySpot.set(v.spot_id!, count + 1);
        }
      }
      if (!recentVisits.length) return new Map();

      const visitIds = recentVisits.map((v) => v.id);

      // Fetch line items for those visits
      const { data: lineItems } = await supabase
        .from("visit_line_items")
        .select("slot_id, quantity_added, spot_visit_id")
        .in("spot_visit_id", visitIds)
        .in("action_type", ["restock", "swap_in"]);
      if (!lineItems?.length) return new Map();

      // Build visit->spot and visit->date lookups
      const visitSpotMap = new Map<string, string>();
      const visitDateMap = new Map<string, Date>();
      const visitDaysSinceMap = new Map<string, number | null>();
      for (const v of recentVisits) {
        visitSpotMap.set(v.id, v.spot_id!);
        visitDateMap.set(v.id, new Date(v.visit_date!));
        visitDaysSinceMap.set(v.id, v.days_since_last_visit);
      }

      // Per spot: find newest visit date and compute daysBetweenVisits
      const spotVisitDates = new Map<string, Date[]>();
      for (const v of recentVisits) {
        const dates = spotVisitDates.get(v.spot_id!) || [];
        dates.push(new Date(v.visit_date!));
        spotVisitDates.set(v.spot_id!, dates);
      }

      // Per spot: daysBetweenVisits (span of the 2 visits), daysSinceLastVisit (today - newest)
      const spotTimingMap = new Map<string, { daysBetween: number; daysSinceLast: number; visitCount: number; singleVisitDaysSince: number | null }>();
      for (const [spotId, dates] of spotVisitDates) {
        dates.sort((a, b) => b.getTime() - a.getTime()); // newest first
        const newestDate = dates[0];
        const daysSinceLast = Math.max(1, Math.round((now.getTime() - newestDate.getTime()) / (1000 * 60 * 60 * 24)));

        if (dates.length >= 2) {
          const oldestDate = dates[dates.length - 1];
          const daysBetween = Math.max(1, Math.round((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
          spotTimingMap.set(spotId, { daysBetween, daysSinceLast, visitCount: dates.length, singleVisitDaysSince: null });
        } else {
          // Single visit: use days_since_last_visit from the visit record as the period
          const visitId = recentVisits.find((v) => v.spot_id === spotId)!.id;
          const daysFromRecord = visitDaysSinceMap.get(visitId);
          spotTimingMap.set(spotId, { daysBetween: 0, daysSinceLast: daysSinceLast, visitCount: 1, singleVisitDaysSince: daysFromRecord ?? null });
        }
      }

      // Aggregate quantity_added per slot, tracking which spot each slot belongs to
      const slotTotals = new Map<string, number>();
      const slotSpotLookup = new Map<string, string>();
      for (const li of lineItems) {
        if (!li.slot_id || !li.quantity_added || li.quantity_added <= 0) continue;
        const spotId = visitSpotMap.get(li.spot_visit_id!);
        if (!spotId) continue;
        slotTotals.set(li.slot_id, (slotTotals.get(li.slot_id) || 0) + li.quantity_added);
        slotSpotLookup.set(li.slot_id, spotId);
      }

      // Build velocity map per slot
      const velocityMap = new Map<string, VelocityData>();
      for (const [slotId, totalAdded] of slotTotals) {
        const spotId = slotSpotLookup.get(slotId)!;
        const timing = spotTimingMap.get(spotId);
        if (!timing) continue;

        let dailyVelocity: number;
        if (timing.visitCount >= 2) {
          // 2 visits: velocity = totalAdded / daysBetweenVisits
          dailyVelocity = totalAdded / timing.daysBetween;
        } else {
          // Single visit: velocity = totalAdded / days_since_last_visit from that visit (or default 14)
          const period = timing.singleVisitDaysSince && timing.singleVisitDaysSince > 0 ? timing.singleVisitDaysSince : 14;
          dailyVelocity = totalAdded / period;
        }

        velocityMap.set(slotId, {
          dailyVelocity,
          daysSinceLastVisit: timing.daysSinceLast,
        });
      }

      return velocityMap;
    },
  });

  const addStop = useMutation({
    mutationFn: async ({ route_id, location_id, sort_order }: { route_id: string; location_id: string; sort_order: number }) => {
      const { error } = await supabase.from("route_stops").insert({
        route_id,
        location_id,
        sort_order,
        demand_multiplier: 1.0,
        planned_actions: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-stops", routeId] });
      queryClient.invalidateQueries({ queryKey: ["route-slots"] });
      queryClient.invalidateQueries({ queryKey: ["route-maintenance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStop = useMutation({
    mutationFn: async (stopId: string) => {
      const { error } = await supabase.from("route_stops").delete().eq("id", stopId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-stops", routeId] });
      queryClient.invalidateQueries({ queryKey: ["route-slots"] });
      queryClient.invalidateQueries({ queryKey: ["route-maintenance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStop = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; demand_multiplier?: number; planned_actions?: PlannedAction[] }) => {
      const payload: Record<string, unknown> = {};
      if (updates.demand_multiplier !== undefined) payload.demand_multiplier = updates.demand_multiplier;
      if (updates.planned_actions !== undefined) payload.planned_actions = JSON.parse(JSON.stringify(updates.planned_actions));
      const { error } = await supabase.from("route_stops").update(payload as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-stops", routeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    routeQuery,
    stopsQuery,
    slotsQuery,
    maintenanceQuery,
    velocityMapQuery,
    addStop,
    removeStop,
    updateStop,
  };
}
