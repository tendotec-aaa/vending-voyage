import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, Filter, Package, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouseQty: number;
  inMachinesQty: number;
  total: number;
  costPrice: number;
  minStock: number;
}

function useConsolidatedInventory() {
  return useQuery({
     queryKey: ["consolidated-inventory"],
     queryFn: async (): Promise<InventoryItem[]> => {
       // Fetch item details with categories
       const { data: items, error: itemsError } = await supabase
         .from("item_details")
         .select(`
           id,
           sku,
           name,
           cost_price,
           type,
           categories (name)
         `)
         .eq("type", "merchandise");

       if (itemsError) throw itemsError;

       // Fetch inventory records (warehouse stock)
       const { data: inventory, error: invError } = await supabase
         .from("inventory")
         .select("item_detail_id, quantity_on_hand, warehouse_id, spot_id");

       if (invError) throw invError;

       // Fetch machine slots for in-machine stock
       const { data: slots, error: slotsError } = await supabase
         .from("machine_slots")
         .select("current_product_id, current_stock");

       if (slotsError) throw slotsError;

       // Aggregate data per item
       return (items || []).map((item: any) => {
         // Sum warehouse inventory
         const warehouseQty = (inventory || [])
           .filter((inv: any) => inv.item_detail_id === item.id && inv.warehouse_id)
           .reduce((sum: number, inv: any) => sum + (inv.quantity_on_hand || 0), 0);

         // Sum in-machine stock from machine_slots
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
           minStock: 100, // Default minimum stock threshold
         };
       });
     },
   });
}

export default function InventoryPage() {
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

  const getStockStatus = (total: number, minStock: number) => {
    const ratio = total / minStock;
    if (ratio < 0.7) return { status: "critical", label: "Critical", variant: "destructive" as const };
    if (ratio < 1) return { status: "low", label: "Low Stock", variant: "secondary" as const };
    return { status: "healthy", label: "Healthy", variant: "default" as const };
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!inventory) return { totalSKUs: 0, warehouseStock: 0, inMachines: 0, lowStockCount: 0 };
    
    return {
      totalSKUs: inventory.length,
      warehouseStock: inventory.reduce((sum, item) => sum + item.warehouseQty, 0),
      inMachines: inventory.reduce((sum, item) => sum + item.inMachinesQty, 0),
      lowStockCount: inventory.filter((item) => item.total < item.minStock).length,
    };
  }, [inventory]);

  return (
    <AppLayout
      title="Inventory"
      subtitle="Track product stock across warehouses and machines"
      actions={
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Package className="w-4 h-4" />
            Receive Stock
          </Button>
          <Button className="gap-2">
            Transfer Stock
          </Button>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Total SKUs</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalSKUs}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Warehouse Stock</p>
          <p className="text-2xl font-bold text-foreground">{stats.warehouseStock.toLocaleString()}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">In Machines</p>
          <p className="text-2xl font-bold text-foreground">{stats.inMachines.toLocaleString()}</p>
        </Card>
        <Card className="p-4 bg-card border-border flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
            <p className="text-2xl font-bold text-destructive">{stats.lowStockCount}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 bg-card border-border">
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
      <Card className="bg-card border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">SKU</TableHead>
              <TableHead className="text-muted-foreground">Product Name</TableHead>
              <TableHead className="text-muted-foreground">Category</TableHead>
              <TableHead className="text-muted-foreground text-right">Warehouse</TableHead>
              <TableHead className="text-muted-foreground text-right">In Machines</TableHead>
              <TableHead className="text-muted-foreground">Stock Level</TableHead>
              <TableHead className="text-muted-foreground text-right">Cost</TableHead>
              <TableHead className="text-muted-foreground text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => {
              const stockStatus = getStockStatus(item.total, item.minStock);
              const stockPercentage = Math.min((item.total / item.minStock) * 100, 100);
              
              return (
                <TableRow key={item.id} className="border-border hover:bg-muted/50">
                  <TableCell className="font-mono text-sm text-primary">{item.sku}</TableCell>
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="text-right text-foreground">{item.warehouseQty.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-foreground">{item.inMachinesQty.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[150px]">
                      <Progress 
                        value={stockPercentage} 
                        className="flex-1 h-2"
                      />
                      <Badge variant={stockStatus.variant} className="text-xs">
                        {stockStatus.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ${item.costPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {item.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredInventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
