import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Wrench } from "lucide-react";
import type { RouteStop, SlotData, MaintenanceTicket, PlannedAction, VelocityData } from "@/hooks/useRoutes";
import { computeSlotRefill } from "@/hooks/useRoutes";

interface Props {
  stops: RouteStop[];
  slots: SlotData[];
  tickets: MaintenanceTicket[];
  velocityMap: Map<string, VelocityData>;
  onOverridesChange?: (overrides: Map<string, number>) => void;
}

interface PickItem {
  productId: string;
  productName: string;
  refillQty: number;
  swapQty: number;
}

export function PickList({ stops, slots, tickets, velocityMap, onOverridesChange }: Props) {
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());

  const pickMap = new Map<string, PickItem>();

  for (const stop of stops) {
    const multiplier = stop.demand_multiplier || 1;
    const actions = (stop.planned_actions || []) as PlannedAction[];
    const locationSlots = slots.filter((s) => s.location_id === stop.location_id);

    for (const slot of locationSlots) {
      const swap = actions.find((a) => a.slotId === slot.id);

      if (swap) {
        const existing = pickMap.get(swap.newProductId) || {
          productId: swap.newProductId,
          productName: swap.newProductName,
          refillQty: 0,
          swapQty: 0,
        };
        existing.swapQty += swap.capacity;
        pickMap.set(swap.newProductId, existing);
      } else {
        if (!slot.current_product_id || !slot.product_name) continue;
        const needed = computeSlotRefill(slot, velocityMap, multiplier);
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

  const getTotal = (item: PickItem) => {
    const calculated = item.refillQty + item.swapQty;
    return overrides.has(item.productId) ? overrides.get(item.productId)! : calculated;
  };

  const totalUnits = items.reduce((sum, i) => sum + getTotal(i), 0);

  const handleOverride = (productId: string, value: string) => {
    const num = parseInt(value, 10);
    const next = new Map(overrides);
    if (isNaN(num) || num < 0) {
      next.delete(productId);
    } else {
      next.set(productId, num);
    }
    setOverrides(next);
    onOverridesChange?.(next);
  };

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
          {items.map((item) => {
            const calculated = item.refillQty + item.swapQty;
            const isOverridden = overrides.has(item.productId);
            return (
              <div key={item.productId} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{item.productName}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.refillQty > 0 && (
                      <Badge variant="secondary" className="text-xs">Refill: {item.refillQty}</Badge>
                    )}
                    {item.swapQty > 0 && (
                      <Badge className="text-xs">Swap: {item.swapQty}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">Suggested: {calculated}</span>
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  className="w-20 text-right"
                  value={isOverridden ? overrides.get(item.productId) : calculated}
                  onChange={(e) => handleOverride(item.productId, e.target.value)}
                />
              </div>
            );
          })}
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
