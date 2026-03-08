import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackageOpen } from "lucide-react";

interface Warehouse {
  id: string;
  name: string;
}

interface UnloadVehicleDialogProps {
  vehicleId: string;
  vehicleName: string;
  warehouses: Warehouse[];
  onUnload: (destinationId: string) => Promise<any>;
  isUnloading?: boolean;
}

export function UnloadVehicleDialog({
  vehicleId,
  vehicleName,
  warehouses,
  onUnload,
  isUnloading,
}: UnloadVehicleDialogProps) {
  const [open, setOpen] = useState(false);
  const [destinationId, setDestinationId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationId) return;
    await onUnload(destinationId);
    setDestinationId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <PackageOpen className="w-4 h-4" />
          Unload Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unload "{vehicleName}"</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All inventory in this vehicle will be transferred to the selected destination bodega.
          </p>
          <div className="space-y-2">
            <Label>Destination Bodega *</Label>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bodega..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!destinationId || isUnloading}>
              {isUnloading ? "Unloading..." : "Unload All"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
