import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { computeSlotRefill } from "@/hooks/useRoutes";
import type { RouteStop, SlotData, VelocityData, Route } from "@/hooks/useRoutes";

interface ReconciliationTabProps {
  route: Route;
  stops: RouteStop[];
  slots: SlotData[];
  velocityMap: Map<string, VelocityData>;
}

interface ReconciliationRow {
  slotId: string;
  slotNumber: number;
  productName: string;
  spotName: string;
  locationName: string;
  suggested: number;
  actual: number;
  variance: number;
  variancePct: number;
  visitNotes: string | null;
  isWarning: boolean; // under-fill > 30% with no notes
}

export function ReconciliationTab({ route, stops, slots, velocityMap }: ReconciliationTabProps) {
  const routeId = route.id;

  // Fetch visits linked to this route (direct or fallback by date proximity)
  const visitsQuery = useQuery({
    queryKey: ["route-reconciliation-visits", routeId],
    queryFn: async () => {
      // Try direct route_id link first
      const { data: directVisits } = await (supabase
        .from("spot_visits")
        .select("id, spot_id, visit_date, notes, route_id") as any)
        .eq("route_id", routeId);

      if (directVisits && directVisits.length > 0) {
        return directVisits;
      }

      // Fallback: match by spots in route locations + date proximity
      const locationIds = stops.map(s => s.location_id).filter(Boolean) as string[];
      if (locationIds.length === 0) return [];

      const { data: routeSpots } = await supabase
        .from("spots")
        .select("id")
        .in("location_id", locationIds);
      if (!routeSpots?.length) return [];

      const spotIds = routeSpots.map(s => s.id);
      const scheduledDate = new Date(route.scheduled_for);
      const dayBefore = new Date(scheduledDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(scheduledDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const { data: fallbackVisits } = await supabase
        .from("spot_visits")
        .select("id, spot_id, visit_date, notes")
        .in("spot_id", spotIds)
        .gte("visit_date", dayBefore.toISOString())
        .lte("visit_date", dayAfter.toISOString());

      return fallbackVisits || [];
    },
  });

  // Fetch line items for matched visits
  const visitIds = (visitsQuery.data || []).map(v => v.id);
  const lineItemsQuery = useQuery({
    queryKey: ["route-reconciliation-lines", visitIds],
    enabled: visitIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("visit_line_items")
        .select("slot_id, quantity_added, spot_visit_id, product_id, action_type")
        .in("spot_visit_id", visitIds)
        .in("action_type", ["restock", "swap_in", "collection"]);
      return data || [];
    },
  });

  // Build reconciliation rows
  const visits = visitsQuery.data || [];
  const lineItems = lineItemsQuery.data || [];

  // Visit notes map: spot_id -> notes
  const visitNotesMap = new Map<string, string | null>();
  for (const v of visits) {
    if (v.spot_id) visitNotesMap.set(v.spot_id, v.notes);
  }

  // Actual refill per slot
  const actualBySlot = new Map<string, number>();
  for (const li of lineItems) {
    if (!li.slot_id || !li.quantity_added) continue;
    actualBySlot.set(li.slot_id, (actualBySlot.get(li.slot_id) || 0) + li.quantity_added);
  }

  // Build rows
  const rows: ReconciliationRow[] = [];
  for (const stop of stops) {
    const multiplier = stop.demand_multiplier || 1;
    const locationSlots = slots.filter(s => s.location_id === stop.location_id);
    const locationName = stop.location?.name || "Unknown";

    for (const slot of locationSlots) {
      if (!slot.current_product_id || !slot.product_name) continue;

      const suggested = computeSlotRefill(slot, velocityMap, multiplier);
      if (suggested <= 0 && !actualBySlot.has(slot.id)) continue;

      const actual = actualBySlot.get(slot.id) || 0;
      const variance = actual - suggested;
      const variancePct = suggested > 0 ? (variance / suggested) : 0;
      const notes = visitNotesMap.get(slot.spot_id) || null;
      const isUnderFill = suggested > 0 && actual < suggested * 0.70;
      const hasNoNotes = !notes || notes.trim() === "";

      rows.push({
        slotId: slot.id,
        slotNumber: slot.slot_number,
        productName: slot.product_name,
        spotName: slot.spot_name,
        locationName,
        suggested,
        actual,
        variance,
        variancePct,
        visitNotes: notes,
        isWarning: isUnderFill && hasNoNotes,
      });
    }
  }

  // Accuracy score
  const accurateCount = rows.filter(r => r.suggested > 0 && Math.abs(r.variance) / r.suggested < 0.10).length;
  const totalItems = rows.filter(r => r.suggested > 0).length;
  const accuracy = totalItems > 0 ? Math.round((accurateCount / totalItems) * 100) : 0;

  // Group by location
  const locationGroups = new Map<string, ReconciliationRow[]>();
  for (const row of rows) {
    const key = row.locationName;
    if (!locationGroups.has(key)) locationGroups.set(key, []);
    locationGroups.get(key)!.push(row);
  }

  const isLoading = visitsQuery.isLoading || lineItemsQuery.isLoading;

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Loading reconciliation data...</div>;
  }

  if (visits.length === 0) {
    return (
      <Card className="p-8 text-center bg-card border-border">
        <p className="text-muted-foreground">No visit reports found for this route yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Visits will appear here once operators submit reports tagged to this route.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Accuracy Score & Status Badges */}
      <Card className="p-4 bg-card border-border">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Suggested Accuracy</p>
            <p className="text-3xl font-bold text-foreground">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">{accurateCount}/{totalItems} items within 10%</p>
          </div>

          <div className="flex flex-wrap gap-2 ml-auto">
            <Badge className={
              route.status === "completed"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : route.status === "in_progress"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            }>
              {route.status || "planned"}
            </Badge>

            {route.completed_at && (
              <Badge variant="outline">
                Completed {format(new Date(route.completed_at), "MMM d, h:mm a")}
              </Badge>
            )}

            {route.auto_completed && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="w-3 h-3 mr-1" />
                System Verified
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Reconciliation Tables by Location */}
      <TooltipProvider>
        {Array.from(locationGroups.entries()).map(([locationName, locationRows]) => {
          // Get notes for this location's spots
          const spotNotes = new Map<string, string | null>();
          for (const row of locationRows) {
            if (row.visitNotes && !spotNotes.has(row.spotName)) {
              spotNotes.set(row.spotName, row.visitNotes);
            }
          }

          return (
            <Card key={locationName} className="bg-card border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-foreground">📍 {locationName}</h3>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item / Slot</TableHead>
                    <TableHead className="text-right">Suggested</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationRows.map((row) => {
                    const isHighVariance = row.suggested > 0 && Math.abs(row.variancePct) > 0.20;

                    return (
                      <TableRow
                        key={row.slotId}
                        className={row.isWarning ? "bg-amber-50 dark:bg-amber-950/30" : ""}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {row.isWarning && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Significant under-fill with no explanation</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <div>
                              <span className="font-medium text-foreground">{row.productName}</span>
                              <span className="text-muted-foreground text-xs ml-1">#{row.slotNumber}</span>
                              <p className="text-xs text-muted-foreground">{row.spotName}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-foreground">{row.suggested}</TableCell>
                        <TableCell className="text-right font-mono text-foreground">{row.actual}</TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${
                          isHighVariance ? "text-destructive" : "text-foreground"
                        }`}>
                          {row.variance > 0 ? "+" : ""}{row.variance}
                          {row.suggested > 0 && (
                            <span className="text-xs ml-1">
                              ({row.variance > 0 ? "+" : ""}{Math.round(row.variancePct * 100)}%)
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Operator Notes for this location */}
              {Array.from(spotNotes.entries()).map(([spotName, notes]) => (
                notes && (
                  <div key={spotName} className="px-4 py-2 border-t border-border bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Notes ({spotName}):</span> {notes}
                    </p>
                  </div>
                )
              ))}
            </Card>
          );
        })}
      </TooltipProvider>

      {rows.length === 0 && (
        <Card className="p-6 text-center bg-card border-border">
          <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">No refill data to reconcile for this route.</p>
        </Card>
      )}
    </div>
  );
}
