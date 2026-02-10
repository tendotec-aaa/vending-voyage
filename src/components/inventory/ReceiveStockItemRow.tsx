import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { WarehouseAllocation } from "@/hooks/useReceiveStock";

interface Warehouse {
  id: string;
  name: string;
  is_system?: boolean;
}

interface ReceiveStockItemRowProps {
  itemName: string;
  sku: string;
  quantityOrdered: number;
  quantityAlreadyReceived: number;
  quantityRemaining: number;
  quantityReceived: number;
  onQuantityReceivedChange: (qty: number) => void;
  allocations: WarehouseAllocation[];
  onAllocationsChange: (allocations: WarehouseAllocation[]) => void;
  warehouses: Warehouse[];
}

export function ReceiveStockItemRow({
  itemName,
  sku,
  quantityOrdered,
  quantityAlreadyReceived,
  quantityRemaining,
  quantityReceived,
  onQuantityReceivedChange,
  allocations,
  onAllocationsChange,
  warehouses,
}: ReceiveStockItemRowProps) {
  const userWarehouses = warehouses.filter((w) => !w.is_system);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
  const allocationDiff = quantityReceived - totalAllocated;
  const hasDiscrepancy = quantityReceived !== quantityRemaining;

  const addAllocation = () => {
    const firstAvailable = userWarehouses.find(
      (w) => !allocations.some((a) => a.warehouseId === w.id)
    );
    if (firstAvailable) {
      onAllocationsChange([
        ...allocations,
        { warehouseId: firstAvailable.id, quantity: Math.max(0, quantityReceived - totalAllocated) },
      ]);
    }
  };

  const removeAllocation = (index: number) => {
    onAllocationsChange(allocations.filter((_, i) => i !== index));
  };

  const updateAllocationWarehouse = (index: number, warehouseId: string) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], warehouseId };
    onAllocationsChange(updated);
  };

  const updateAllocationQuantity = (index: number, quantity: number) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], quantity: quantity || 0 };
    onAllocationsChange(updated);
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {/* Item info */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-medium text-foreground">{itemName}</h4>
          <p className="text-sm text-muted-foreground font-mono">{sku}</p>
        </div>
        <div className="text-right text-sm space-y-1">
          <p className="text-muted-foreground">Ordered: <span className="text-foreground font-medium">{quantityOrdered.toLocaleString()}</span></p>
          {quantityAlreadyReceived > 0 && (
            <p className="text-muted-foreground">Already received: <span className="text-foreground font-medium">{quantityAlreadyReceived.toLocaleString()}</span></p>
          )}
          <p className="text-muted-foreground">Expected: <span className="text-foreground font-semibold">{quantityRemaining.toLocaleString()}</span></p>
        </div>
      </div>

      {/* Quantity received input */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">Qty Received:</label>
        <Input
          type="number"
          min={0}
          max={quantityRemaining}
          value={quantityReceived}
          onChange={(e) => onQuantityReceivedChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-32"
        />
        {hasDiscrepancy && (
          <Badge variant="destructive" className="text-xs">
            {quantityReceived < quantityRemaining
              ? `${quantityRemaining - quantityReceived} missing`
              : `${quantityReceived - quantityRemaining} over`}
          </Badge>
        )}
      </div>

      {/* Warehouse allocations */}
      {quantityReceived > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Warehouse Allocation</p>
            {allocationDiff !== 0 && (
              <Badge variant={allocationDiff > 0 ? "secondary" : "destructive"} className="text-xs">
                {allocationDiff > 0 ? `${allocationDiff.toLocaleString()} unallocated` : `${Math.abs(allocationDiff).toLocaleString()} over-allocated`}
              </Badge>
            )}
          </div>
          {allocations.map((alloc, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select
                value={alloc.warehouseId}
                onValueChange={(v) => updateAllocationWarehouse(idx, v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {userWarehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={alloc.quantity}
                onChange={(e) => updateAllocationQuantity(idx, parseInt(e.target.value) || 0)}
                className="w-28"
              />
              {allocations.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeAllocation(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {userWarehouses.length > allocations.length && (
            <Button type="button" variant="outline" size="sm" onClick={addAllocation} className="gap-1">
              <Plus className="w-3 h-3" />
              Split to another warehouse
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
