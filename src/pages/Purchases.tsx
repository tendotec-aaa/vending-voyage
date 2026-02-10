import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePurchases } from "@/hooks/usePurchases";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type PurchaseStatus = Database["public"]["Enums"]["purchase_status"];

const statusColors: Record<PurchaseStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/20 text-yellow-600",
  in_transit: "bg-blue-500/20 text-blue-600",
  received: "bg-green-500/20 text-green-600",
  cancelled: "bg-destructive/20 text-destructive",
};

export default function Purchases() {
  const navigate = useNavigate();
  const { purchases, isLoading } = usePurchases();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesSearch = !searchQuery.trim() ||
        p.purchase_order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.supplier as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchases, searchQuery, statusFilter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Purchase History</h1>
            <p className="text-muted-foreground mt-1">Manage your purchase orders and track deliveries</p>
          </div>
          <Button onClick={() => navigate("/purchases/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Purchase
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by PO number or supplier..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No purchases found</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your filters." : "Create your first purchase order."}
            </p>
            <Button onClick={() => navigate("/purchases/new")}>
              <Plus className="mr-2 h-4 w-4" /> Create Purchase Order
            </Button>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => {
                  const supplier = purchase.supplier as any;
                  const items = (purchase.purchase_items || []) as any[];
                  return (
                    <TableRow
                      key={purchase.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/purchases/${purchase.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">{purchase.purchase_order_number}</TableCell>
                      <TableCell className="text-muted-foreground">{supplier?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{purchase.type}</Badge></TableCell>
                      <TableCell>
                        <Badge className={statusColors[purchase.status as PurchaseStatus] || ""}>
                          {(purchase.status || "draft").replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{items.length}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        ${(purchase.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {purchase.created_at ? new Date(purchase.created_at).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
