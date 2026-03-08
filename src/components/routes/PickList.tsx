import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Wrench } from "lucide-react";
import type { RouteStop, SlotData, MaintenanceTicket, PlannedAction } from "@/hooks/useRoutes";

interface Props {
  stops: RouteStop[];
  slots: SlotData[];
  tickets: MaintenanceTicket[];
  demandMap: Map<string, number>;
}

interface PickItem {
  productId: string;
  productName: string;
  refillQty: number;
  swapQty: number;
}

export function PickList({ stops, slots, tickets, demandMap }: Props) {
  const pickMap = new Map<string, PickItem>();

  for (const stop of stops) {
    const multiplier = stop.demand_multiplier || 1;
    const actions = (stop.planned_actions || []) as PlannedAction[];
    const locationSlots = slots.filter((s) => s.location_id === stop.location_id);

    for (const slot of locationSlots) {
      const swap = actions.find((a) => a.slotId === slot.id);

      if (swap) {
        // Add full capacity of new product
        const existing = pickMap.get(swap.newProductId) || {
          productId: swap.newProductId,
          productName: swap.newProductName,
          refillQty: 0,
          swapQty: 0,
        };
        existing.swapQty += swap.capacity;
        pickMap.set(swap.newProductId, existing);
      } else {
        // Normal refill
        if (!slot.current_product_id || !slot.product_name) continue;
        const needed = Math.ceil(((slot.capacity || 150) - (slot.current_stock || 0)) * multiplier);
        if (needed <= 0) continue;

        const existing = pickMap.get(slot.current_product_id) || {
          productId: slot.current_product_id,
          productName: slot.product_name,
          refillQty: 0,
          swapQty: 0,
        };
        existing.refillQty += needed;
        pickMap.set(slot.current_product_id, existing);
      }
    }
  }

  const items = Array.from(pickMap.values()).sort((a, b) =>
    (b.refillQty + b.swapQty) - (a.refillQty + a.swapQty)
  );

  const totalUnits = items.reduce((sum, i) => sum + i.refillQty + i.swapQty, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Loading Manifesto
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {items.length} products • {totalUnits} total units
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-6">No items to load. Add stops to the route first.</p>
          )}
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="font-medium text-foreground">{item.productName}</span>
              <div className="flex items-center gap-2">
                {item.refillQty > 0 && (
                  <Badge variant="secondary" className="text-xs">Refill: {item.refillQty}</Badge>
                )}
                {item.swapQty > 0 && (
                  <Badge className="text-xs">Swap: {item.swapQty}</Badge>
                )}
                <span className="font-semibold text-foreground min-w-[60px] text-right">
                  {item.refillQty + item.swapQty}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {tickets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="w-5 h-5 text-orange-500" />
              Maintenance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="font-medium text-foreground">{t.issue_type}</span>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">{t.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
