import { useState, useEffect } from "react";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWarehouseInventory, ItemDetail } from "@/hooks/useWarehouseInventory";
import { useCategories } from "@/hooks/useCategories";
import { usePurchases } from "@/hooks/usePurchases";
import { useTranslation } from "react-i18next";

export function AddWarehouseItemDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const {
    itemDetails,
    addInventory,
    createItemDetail,
    isAdding,
    isCreatingItem,
  } = useWarehouseInventory();

  const { warehouses } = usePurchases();
  const { categories, getSubcategoriesByCategory } = useCategories();
  const filteredSubcategories = getSubcategoriesByCategory(categoryId);

  // Filter items based on search
  const filteredItems = itemDetails.filter((item) =>
    item.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Pre-fill category/subcategory when existing item is selected
  useEffect(() => {
    if (selectedItem) {
      setCategoryId(selectedItem.category_id || "");
      setSubcategoryId(selectedItem.subcategory_id || "");
      setIsNewItem(false);
    }
  }, [selectedItem]);

  // Reset subcategory when category changes
  useEffect(() => {
    if (!selectedItem) {
      setSubcategoryId("");
    }
  }, [categoryId, selectedItem]);

  const resetForm = () => {
    setSearchValue("");
    setSelectedItem(null);
    setIsNewItem(false);
    setNewItemName("");
    setQuantity("");
    setCategoryId("");
    setSubcategoryId("");
    setWarehouseId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const qty = parseInt(quantity);

    if (isNaN(qty) || qty <= 0) {
      return;
    }

    try {
      let itemId = selectedItem?.id;

      // If creating a new item
      if (isNewItem && newItemName.trim()) {
        const newItem = await createItemDetail({
          name: newItemName.trim(),
          categoryId: categoryId || undefined,
          subcategoryId: subcategoryId || undefined,
        });
        itemId = newItem.id;
      }

      if (!itemId) return;

      await addInventory({
        itemDetailId: itemId,
        quantity: qty,
        warehouseId: warehouseId || undefined,
      });

      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };

  const handleCreateNew = () => {
    setNewItemName(searchValue);
    setSelectedItem(null);
    setIsNewItem(true);
    setCategoryId("");
    setSubcategoryId("");
    setComboboxOpen(false);
  };

  const isFormValid = isNewItem
    ? newItemName.trim() && quantity
    : selectedItem && quantity;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('warehouse.addItems')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('warehouse.addItemTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Name Combobox */}
          <div className="space-y-2">
            <Label>{t('warehouse.itemNameLabel')} *</Label>
            {isNewItem ? (
              <div className="flex gap-2">
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={t('warehouse.itemNameLabel')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsNewItem(false);
                    setNewItemName("");
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedItem ? selectedItem.name : t('warehouse.searchOrCreate')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('warehouse.searchItems')}
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2">
                          <p className="text-sm text-muted-foreground mb-2">
                            {t('warehouse.noItemsFoundCreate')}
                          </p>
                           <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCreateNew}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('warehouse.createItem', { name: searchValue })}  
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredItems.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={() => {
                              setSelectedItem(item);
                              setComboboxOpen(false);
                              setSearchValue("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedItem?.id === item.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {item.name}
                          </CommandItem>
                        ))}
                        {searchValue && filteredItems.length > 0 && (
                          <CommandItem onSelect={handleCreateNew}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('warehouse.createItem', { name: searchValue })}
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label>{t('sidebar.warehouse')} *</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder={t('warehouse.selectWarehouse')} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">{t('common.quantity')} *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={t('warehouse.enterQuantity')}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t('common.category')}</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={!!selectedItem}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('warehouse.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub-Category */}
          <div className="space-y-2">
            <Label>{t('warehouse.subCategory')}</Label>
            <Select
              value={subcategoryId}
              onValueChange={setSubcategoryId}
              disabled={!!selectedItem || !categoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('warehouse.selectSubCategory')} />
              </SelectTrigger>
              <SelectContent>
                {filteredSubcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || !warehouseId || isAdding || isCreatingItem}
            >
              {isAdding || isCreatingItem ? t('warehouse.adding') : t('warehouse.addItem')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
