import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Loader2, Plus, Truck, Warehouse as WarehouseIcon, Wrench } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
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
import { UnloadVehicleDialog } from "@/components/warehouse/UnloadVehicleDialog";
import { useWarehouseInventory } from "@/hooks/useWarehouseInventory";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Warehouse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isAccountant, isOperator } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [showZeroStock, setShowZeroStock] = useState(false);

  const { inventory, warehouses, isLoading, isWarehousesLoading, createWarehouse, isCreatingWarehouse, unloadVehicle, isUnloading } =
    useWarehouseInventory(selectedWarehouse);
  const { categories } = useCategories();

  // Accountants are view-only; operators can view + adjust (no create warehouse / new assembly)
  const canManageFull = isAdmin;
  const canAdjust = isAdmin || isOperator;
  const isViewOnly = isAccountant;

  const handleCategoryChange = (value: string) => setCategoryFilter(value);

  const filteredInventory = useMemo(() => {
    return inventory
      .filter((item) => {
        if (!showZeroStock && (item.quantity_on_hand || 0) === 0) return false;
        const itemName = item.item_detail?.name?.toLowerCase() || "";
        const sku = item.item_detail?.sku?.toLowerCase() || "";
        const q = searchQuery.toLowerCase();
        const matchesSearch = itemName.includes(q) || sku.includes(q);
        const matchesCategory =
          categoryFilter === "all" || item.item_detail?.category_id === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => (b.quantity_on_hand || 0) - (a.quantity_on_hand || 0));
  }, [inventory, searchQuery, categoryFilter, showZeroStock]);

  const totalItems = filteredInventory.reduce((sum, item) => sum + (item.quantity_on_hand || 0), 0);
  const activeSKUs = filteredInventory.filter((item) => (item.quantity_on_hand || 0) > 0).length;

  const standardWarehouses = warehouses.filter((w) => !w.is_system && !w.is_transitional);
  const vehicleWarehouses = warehouses.filter((w) => !w.is_system && w.is_transitional);
  const systemWarehouses = warehouses.filter((w) => w.is_system);

  const selectedWh = warehouses.find((w) => w.id === selectedWarehouse);
  const isSelectedVehicle = selectedWh?.is_transitional === true;

  const handleUnload = async (destinationId: string) => {
    if (!user?.id) return;
    await unloadVehicle({ vehicleId: selectedWarehouse, destinationWarehouseId: destinationId, userId: user.id });
  };

  const destinationBodegas = standardWarehouses.filter((w) => w.id !== selectedWarehouse);

  const { t, i18n } = useTranslation();

  return (
    <AppLayout
      title={t('warehouse.title')}
      subtitle={t('warehouse.subtitle')}
      actions={
        <div className="flex gap-2 flex-wrap">
          {isSelectedVehicle && canAdjust && (
            <UnloadVehicleDialog
              vehicleId={selectedWarehouse}
              vehicleName={selectedWh?.name || ""}
              warehouses={destinationBodegas}
              onUnload={handleUnload}
              isUnloading={isUnloading}
            />
          )}
          {!isViewOnly && (
            <Button variant="outline" onClick={() => navigate("/warehouse/assembly/new")}>
              <Wrench className="mr-2 h-4 w-4" />
              {t('warehouse.assemble')}
            </Button>
          )}
          {canManageFull && (
            <>
              <AddWarehouseItemDialog />
              <CreateWarehouseDialog onCreate={createWarehouse} isCreating={isCreatingWarehouse} />
            </>
          )}
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
          {t('common.allWarehouses')}
          <Badge variant="secondary" className="ml-2 text-xs">{inventory.length}</Badge>
        </button>

        {standardWarehouses.map((wh) => (
          <button
            key={wh.id}
            onClick={() => setSelectedWarehouse(wh.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              selectedWarehouse === wh.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            <WarehouseIcon className="w-3.5 h-3.5" />
            {wh.name}
          </button>
        ))}

        {vehicleWarehouses.map((wh) => (
          <button
            key={wh.id}
            onClick={() => setSelectedWarehouse(wh.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              selectedWarehouse === wh.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            {wh.name}
          </button>
        ))}

        {canManageFull && systemWarehouses.map((wh) => (
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
          <p className="text-sm text-muted-foreground">{t('warehouse.activeSKUs')}</p>
          <p className="text-2xl font-bold text-foreground">{activeSKUs} <span className="text-muted-foreground font-normal text-lg">/ {filteredInventory.length}</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('warehouse.totalItems')}</p>
          <p className="text-2xl font-bold text-foreground">{totalItems.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('warehouse.searchBySKU')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('common.allCategories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allCategories')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="wh-show-zero" checked={showZeroStock} onCheckedChange={setShowZeroStock} />
            <Label htmlFor="wh-show-zero" className="text-sm text-muted-foreground whitespace-nowrap">{t('warehouse.showZeroStock')}</Label>
          </div>
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
            <h3 className="text-lg font-medium text-foreground">{t('warehouse.noItemsFound')}</h3>
            <p className="text-muted-foreground mt-1">
              {inventory.length === 0 ? t('warehouse.addFirstItem') : t('warehouse.adjustFilters')}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('warehouse.itemName')}</TableHead>
                <TableHead>{t('warehouse.sku')}</TableHead>
                <TableHead>{t('common.category')}</TableHead>
                {selectedWarehouse === "all" && <TableHead>{t('sidebar.warehouse')}</TableHead>}
                <TableHead className="text-right">{t('common.quantity')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('warehouse.lastUpdated')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const qty = item.quantity_on_hand || 0;
                const isLow = qty <= 0;
                const isInactive = qty <= 0;
                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isInactive ? "opacity-40" : ""}`}
                    onClick={() => canManageFull && item.item_detail?.id && navigate(`/inventory/${item.item_detail.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">{item.item_detail?.name || t('common.unknown')}</TableCell>
                    <TableCell className="font-mono text-sm text-primary">{item.item_detail?.sku || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.item_detail?.category?.name || "—"}</TableCell>
                    {selectedWarehouse === "all" && (
                      <TableCell className="text-muted-foreground">{item.warehouse?.name || "—"}</TableCell>
                    )}
                    <TableCell className={`text-right font-medium ${qty < 0 ? 'text-destructive' : 'text-foreground'}`}>
                      {qty.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive" className="text-xs">{t('common.lowStock')}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{t('common.inStock')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.last_updated ? new Date(item.last_updated).toLocaleDateString(i18n.language) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
