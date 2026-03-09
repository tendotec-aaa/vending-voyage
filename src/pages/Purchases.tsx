import { fmt2 } from "@/lib/formatters";
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
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

type PurchaseStatus = Database["public"]["Enums"]["purchase_status"];

const statusColors: Record<PurchaseStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/20 text-yellow-600",
  in_transit: "bg-blue-500/20 text-blue-600",
  arrived: "bg-orange-500/20 text-orange-600",
  received: "bg-green-500/20 text-green-600",
  cancelled: "bg-destructive/20 text-destructive",
};

export default function Purchases() {
  const { t } = useTranslation();
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
            <h1 className="text-3xl font-bold text-foreground">{t('purchases.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('purchases.subtitle')}</p>
          </div>
          <Button onClick={() => navigate("/purchases/new")}>
            <Plus className="mr-2 h-4 w-4" /> {t('purchases.newPurchase')}
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t('purchases.searchPO')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder={t('common.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStatuses')}</SelectItem>
                <SelectItem value="draft">{t('purchases.draft')}</SelectItem>
                <SelectItem value="pending">{t('purchases.pending')}</SelectItem>
                <SelectItem value="in_transit">{t('purchases.inTransit')}</SelectItem>
                <SelectItem value="arrived">{t('purchases.arrived')}</SelectItem>
                <SelectItem value="received">{t('purchases.received')}</SelectItem>
                <SelectItem value="cancelled">{t('purchases.cancelled')}</SelectItem>
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
            <h3 className="text-lg font-medium text-foreground mb-2">{t('purchases.noPurchases')}</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {searchQuery || statusFilter !== "all" ? t('purchases.adjustFilters') : t('purchases.createFirst')}
            </p>
            <Button onClick={() => navigate("/purchases/new")}>
              <Plus className="mr-2 h-4 w-4" /> {t('purchases.createPO')}
            </Button>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('purchases.poNumber')}</TableHead>
                  <TableHead>{t('purchases.supplier')}</TableHead>
                  <TableHead>{t('purchases.type')}</TableHead>
                  <TableHead>{t('purchases.status')}</TableHead>
                  <TableHead className="text-right">{t('purchases.items')}</TableHead>
                  <TableHead className="text-right">{t('purchases.total')}</TableHead>
                  <TableHead>{t('purchases.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => {
                  const supplier = purchase.supplier as any;
                  const items = (purchase.purchase_items || []) as any[];
                  return (
                    <TableRow key={purchase.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/purchases/${purchase.id}`)}>
                      <TableCell className="font-medium text-foreground">{purchase.purchase_order_number}</TableCell>
                      <TableCell className="text-muted-foreground">{supplier?.name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{purchase.type}</Badge></TableCell>
                      <TableCell>
                        <Badge className={statusColors[purchase.status as PurchaseStatus] || ""}>
                          {(purchase.status || "draft").replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{items.length}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">${fmt2(purchase.total_amount || 0)}</TableCell>
                      <TableCell className="text-muted-foreground">{purchase.created_at ? new Date(purchase.created_at).toLocaleDateString() : "—"}</TableCell>
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