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
        .select("id, location_id")
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
        .select("id, issue_type, description, priority, status, location_id, machine_id, created_at")
        .in("location_id", locationIds)
        .neq("status", "completed");
      if (error) throw error;
      return (data || []) as MaintenanceTicket[];
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
    addStop,
    removeStop,
    updateStop,
  };
}
