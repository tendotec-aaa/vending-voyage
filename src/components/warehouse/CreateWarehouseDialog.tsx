import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CreateWarehouseDialogProps {
  onCreate: (data: { name: string; address?: string; description?: string; is_transitional?: boolean }) => Promise<any>;
  isCreating?: boolean;
}

export function CreateWarehouseDialog({ onCreate, isCreating }: CreateWarehouseDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [isTransitional, setIsTransitional] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onCreate({
      name: name.trim(),
      address: address.trim() || undefined,
      description: description.trim() || undefined,
      is_transitional: isTransitional,
    });

    setName("");
    setAddress("");
    setDescription("");
    setIsTransitional(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t('warehouse.newWarehouse')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('warehouse.createWarehouse')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wh-name">{t('warehouse.warehouseName')} *</Label>
            <Input
              id="wh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('warehouse.egMainWarehouse')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-address">{t('warehouse.warehouseAddress')}</Label>
            <Input
              id="wh-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('warehouse.optionalAddress')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-desc">{t('warehouse.warehouseDesc')}</Label>
            <Textarea
              id="wh-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('warehouse.optionalNotes')}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="wh-transitional"
              checked={isTransitional}
              onCheckedChange={setIsTransitional}
            />
            <Label htmlFor="wh-transitional" className="text-sm">
              {t('warehouse.isTransitional')}
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? t('common.creating') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
