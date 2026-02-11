import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Search, Filter, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ReceiveStockDialog } from "@/components/inventory/ReceiveStockDialog";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouseQty: number;
  inMachinesQty: number;
  total: number;
  costPrice: number;
}

function useConsolidatedInventory() {
  return useQuery({
    queryKey: ["consolidated-inventory"],
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data: items, error: itemsError } = await supabase
        .from("item_details")
        .select(`id, sku, name, cost_price, type, categories (name)`)
        .eq("type", "merchandise");
      if (itemsError) throw itemsError;

      const { data: inventory, error: invError } = await supabase
        .from("inventory")
        .select("item_detail_id, quantity_on_hand, warehouse_id, spot_id");
      if (invError) throw invError;

      const { data: slots, error: slotsError } = await supabase
        .from("machine_slots")
        .select("current_product_id, current_stock");
      if (slotsError) throw slotsError;

      return (items || []).map((item: any) => {
        const warehouseQty = (inventory || [])
          .filter((inv: any) => inv.item_detail_id === item.id && inv.warehouse_id)
          .reduce((sum: number, inv: any) => sum + (inv.quantity_on_hand || 0), 0);

        const inMachinesQty = (slots || [])
          .filter((slot: any) => slot.current_product_id === item.id)
          .reduce((sum: number, slot: any) => sum + (slot.current_stock || 0), 0);

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.categories?.name || "Uncategorized",
          warehouseQty,
          inMachinesQty,
          total: warehouseQty + inMachinesQty,
          costPrice: item.cost_price || 0,
        };
      });
    },
  });
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { data: inventory, isLoading } = useConsolidatedInventory();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    if (!searchQuery) return inventory;
    const query = searchQuery.toLowerCase();
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [inventory, searchQuery]);

  const stats = useMemo(() => {
    if (!inventory) return { totalSKUs: 0, warehouseStock: 0, inMachines: 0 };
    return {
      totalSKUs: inventory.length,
      warehouseStock: inventory.reduce((sum, item) => sum + item.warehouseQty, 0),
      inMachines: inventory.reduce((sum, item) => sum + item.inMachinesQty, 0),
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total SKUs</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalSKUs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Warehouse Stock</p>
          <p className="text-2xl font-bold text-foreground">{stats.warehouseStock.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">In Machines</p>
          <p className="text-2xl font-bold text-foreground">{stats.inMachines.toLocaleString()}</p>
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
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
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
                <TableHead className="text-right">In Machines</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/inventory/${item.id}`)}
                >
                  <TableCell className="font-mono text-sm text-primary">{item.sku}</TableCell>
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="text-right text-foreground">{item.warehouseQty.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-foreground">{item.inMachinesQty.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.costPrice > 0 ? `$${item.costPrice.toFixed(2)}` : "N/A"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {item.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
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
