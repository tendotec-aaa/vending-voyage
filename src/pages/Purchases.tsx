import { Plus, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { usePurchases } from "@/hooks/usePurchases";
import { PurchaseCard } from "@/components/purchases/PurchaseCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Purchases() {
  const navigate = useNavigate();
  const { purchases, isLoading, updateStatus, deletePurchase } = usePurchases();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Purchase History</h1>
            <p className="text-muted-foreground mt-1">
              Manage your purchase orders and track deliveries
            </p>
          </div>
          <Button onClick={() => navigate("/purchases/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No purchases yet
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Create your first purchase order to start tracking your inventory procurement.
            </p>
            <Button onClick={() => navigate("/purchases/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Purchase Order
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map((purchase) => (
              <PurchaseCard
                key={purchase.id}
                purchase={purchase}
                onUpdateStatus={(id, status) => updateStatus({ id, status })}
                onDelete={deletePurchase}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
