import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRouteDetail, computeSlotRefill } from "@/hooks/useRoutes";
import { useRoutes } from "@/hooks/useRoutes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RouteStopCard } from "@/components/routes/RouteStopCard";
import { PickList } from "@/components/routes/PickList";
import { ArrowLeft, Plus, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import type { PlannedAction, VelocityData } from "@/hooks/useRoutes";

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateRoute } = useRoutes();
  const { routeQuery, stopsQuery, slotsQuery, maintenanceQuery, velocityMapQuery, addStop, removeStop, updateStop } = useRouteDetail(id);
  const [addLocationId, setAddLocationId] = useState("");

  const route = routeQuery.data;
  const stops = stopsQuery.data || [];
  const slots = slotsQuery.data || [];
  const tickets = maintenanceQuery.data || [];
  const velocityMap = velocityMapQuery.data || new Map<string, VelocityData>();
  const stopLocationIds = stops.map((s) => s.location_id).filter(Boolean);

  // Fetch locations for adding stops
  const locationsQuery = useQuery({
    queryKey: ["all-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id, name, address").order("name");
      return data || [];
    },
  });

  // Fetch drivers
  const driversQuery = useQuery({
    queryKey: ["route-drivers"],
    queryFn: async () => {
      const { data } = await supabase.from("user_profiles").select("id, first_names, last_names").eq("active", true);
      return data || [];
    },
  });

  const availableLocations = (locationsQuery.data || []).filter((l) => !stopLocationIds.includes(l.id));

  const handleAddStop = () => {
    if (!addLocationId || !id) return;
    addStop.mutate({ route_id: id, location_id: addLocationId, sort_order: stops.length + 1 });
    setAddLocationId("");
  };

  const handleCopyRouteSummary = () => {
    if (!route) return;

    const driverName = route.driver
      ? `${route.driver.first_names || ""} ${route.driver.last_names || ""}`.trim()
      : "Unassigned";

    const lines: string[] = [
      `📋 ROUTE: ${route.name}`,
      `📅 ${format(new Date(route.scheduled_for), "EEEE, MMM d, yyyy")}`,
      `🚗 Driver: ${driverName}`,
      "",
      "--- STOPS ---",
    ];

    // Pick list aggregation
    const pickMap = new Map<string, { productName: string; refillQty: number; swapQty: number }>();

    for (const stop of stops) {
      const locationName = stop.location?.name || "Unknown Location";
      const multiplier = stop.demand_multiplier || 1;
      const actions = (stop.planned_actions || []) as PlannedAction[];
      const locationSlots = slots.filter((s) => s.location_id === stop.location_id);
      const locationTickets = tickets.filter((t) => t.location_id === stop.location_id);

      lines.push("");
      lines.push(`📍 ${locationName}`);

      // Group slots by spot_name
      const spotGroups = new Map<string, typeof locationSlots>();
      for (const slot of locationSlots) {
        const spotLabel = slot.spot_name || `Machine at ${locationName}`;
        const group = spotGroups.get(spotLabel) || [];
        group.push(slot);
        spotGroups.set(spotLabel, group);
      }

      for (const [spotLabel, spotSlots] of spotGroups) {
        for (const slot of spotSlots) {
          const swap = actions.find((a) => a.slotId === slot.id);

          if (swap) {
            lines.push(`  [${spotLabel}] ➔ SWAP: ${swap.oldProductName} TO ${swap.newProductName} (${swap.capacity} units)`);
            const existing = pickMap.get(swap.newProductId) || { productName: swap.newProductName, refillQty: 0, swapQty: 0 };
            existing.swapQty += swap.capacity;
            pickMap.set(swap.newProductId, existing);
          } else {
            if (!slot.current_product_id || !slot.product_name) continue;
            const needed = computeSlotRefill(slot, velocityMap, multiplier);
            if (needed <= 0) continue;
            lines.push(`  [${spotLabel}] ➔ REFILL: ${slot.product_name} (${needed} units)`);
            const existing = pickMap.get(slot.current_product_id) || { productName: slot.product_name, refillQty: 0, swapQty: 0 };
            existing.refillQty += needed;
            pickMap.set(slot.current_product_id, existing);
          }
        }
      }

      // Maintenance for this location
      for (const ticket of locationTickets) {
        const spotLabel = ticket.spot_id
          ? (slots.find((s) => s.spot_id === ticket.spot_id)?.spot_name || `Machine at ${locationName}`)
          : `Machine at ${locationName}`;
        lines.push(`  [${spotLabel}] ➔ REPAIR: ${ticket.issue_type}${ticket.description ? ` — ${ticket.description}` : ""}`);
      }
    }

    // Loading manifest
    const pickItems = Array.from(pickMap.values()).sort((a, b) => (b.refillQty + b.swapQty) - (a.refillQty + a.swapQty));
    const grandTotal = pickItems.reduce((sum, i) => sum + i.refillQty + i.swapQty, 0);

    lines.push("");
    lines.push("📦 LOADING MANIFEST:");
    for (const item of pickItems) {
      const total = item.refillQty + item.swapQty;
      const parts: string[] = [];
      if (item.refillQty > 0) parts.push(`Refill: ${item.refillQty}`);
      if (item.swapQty > 0) parts.push(`Swap: ${item.swapQty}`);
      lines.push(`• ${item.productName.toUpperCase()} — ${total} (${parts.join(", ")})`);
    }
    lines.push("");
    lines.push("———————————————");
    lines.push(`🔢 Total Units to Load: ${grandTotal}`);
    lines.push("———————————————");

    // Maintenance summary
    if (tickets.length > 0) {
      lines.push("");
      lines.push(`🔧 MAINTENANCE (${tickets.length}):`);
      for (const t of tickets) {
        const locName = stops.find((s) => s.location_id === t.location_id)?.location?.name || "Unknown";
        lines.push(`• ${t.issue_type} — ${locName} (${t.priority})`);
      }
    }

    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Dispatch summary copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  if (routeQuery.isLoading) {
    return <AppLayout><div className="p-6 text-muted-foreground">Loading...</div></AppLayout>;
  }

  if (!route) {
    return <AppLayout><div className="p-6 text-muted-foreground">Route not found</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/routes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{route.name}</h1>
              <Badge className={statusColors[route.status || "planned"]}>{route.status || "planned"}</Badge>
              <Button variant="outline" size="sm" onClick={handleCopyRouteSummary}>
                <Copy className="w-4 h-4 mr-1" /> Copy Summary
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(route.scheduled_for), "EEEE, MMM d, yyyy")}
              {route.driver && ` • ${route.driver.first_names} ${route.driver.last_names}`}
            </p>
          </div>
        </div>

        {/* Edit controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Route Name</Label>
            <Input
              defaultValue={route.name}
              onBlur={(e) => {
                if (e.target.value !== route.name) updateRoute.mutate({ id: route.id, name: e.target.value });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              defaultValue={route.scheduled_for}
              onChange={(e) => updateRoute.mutate({ id: route.id, scheduled_for: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Driver</Label>
            <Select
              value={route.driver_id || ""}
              onValueChange={(v) => updateRoute.mutate({ id: route.id, driver_id: v || null })}
            >
              <SelectTrigger><SelectValue placeholder="Assign driver" /></SelectTrigger>
              <SelectContent>
                {(driversQuery.data || []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.first_names} {d.last_names}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="stops">
          <TabsList>
            <TabsTrigger value="stops">Stops ({stops.length})</TabsTrigger>
            <TabsTrigger value="picklist">Pick List</TabsTrigger>
          </TabsList>

          <TabsContent value="stops" className="space-y-3 mt-4">
            {stops.map((stop) => (
              <RouteStopCard
                key={stop.id}
                stop={stop}
                slots={slots}
                velocityMap={velocityMap}
                tickets={tickets}
                onUpdateStop={(u) => updateStop.mutate(u)}
                onRemoveStop={(sid) => removeStop.mutate(sid)}
              />
            ))}

            {/* Add stop */}
            <div className="flex gap-2">
              <Select value={addLocationId} onValueChange={setAddLocationId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add a location..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddStop} disabled={!addLocationId || addStop.isPending}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="picklist" className="mt-4">
            <PickList stops={stops} slots={slots} tickets={tickets} velocityMap={velocityMap} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
