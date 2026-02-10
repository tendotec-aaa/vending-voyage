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
import { AlertTriangle } from "lucide-react";

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
}

export function DiscrepancyConfirmDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  isLoading,
}: DiscrepancyConfirmDialogProps) {
  const [note, setNote] = useState("");

  const totalMissing = items.reduce((sum, i) => sum + i.missing, 0);
  const canConfirm = note.trim().length >= 10;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Stock Discrepancy Detected
          </AlertDialogTitle>
          <AlertDialogDescription>
            The following items have differences between expected and received quantities.
            Missing items will be logged to the <strong>Unaccounted Inventory</strong> warehouse.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          {/* Discrepancy list */}
          <div className="border border-border rounded-lg divide-y divide-border">
            {items.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{item.itemName}</span>
                <div className="text-sm text-right">
                  <span className="text-muted-foreground">Expected {item.expected.toLocaleString()}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="text-foreground">{item.received.toLocaleString()}</span>
                  <span className="ml-2 text-destructive font-medium">(-{item.missing.toLocaleString()})</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            Total unaccounted: <span className="text-destructive font-semibold">{totalMissing.toLocaleString()} units</span>
          </p>

          {/* Acknowledgment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Please explain the discrepancy (min 10 characters) *
            </label>
            <Textarea
              placeholder="e.g., 500 units damaged during shipping, carrier has been notified..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            onClick={() => onConfirm(note)}
            disabled={!canConfirm || isLoading}
            variant="destructive"
          >
            {isLoading ? "Processing..." : "Acknowledge & Receive"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
