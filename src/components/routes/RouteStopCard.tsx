import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ArrowLeftRight, Wrench, X, MapPin } from "lucide-react";
import { PlannedSwapDialog } from "./PlannedSwapDialog";
import type { RouteStop, SlotData, MaintenanceTicket, PlannedAction } from "@/hooks/useRoutes";
import { useIsMobile } from "@/hooks/use-mobile";

const bufferOptions = [
  { label: "0% (Normal)", value: "1" },
  { label: "10%", value: "1.1" },
  { label: "25%", value: "1.25" },
  { label: "50% (Holiday)", value: "1.5" },
];

interface Props {
  stop: RouteStop;
  slots: SlotData[];
  tickets: MaintenanceTicket[];
  onUpdateStop: (updates: { id: string; demand_multiplier?: number; planned_actions?: PlannedAction[] }) => void;
  onRemoveStop: (stopId: string) => void;
}

export function RouteStopCard({ stop, slots, tickets, onUpdateStop, onRemoveStop }: Props) {
  const [swapOpen, setSwapOpen] = useState(false);
  const isMobile = useIsMobile();
  const locationSlots = slots.filter((s) => s.location_id === stop.location_id);
  const locationTickets = tickets.filter((t) => t.location_id === stop.location_id);
  const plannedActions = (stop.planned_actions || []) as PlannedAction[];
  const multiplier = stop.demand_multiplier || 1;

  const handleAddSwap = (action: PlannedAction) => {
    const updated = [...plannedActions, action];
    onUpdateStop({ id: stop.id, planned_actions: updated });
  };

  const handleRemoveSwap = (slotId: string) => {
    const updated = plannedActions.filter((a) => a.slotId !== slotId);
    onUpdateStop({ id: stop.id, planned_actions: updated });
  };

  // For mobile driver view: compute per-slot summaries
  const slotSummaries = locationSlots.map((slot) => {
    const swap = plannedActions.find((a) => a.slotId === slot.id);
    if (swap) {
      return { type: "swap" as const, text: `${swap.spotName} Slot ${swap.slotNumber}: ${swap.oldProductName} → ${swap.newProductName} (${swap.capacity} units)` };
    }
    const needed = Math.ceil(((slot.capacity || 150) - (slot.current_stock || 0)) * multiplier);
    if (needed <= 0) return null;
    return { type: "refill" as const, text: `Refill: ${slot.product_name || "Unknown"} × ${needed}` };
  }).filter(Boolean);

  if (isMobile) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{stop.location?.name}</span>
          </div>
          {stop.location?.address && (
            <p className="text-xs text-muted-foreground">{stop.location.address}</p>
          )}
          <div className="space-y-1">
            {slotSummaries.map((s, i) => (
              <p key={i} className="text-sm text-foreground">• {s!.text}</p>
            ))}
            {slotSummaries.length === 0 && (
              <p className="text-sm text-muted-foreground">All slots full</p>
            )}
          </div>
          {locationTickets.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {locationTickets.map((t) => (
                <Badge key={t.id} variant="outline" className="text-orange-600 border-orange-300 text-xs">
                  <Wrench className="w-3 h-3 mr-1" />{t.issue_type}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">{stop.location?.name}</span>
            </div>
            {stop.location?.address && (
              <p className="text-xs text-muted-foreground ml-6">{stop.location.address}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(multiplier)}
              onValueChange={(v) => onUpdateStop({ id: stop.id, demand_multiplier: parseFloat(v) })}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bufferOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemoveStop(stop.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {locationSlots.length} slots across machines
        </div>

        {/* Planned swaps */}
        {plannedActions.length > 0 && (
          <div className="space-y-1">
            {plannedActions.map((a) => (
              <div key={a.slotId} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1 text-sm">
                <span className="flex items-center gap-1 text-foreground">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
                  {a.machineSerial} Slot {a.slotNumber}: {a.oldProductName} → {a.newProductName}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveSwap(a.slotId)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Maintenance alerts */}
        {locationTickets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {locationTickets.map((t) => (
              <Badge key={t.id} variant="outline" className="text-orange-600 border-orange-300 text-xs">
                <Wrench className="w-3 h-3 mr-1" />{t.issue_type} ({t.priority})
              </Badge>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => setSwapOpen(true)} disabled={locationSlots.length === 0}>
          <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />Plan Swap
        </Button>

        <PlannedSwapDialog
          open={swapOpen}
          onOpenChange={setSwapOpen}
          slots={locationSlots}
          locationName={stop.location?.name || "Unknown"}
          onConfirm={handleAddSwap}
        />
      </CardContent>
    </Card>
  );
}
