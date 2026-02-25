import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Warehouse as WarehouseIcon, Loader2, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { AddWarehouseItemDialog } from "@/components/warehouse/AddWarehouseItemDialog";
import { CreateWarehouseDialog } from "@/components/warehouse/CreateWarehouseDialog";
import { useWarehouseInventory } from "@/hooks/useWarehouseInventory";
import { useCategories } from "@/hooks/useCategories";

export default function Warehouse() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");

  const { inventory, warehouses, isLoading, isWarehousesLoading, createWarehouse, isCreatingWarehouse } =
    useWarehouseInventory(selectedWarehouse);
  const { categories } = useCategories();

  const handleCategoryChange = (value: string) => setCategoryFilter(value);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const itemName = item.item_detail?.name?.toLowerCase() || "";
      const sku = item.item_detail?.sku?.toLowerCase() || "";
      const q = searchQuery.toLowerCase();
      const matchesSearch = itemName.includes(q) || sku.includes(q);
      const matchesCategory =
        categoryFilter === "all" || item.item_detail?.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, categoryFilter]);

  const totalItems = filteredInventory.reduce((sum, item) => sum + (item.quantity_on_hand || 0), 0);
  const userWarehouses = warehouses.filter((w) => !w.is_system);
  const systemWarehouses = warehouses.filter((w) => w.is_system);

  return (
    <AppLayout
      title="Warehouses"
      subtitle="Manage inventory across your warehouses"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/warehouse/assembly/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Assembly
          </Button>
          <AddWarehouseItemDialog />
          <CreateWarehouseDialog onCreate={createWarehouse} isCreating={isCreatingWarehouse} />
        </div>
      }
    >
      {/* Warehouse Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedWarehouse("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            selectedWarehouse === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:bg-muted"
          }`}
        >
          All Warehouses
          <Badge variant="secondary" className="ml-2 text-xs">{inventory.length}</Badge>
        </button>
        {userWarehouses.map((wh) => (
          <button
            key={wh.id}
            onClick={() => setSelectedWarehouse(wh.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              selectedWarehouse === wh.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            {wh.name}
          </button>
        ))}
        {systemWarehouses.map((wh) => (
          <button
            key={wh.id}
            onClick={() => setSelectedWarehouse(wh.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              selectedWarehouse === wh.id
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {wh.name}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total SKUs</p>
          <p className="text-2xl font-bold text-foreground">{filteredInventory.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Items</p>
          <p className="text-2xl font-bold text-foreground">{totalItems.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card>
        {isLoading || isWarehousesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No items found</h3>
            <p className="text-muted-foreground mt-1">
              {inventory.length === 0 ? "Add your first item or receive a purchase order" : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                {selectedWarehouse === "all" && <TableHead>Warehouse</TableHead>}
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => item.item_detail?.id && navigate(`/inventory/${item.item_detail.id}`)}
                >
                  <TableCell className="font-medium text-foreground">{item.item_detail?.name || "Unknown"}</TableCell>
                  <TableCell className="font-mono text-sm text-primary">{item.item_detail?.sku || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.item_detail?.category?.name || "—"}</TableCell>
                  {selectedWarehouse === "all" && (
                    <TableCell className="text-muted-foreground">{item.warehouse?.name || "—"}</TableCell>
                  )}
                  <TableCell className="text-right font-medium text-foreground">{(item.quantity_on_hand || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
