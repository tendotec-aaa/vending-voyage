import { format } from "date-fns";
import { Package, Truck, Calendar, DollarSign, MoreVertical, Trash2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import type { Purchase, PurchaseStatus } from "@/hooks/usePurchases";

interface PurchaseCardProps {
  purchase: Purchase;
  onUpdateStatus: (id: string, status: PurchaseStatus) => void;
  onDelete: (id: string) => void;
}

const statusConfig: Record<PurchaseStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  pending: { label: "Pending", variant: "secondary" },
  in_transit: { label: "In Transit", variant: "default" },
  received: { label: "Received", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function PurchaseCard({ purchase, onUpdateStatus, onDelete }: PurchaseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusInfo = statusConfig[purchase.status];
  const itemCount = purchase.purchase_items?.length || 0;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{purchase.purchase_order_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {purchase.supplier?.name || "No supplier"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={purchase.type === "import" ? "default" : "secondary"}>
                {purchase.type === "import" ? "Import" : "Local"}
              </Badge>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              {purchase.received_inventory && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Received
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  {purchase.status === "pending" && (
                    <DropdownMenuItem onClick={() => onUpdateStatus(purchase.id, "in_transit")}>
                      <Truck className="mr-2 h-4 w-4" />
                      Mark In Transit
                    </DropdownMenuItem>
                  )}
                  {purchase.status === "in_transit" && (
                    <DropdownMenuItem onClick={() => onUpdateStatus(purchase.id, "received")}>
                      <Package className="mr-2 h-4 w-4" />
                      Mark Received
                    </DropdownMenuItem>
                  )}
                  {purchase.status !== "cancelled" && purchase.status !== "received" && (
                    <DropdownMenuItem onClick={() => onUpdateStatus(purchase.id, "cancelled")}>
                      Cancel Order
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {purchase.expected_arrival_date
                  ? format(new Date(purchase.expected_arrival_date), "MMM d, yyyy")
                  : format(new Date(purchase.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <DollarSign className="h-4 w-4" />
              <span>{purchase.total_amount?.toLocaleString() || "0"}</span>
              <span className="text-muted-foreground text-sm font-normal ml-1">
                {purchase.currency}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {purchase.purchase_order_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(purchase.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
