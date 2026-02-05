import { useState, useMemo } from "react";
import { Search, Package } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WarehouseItemCard } from "@/components/warehouse/WarehouseItemCard";
import { AddWarehouseItemDialog } from "@/components/warehouse/AddWarehouseItemDialog";
import { useWarehouseInventory } from "@/hooks/useWarehouseInventory";
import { useCategories } from "@/hooks/useCategories";
import { Loader2 } from "lucide-react";

export default function Warehouse() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");

  const { inventory, isLoading } = useWarehouseInventory();
  const { categories, getSubcategoriesByCategory } = useCategories();

  const filteredSubcategories = getSubcategoriesByCategory(
    categoryFilter !== "all" ? categoryFilter : undefined
  );

  // Reset subcategory filter when category changes
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setSubcategoryFilter("all");
  };

  // Filter inventory based on search and filters
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const itemName = item.item_detail?.name?.toLowerCase() || "";
      const matchesSearch = itemName.includes(searchQuery.toLowerCase());

      const itemCategoryId = item.item_detail?.category_id;
      const matchesCategory =
        categoryFilter === "all" || itemCategoryId === categoryFilter;

      const itemSubcategoryId = item.item_detail?.subcategory_id;
      const matchesSubcategory =
        subcategoryFilter === "all" || itemSubcategoryId === subcategoryFilter;

      return matchesSearch && matchesCategory && matchesSubcategory;
    });
  }, [inventory, searchQuery, categoryFilter, subcategoryFilter]);

  // Calculate totals
  const totalItems = filteredInventory.reduce(
    (sum, item) => sum + (item.quantity_on_hand || 0),
    0
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Warehouse Items
            </h1>
            <p className="text-muted-foreground">
              Manage your inventory stock levels
            </p>
          </div>
          <AddWarehouseItemDialog />
        </div>

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
        {isLoading ? (
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
                ? "Add your first item to get started"
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
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
