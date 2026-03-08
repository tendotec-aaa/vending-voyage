import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRouteDetail } from "@/hooks/useRoutes";
import { useRoutes } from "@/hooks/useRoutes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RouteStopCard } from "@/components/routes/RouteStopCard";
import { PickList } from "@/components/routes/PickList";
import { ArrowLeft, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateRoute } = useRoutes();
  const { routeQuery, stopsQuery, slotsQuery, maintenanceQuery, addStop, removeStop, updateStop } = useRouteDetail(id);
  const [addLocationId, setAddLocationId] = useState("");

  const route = routeQuery.data;
  const stops = stopsQuery.data || [];
  const slots = slotsQuery.data || [];
  const tickets = maintenanceQuery.data || [];
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
            <PickList stops={stops} slots={slots} tickets={tickets} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
