import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, ChevronLeft, Loader2 } from "lucide-react";
import { useReceiveStock, type ReceivedItemData, type WarehouseAllocation } from "@/hooks/useReceiveStock";
import { usePurchases } from "@/hooks/usePurchases";
import { ReceiveStockItemRow } from "./ReceiveStockItemRow";
import { DiscrepancyConfirmDialog } from "./DiscrepancyConfirmDialog";

type Step = "select-po" | "verify-items";

interface WarehouseExt {
  id: string;
  name: string;
  is_system?: boolean;
}

export function ReceiveStockDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("select-po");
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);

  const { unreceivedPurchases, isLoadingUnreceived, receiveStock, isReceiving } = useReceiveStock();
  const { warehouses: rawWarehouses } = usePurchases();

  // Cast warehouses to include is_system
  const warehouses: WarehouseExt[] = (rawWarehouses as any[]) || [];

  const selectedPO = unreceivedPurchases.find((p) => p.id === selectedPOId);

  // State for each item's received qty and allocations
  const [itemsState, setItemsState] = useState<
    Record<string, { quantityReceived: number; allocations: WarehouseAllocation[] }>
  >({});

  const initializeItems = (poId: string) => {
    const po = unreceivedPurchases.find((p) => p.id === poId);
    if (!po) return;

    const state: Record<string, { quantityReceived: number; allocations: WarehouseAllocation[] }> = {};
    const firstUserWarehouse = warehouses.find((w) => !w.is_system);

    for (const item of po.purchase_items) {
      const remaining = item.quantity_remaining ?? item.quantity_ordered;
      state[item.id] = {
        quantityReceived: remaining,
        allocations: firstUserWarehouse
          ? [{ warehouseId: firstUserWarehouse.id, quantity: remaining }]
          : [],
      };
    }
    setItemsState(state);
  };

  const selectPO = (poId: string) => {
    setSelectedPOId(poId);
    initializeItems(poId);
    setStep("verify-items");
  };

  const updateItemQty = (itemId: string, qty: number) => {
    setItemsState((prev) => {
      const item = prev[itemId];
      if (!item) return prev;
      // Re-distribute allocations proportionally to first warehouse
      const allocations = item.allocations.length > 0
        ? [{ ...item.allocations[0], quantity: qty }, ...item.allocations.slice(1)]
        : item.allocations;
      return { ...prev, [itemId]: { quantityReceived: qty, allocations } };
    });
  };

  const updateItemAllocations = (itemId: string, allocations: WarehouseAllocation[]) => {
    setItemsState((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], allocations },
    }));
  };

  // Validation
  const validationErrors = useMemo(() => {
    if (!selectedPO) return [];
    const errors: string[] = [];

    for (const item of selectedPO.purchase_items) {
      const state = itemsState[item.id];
      if (!state) continue;

      const totalAllocated = state.allocations.reduce((s, a) => s + a.quantity, 0);
      if (state.quantityReceived > 0 && totalAllocated !== state.quantityReceived) {
        errors.push(`${item.item_detail?.name || "Item"}: allocated (${totalAllocated}) ≠ received (${state.quantityReceived})`);
      }
    }

    return errors;
  }, [selectedPO, itemsState]);

  // Discrepancy items
  const discrepancyItems = useMemo(() => {
    if (!selectedPO) return [];
    return selectedPO.purchase_items
      .filter((item) => {
        const state = itemsState[item.id];
        if (!state) return false;
        const remaining = item.quantity_remaining ?? item.quantity_ordered;
        return state.quantityReceived < remaining;
      })
      .map((item) => {
        const state = itemsState[item.id]!;
        const remaining = item.quantity_remaining ?? item.quantity_ordered;
        return {
          itemName: item.item_detail?.name || "Unknown Item",
          expected: remaining,
          received: state.quantityReceived,
          missing: remaining - state.quantityReceived,
        };
      });
  }, [selectedPO, itemsState]);

  const handleReceive = async (discrepancyNote?: string) => {
    if (!selectedPO) return;

    const items: ReceivedItemData[] = selectedPO.purchase_items.map((item) => {
      const state = itemsState[item.id];
      const remaining = item.quantity_remaining ?? item.quantity_ordered;
      return {
        purchaseItemId: item.id,
        itemDetailId: item.item_detail_id,
        itemName: item.item_detail?.name || "Unknown",
        quantityExpected: remaining,
        quantityReceived: state?.quantityReceived ?? remaining,
        allocations: state?.allocations ?? [],
      };
    });

    await receiveStock({
      purchaseId: selectedPO.id,
      items,
      discrepancyNote,
    });

    setDiscrepancyOpen(false);
    setOpen(false);
    resetState();
  };

  const handleSubmit = () => {
    if (discrepancyItems.length > 0) {
      setDiscrepancyOpen(true);
    } else {
      handleReceive();
    }
  };

  const resetState = () => {
    setStep("select-po");
    setSelectedPOId(null);
    setItemsState({});
  };

  const pendingCount = unreceivedPurchases.length;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetState();
        }}
      >
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 relative">
            <Package className="w-4 h-4" />
            Receive Stock
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                {pendingCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="sm:max-w-xl w-full flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {step === "select-po" ? "Receive Stock" : "Verify & Allocate Items"}
            </SheetTitle>
          </SheetHeader>

          {step === "select-po" && (
            <ScrollArea className="flex-1 mt-4">
              {isLoadingUnreceived ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : unreceivedPurchases.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No pending purchase orders to receive</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {unreceivedPurchases.map((po) => (
                    <button
                      key={po.id}
                      onClick={() => selectPO(po.id)}
                      className="w-full text-left p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{po.purchase_order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {po.supplier?.name || "No supplier"}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {po.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {po.purchase_items.length} item(s)
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {step === "verify-items" && selectedPO && (
            <>
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("select-po")}
                  className="gap-1 -ml-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <p className="text-sm text-muted-foreground mt-1">
                  PO: <span className="font-medium text-foreground">{selectedPO.purchase_order_number}</span>
                  {selectedPO.supplier && ` • ${selectedPO.supplier.name}`}
                </p>
              </div>

              <ScrollArea className="flex-1 mt-4">
                <div className="space-y-4 pr-2">
                  {selectedPO.purchase_items.map((item) => {
                    const state = itemsState[item.id];
                    if (!state) return null;
                    const remaining = item.quantity_remaining ?? item.quantity_ordered;

                    return (
                      <ReceiveStockItemRow
                        key={item.id}
                        itemName={item.item_detail?.name || "Unknown Item"}
                        sku={item.item_detail?.sku || "N/A"}
                        quantityOrdered={item.quantity_ordered}
                        quantityAlreadyReceived={item.quantity_received || 0}
                        quantityRemaining={remaining}
                        quantityReceived={state.quantityReceived}
                        onQuantityReceivedChange={(qty) => updateItemQty(item.id, qty)}
                        allocations={state.allocations}
                        onAllocationsChange={(allocs) => updateItemAllocations(item.id, allocs)}
                        warehouses={warehouses}
                      />
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="mt-3 p-3 border border-destructive/50 rounded-lg bg-destructive/5">
                  <p className="text-sm font-medium text-destructive mb-1">Fix before continuing:</p>
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err}</p>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  onClick={handleSubmit}
                  disabled={validationErrors.length > 0 || isReceiving}
                  className="w-full"
                >
                  {isReceiving ? "Processing..." : discrepancyItems.length > 0
                    ? "Review Discrepancies & Receive"
                    : "Confirm & Receive Stock"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DiscrepancyConfirmDialog
        open={discrepancyOpen}
        onOpenChange={setDiscrepancyOpen}
        items={discrepancyItems}
        onConfirm={(note) => handleReceive(note)}
        isLoading={isReceiving}
      />
    </>
  );
}
