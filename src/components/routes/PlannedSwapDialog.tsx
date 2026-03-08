import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SlotData, PlannedAction } from "@/hooks/useRoutes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: SlotData[];
  locationName: string;
  onConfirm: (action: PlannedAction) => void;
}

interface InStockProduct {
  id: string;
  name: string;
  available: number;
}

export function PlannedSwapDialog({ open, onOpenChange, slots, locationName, onConfirm }: Props) {
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [loadQuantity, setLoadQuantity] = useState<number | "">("")

  // Reset all when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedSpotId("");
      setSelectedSlotId("");
      setSelectedCategoryId("");
      setNewProductId("");
      setLoadQuantity("");
  }, [open]);

  // Group slots by spot
  const spotGroups = useMemo(() => {
    const map = new Map<string, { spotId: string; spotName: string }>();
    for (const slot of slots) {
      if (!map.has(slot.spot_id)) {
        map.set(slot.spot_id, {
          spotId: slot.spot_id,
          spotName: slot.spot_name || `Machine at ${locationName}`,
        });
      }
    }
    return Array.from(map.values());
  }, [slots, locationName]);

  // Filter slots by selected spot
  const filteredSlots = useMemo(
    () => (selectedSpotId ? slots.filter((s) => s.spot_id === selectedSpotId) : []),
    [slots, selectedSpotId]
  );

  // Categories query
  const categoriesQuery = useQuery({
    queryKey: ["swap-categories"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data || [];
    },
  });

  // In-stock products by category (fetched in two steps, aggregated in JS)
  const productsQuery = useQuery({
    queryKey: ["swap-in-stock-products", selectedCategoryId],
    enabled: open && !!selectedCategoryId,
    queryFn: async (): Promise<InStockProduct[]> => {
      // Step 1: Get merchandise items in this category
      const { data: items } = await supabase
        .from("item_details")
        .select("id, name")
        .eq("category_id", selectedCategoryId)
        .eq("type", "merchandise")
        .order("name");
      if (!items?.length) return [];

      const itemIds = items.map((i) => i.id);

      // Step 2: Get warehouse inventory for these items
      const { data: inv } = await supabase
        .from("inventory")
        .select("item_detail_id, quantity_on_hand")
        .in("item_detail_id", itemIds)
        .not("warehouse_id", "is", null);

      // Aggregate quantities per item
      const qtyMap = new Map<string, number>();
      for (const row of inv || []) {
        qtyMap.set(row.item_detail_id!, (qtyMap.get(row.item_detail_id!) || 0) + (row.quantity_on_hand || 0));
      }

      // Only return items with stock > 0
      return items
        .filter((item) => (qtyMap.get(item.id) || 0) > 0)
        .map((item) => ({
          id: item.id,
          name: item.name,
          available: qtyMap.get(item.id) || 0,
        }));
    },
  });

  // Cascade resets
  const handleSpotChange = (val: string) => {
    setSelectedSpotId(val);
    setSelectedSlotId("");
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategoryId(val);
    setNewProductId("");
  };

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const selectedProduct = productsQuery.data?.find((p) => p.id === newProductId);
  const selectedSpot = spotGroups.find((g) => g.spotId === selectedSpotId);

  const canConfirm = !!selectedSlotId && !!newProductId && !!selectedSlot && !!selectedProduct && !!loadQuantity && loadQuantity > 0;

  const handleConfirm = () => {
    if (!selectedSlot || !selectedProduct || !loadQuantity) return;
    onConfirm({
      type: "swap",
      slotId: selectedSlot.id,
      machineSerial: selectedSlot.machine_serial,
      slotNumber: selectedSlot.slot_number,
      oldProductId: selectedSlot.current_product_id || "",
      oldProductName: selectedSlot.product_name || "Empty",
      newProductId: selectedProduct.id,
      newProductName: selectedProduct.name,
      capacity: loadQuantity,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Plan a Swap</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* WHERE section */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Where</p>

          <div>
            <Label>Select Spot</Label>
            <Select value={selectedSpotId} onValueChange={handleSpotChange}>
              <SelectTrigger><SelectValue placeholder="Choose a spot" /></SelectTrigger>
              <SelectContent>
                {spotGroups.map((g) => (
                  <SelectItem key={g.spotId} value={g.spotId}>{g.spotName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Select Slot</Label>
            <Select value={selectedSlotId} onValueChange={setSelectedSlotId} disabled={!selectedSpotId}>
              <SelectTrigger><SelectValue placeholder={selectedSpotId ? "Choose a slot" : "Select a spot first"} /></SelectTrigger>
              <SelectContent>
                {filteredSlots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id}>
                    Slot {slot.slot_number}: {slot.product_name || "Empty"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* WHAT section */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">What</p>

          <div>
            <Label>Select Category</Label>
            <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
              <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
              <SelectContent>
                {(categoriesQuery.data || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Select New Product</Label>
            <Select value={newProductId} onValueChange={setNewProductId} disabled={!selectedCategoryId}>
              <SelectTrigger><SelectValue placeholder={selectedCategoryId ? "Choose a product" : "Select a category first"} /></SelectTrigger>
              <SelectContent>
                {(productsQuery.data || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — (<span className="font-bold text-primary">{p.available}</span> in stock)
                  </SelectItem>
                ))}
                {productsQuery.data?.length === 0 && selectedCategoryId && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No in-stock products in this category</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Load Quantity */}
          {selectedSlotId && newProductId && (
            <div>
              <Label>Load Quantity</Label>
              <Input
                type="number"
                min={1}
                max={selectedProduct?.available}
                placeholder={`Max: ${selectedProduct?.available ?? "—"}`}
                value={loadQuantity}
                onChange={(e) => setLoadQuantity(e.target.value ? Number(e.target.value) : "")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Slot capacity: {selectedSlot?.capacity || 150} · Available in bodega: {selectedProduct?.available ?? 0}
              </p>
            </div>
          )}

          {/* Preview */}
          {canConfirm && selectedSpot && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg space-y-1">
              <p><strong>Spot:</strong> {selectedSpot.spotName}</p>
              <p><strong>Swap:</strong> Slot {selectedSlot!.slot_number} — {selectedSlot!.product_name || "Empty"} → {selectedProduct!.name}</p>
              <p><strong>Load:</strong> {loadQuantity} units of {selectedProduct!.name}</p>
            </div>
          )}

          <Button onClick={handleConfirm} disabled={!canConfirm} className="w-full">
            Confirm Swap
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
