import { useState, useMemo } from "react";
import { Search, Package, Warehouse as WarehouseIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WarehouseItemCard } from "@/components/warehouse/WarehouseItemCard";
import { AddWarehouseItemDialog } from "@/components/warehouse/AddWarehouseItemDialog";
import { CreateWarehouseDialog } from "@/components/warehouse/CreateWarehouseDialog";
import { useWarehouseInventory } from "@/hooks/useWarehouseInventory";
import { useCategories } from "@/hooks/useCategories";
import { Loader2 } from "lucide-react";

export default function Warehouse() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");

  const { inventory, warehouses, isLoading, isWarehousesLoading, createWarehouse, isCreatingWarehouse } =
    useWarehouseInventory(selectedWarehouse);
  const { categories, getSubcategoriesByCategory } = useCategories();

  const filteredSubcategories = getSubcategoriesByCategory(
    categoryFilter !== "all" ? categoryFilter : undefined
  );

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setSubcategoryFilter("all");
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const itemName = item.item_detail?.name?.toLowerCase() || "";
      const matchesSearch = itemName.includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.item_detail?.category_id === categoryFilter;
      const matchesSubcategory =
        subcategoryFilter === "all" || item.item_detail?.subcategory_id === subcategoryFilter;
      return matchesSearch && matchesCategory && matchesSubcategory;
    });
  }, [inventory, searchQuery, categoryFilter, subcategoryFilter]);

  const totalItems = filteredInventory.reduce(
    (sum, item) => sum + (item.quantity_on_hand || 0),
    0
  );

  const selectedWarehouseData = warehouses.find((w) => w.id === selectedWarehouse);
  const userWarehouses = warehouses.filter((w) => !w.is_system);
  const systemWarehouses = warehouses.filter((w) => w.is_system);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
            <p className="text-muted-foreground">
              Manage inventory across your warehouses
            </p>
          </div>
          <div className="flex gap-2">
            <AddWarehouseItemDialog />
            <CreateWarehouseDialog
              onCreate={createWarehouse}
              isCreating={isCreatingWarehouse}
            />
          </div>
        </div>

        {/* Warehouse Selector */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedWarehouse("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              selectedWarehouse === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            All Warehouses
            <Badge variant="secondary" className="ml-2 text-xs">
              {inventory.length}
            </Badge>
          </button>
          {userWarehouses.map((wh) => {
            const count = inventory.filter((i) =>
              selectedWarehouse === "all" ? i.warehouse_id === wh.id : true
            ).length;
            return (
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
            );
          })}
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

        {/* Warehouse Info */}
        {selectedWarehouseData && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">{selectedWarehouseData.name}</h2>
              {selectedWarehouseData.is_system && (
                <Badge variant="outline" className="text-xs">System</Badge>
              )}
            </div>
            {selectedWarehouseData.address && (
              <p className="text-sm text-muted-foreground">{selectedWarehouseData.address}</p>
            )}
            {selectedWarehouseData.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedWarehouseData.description}</p>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total SKUs</p>
            <p className="text-2xl font-bold text-foreground">
              {filteredInventory.length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold text-foreground">
              {totalItems.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
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
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={subcategoryFilter}
            onValueChange={setSubcategoryFilter}
            disabled={categoryFilter === "all"}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Sub-Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub-Categories</SelectItem>
              {filteredSubcategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading || isWarehousesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              No items found
            </h3>
            <p className="text-muted-foreground mt-1">
              {inventory.length === 0
                ? "Add your first item or receive a purchase order"
                : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInventory.map((item) => (
              <WarehouseItemCard
                key={item.id}
                name={item.item_detail?.name || "Unknown Item"}
                quantity={item.quantity_on_hand || 0}
                category={item.item_detail?.category?.name || null}
                subcategory={item.item_detail?.subcategory?.name || null}
                unitCost={0}
                warehouseName={item.warehouse?.name || undefined}
                showWarehouse={selectedWarehouse === "all"}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
