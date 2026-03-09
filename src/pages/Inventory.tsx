import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Search, Filter, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ReceiveStockDialog } from "@/components/inventory/ReceiveStockDialog";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  type: string;
  warehouseQty: number;
  inMachinesQty: number;
  total: number;
  totalInventoryCost: number;
}

function useConsolidatedInventory() {
  return useQuery({
    queryKey: ["consolidated-inventory"],
    queryFn: async (): Promise<InventoryItem[]> => {
      // Fetch item_type IDs where is_sellable, is_asset, or is_supply
      const { data: validTypes } = await (supabase as any)
        .from("item_types")
        .select("id, is_sellable, is_asset, is_supply")
        .or("is_sellable.eq.true,is_asset.eq.true,is_supply.eq.true");
      const validTypeIds = (validTypes || []).map((t: any) => t.id);

      // Fetch all items linked to valid types (or fall back to legacy filter)
      let query = supabase
        .from("item_details")
        .select(`id, sku, name, cost_price, type, category_id, item_type_id, categories (name)`);

      if (validTypeIds.length > 0) {
        query = query.in("item_type_id", validTypeIds);
      } else {
        // Fallback for items without item_type_id assigned
        query = query.in("type", ["merchandise", "machine_model"]);
      }

      const { data: items, error: itemsError } = await query;
      if (itemsError) throw itemsError;

      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select("item_detail_id, quantity_on_hand, warehouse_id, spot_id");
      if (invError) throw invError;

      const { data: slots, error: slotsError } = await supabase
        .from("machine_slots")
        .select("current_product_id, current_stock");
      if (slotsError) throw slotsError;

      // Fetch ALL purchase batches for WAC calculation
      const { data: allPurchaseItems, error: batchError } = await supabase
        .from("purchase_items")
        .select("item_detail_id, quantity_ordered, landed_unit_cost, final_unit_cost");
      if (batchError) throw batchError;

      // Fetch machines for machine_model deployed/warehouse counts
      const { data: machines, error: machinesError } = await supabase
        .from("machines")
        .select("model_id, status");
      if (machinesError) throw machinesError;

      // Build WAC map: total_cost / total_qty across all batches
      const costAcc = new Map<string, { totalCost: number; totalQty: number }>();
      for (const b of allPurchaseItems || []) {
        const cost = b.final_unit_cost || b.landed_unit_cost || 0;
        const qty = b.quantity_ordered || 0;
        if (!b.item_detail_id) continue;
        const acc = costAcc.get(b.item_detail_id) || { totalCost: 0, totalQty: 0 };
        acc.totalCost += qty * cost;
        acc.totalQty += qty;
        costAcc.set(b.item_detail_id, acc);
      }
      const wacMap = new Map<string, number>();
      for (const [id, acc] of costAcc) {
        wacMap.set(id, acc.totalQty > 0 ? acc.totalCost / acc.totalQty : 0);
      }

      return (items || []).map((item: any) => {
        if (item.type === "machine_model") {
          // For machine models, count by machine status
          const itemMachines = (machines || []).filter((m: any) => m.model_id === item.id);
          const warehouseQty = itemMachines.filter((m: any) => m.status === "in_warehouse" || m.status === "maintenance").length;
          const deployedQty = itemMachines.filter((m: any) => m.status === "deployed").length;
          const totalQty = itemMachines.filter((m: any) => m.status !== "retired").length;

          const itemBatches = (purchaseBatches || []).filter((b: any) => b.item_detail_id === item.id);
          const totalInventoryCost = itemBatches.reduce((sum: number, b: any) => {
            const costPerUnit = b.final_unit_cost || b.landed_unit_cost || 0;
            return sum + ((b.quantity_remaining || 0) * costPerUnit);
          }, 0);

          return {
            id: item.id,
            sku: item.sku,
            name: item.name,
            category: item.categories?.name || "Uncategorized",
            type: item.type,
            warehouseQty,
            inMachinesQty: deployedQty,
            total: totalQty,
            totalInventoryCost,
          };
        }

        // Merchandise items - original logic
        const warehouseQty = (inventory || [])
          .filter((inv: any) => inv.item_detail_id === item.id && inv.warehouse_id)
          .reduce((sum: number, inv: any) => sum + (inv.quantity_on_hand || 0), 0);

        const inMachinesQty = (slots || [])
          .filter((slot: any) => slot.current_product_id === item.id)
          .reduce((sum: number, slot: any) => sum + (slot.current_stock || 0), 0);

        const totalQty = warehouseQty + inMachinesQty;

        const itemBatches = (purchaseBatches || []).filter((b: any) => b.item_detail_id === item.id);
        const totalInventoryCost = itemBatches.reduce((sum: number, b: any) => {
          const costPerUnit = b.final_unit_cost || b.landed_unit_cost || 0;
          return sum + ((b.quantity_remaining || 0) * costPerUnit);
        }, 0);

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.categories?.name || "Uncategorized",
          type: item.type,
          warehouseQty,
          inMachinesQty,
          total: totalQty,
          totalInventoryCost,
        };
      });
    },
  });
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { data: inventory, isLoading } = useConsolidatedInventory();
  const [searchQuery, setSearchQuery] = useState("");
  const [showZeroStock, setShowZeroStock] = useState(false);

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    let items = inventory;
    if (!showZeroStock) items = items.filter((item) => item.total !== 0);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    return items.sort((a, b) => b.totalInventoryCost - a.totalInventoryCost);
  }, [inventory, searchQuery, showZeroStock]);

  const stats = useMemo(() => {
    if (!inventory) return { totalSKUs: 0, activeSKUs: 0, warehouseStock: 0, deployed: 0, totalCost: 0 };
    return {
      totalSKUs: inventory.length,
      activeSKUs: inventory.filter((item) => item.total > 0).length,
      warehouseStock: inventory.reduce((sum, item) => sum + item.warehouseQty, 0),
      deployed: inventory.reduce((sum, item) => sum + item.inMachinesQty, 0),
      totalCost: inventory.reduce((sum, item) => sum + item.totalInventoryCost, 0),
    };
  }, [inventory]);

  return (
    <AppLayout
      title="Inventory"
      subtitle="Track product stock across warehouses and machines"
      actions={
        <div className="flex gap-3">
          <ReceiveStockDialog />
          <Button className="gap-2">Transfer Stock</Button>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active SKUs / Total SKUs</p>
          <p className="text-2xl font-bold text-foreground">{stats.activeSKUs} <span className="text-muted-foreground font-normal text-lg">/ {stats.totalSKUs}</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Warehouse Stock</p>
          <p className="text-2xl font-bold text-foreground">{stats.warehouseStock.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Deployed</p>
          <p className="text-2xl font-bold text-foreground">{stats.deployed.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Inventory Cost</p>
          <p className="text-2xl font-bold text-foreground">${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-10 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="show-zero" checked={showZeroStock} onCheckedChange={setShowZeroStock} />
            <Label htmlFor="show-zero" className="text-sm text-muted-foreground whitespace-nowrap">Show zero/negative stock</Label>
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Warehouse</TableHead>
                <TableHead className="text-right">Deployed</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Inventory Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const isInactive = item.total <= 0;
                return (
                <TableRow
                  key={item.id}
                  className={`cursor-pointer hover:bg-muted/50 ${isInactive ? "opacity-40" : ""}`}
                  onClick={() => navigate(`/inventory/${item.id}`)}
                >
                  <TableCell className="font-mono text-sm text-primary">{item.sku}</TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {item.type === "machine_model" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Machine</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.category}</TableCell>
                  <TableCell className={`text-right ${item.warehouseQty < 0 ? 'text-destructive font-medium' : 'text-foreground'}`}>{item.warehouseQty.toLocaleString()}</TableCell>
                  <TableCell className={`text-right ${item.inMachinesQty < 0 ? 'text-destructive font-medium' : 'text-foreground'}`}>{item.inMachinesQty.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-medium ${item.total < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {item.total.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    ${item.totalInventoryCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                );
              })}
              {filteredInventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No items match your search" : "No inventory items found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
