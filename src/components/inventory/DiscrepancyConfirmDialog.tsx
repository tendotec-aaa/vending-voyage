import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, ArrowRight, Warehouse } from "lucide-react";

interface DiscrepancyItem {
  itemName: string;
  expected: number;
  received: number;
  missing: number;
}

interface DiscrepancyConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DiscrepancyItem[];
  onConfirm: (note: string) => void;
  isLoading?: boolean;
  systemWarehouseName?: string;
}

export function DiscrepancyConfirmDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  isLoading,
  systemWarehouseName = "Unaccounted Inventory",
}: DiscrepancyConfirmDialogProps) {
  const [note, setNote] = useState("");

  const totalMissing = items.reduce((sum, i) => sum + i.missing, 0);

  const handleConfirm = () => {
    const effectiveNote =
      note.trim() ||
      items
        .map(
          (i) =>
            `Missing ${i.missing} unit(s) of "${i.itemName}" (expected ${i.expected}, received ${i.received}) — routed to ${systemWarehouseName} for supplier reclaim.`
        )
        .join(" | ");
    onConfirm(effectiveNote);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Stock Discrepancy Detected
          </AlertDialogTitle>
          <AlertDialogDescription>
            The following units are missing from this delivery.{" "}
            <strong>
              They will be routed to "{systemWarehouseName}" so you can reclaim
              them from the supplier.
            </strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Routing summary per item */}
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Routing Summary
              </p>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="p-3 space-y-1.5">
                <p className="text-sm font-medium text-foreground">{item.itemName}</p>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-muted-foreground">
                    Expected: <span className="text-foreground font-medium">{item.expected.toLocaleString()}</span>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Received: <span className="text-foreground font-medium">{item.received.toLocaleString()}</span>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-destructive font-semibold">
                    Missing: {item.missing.toLocaleString()} units
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                  <span className="text-destructive font-medium">{item.missing.toLocaleString()} units</span>
                  <ArrowRight className="w-3 h-3" />
                  <Warehouse className="w-3 h-3" />
                  <span className="font-medium text-foreground">{systemWarehouseName}</span>
                </div>
              </div>
            ))}
            <div className="px-3 py-2 bg-muted/30 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total unaccounted</span>
              <span className="text-sm font-bold text-destructive">
                {totalMissing.toLocaleString()} units
              </span>
            </div>
          </div>

          {/* Optional audit note */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Audit Note{" "}
              <span className="text-muted-foreground font-normal">(optional — a default will be generated if left blank)</span>
            </label>
            <Textarea
              placeholder={`e.g., Units missing on arrival — notifying ${systemWarehouseName} for supplier reclaim process...`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading
              ? "Processing..."
              : `Confirm — Route Missing Stock to "${systemWarehouseName}"`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
