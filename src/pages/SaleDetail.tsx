import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaleDetail } from "@/hooks/useSales";
import { fmt2 } from "@/lib/formatters";

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading } = useSaleDetail(id || "");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
        </div>
      </AppLayout>
    );
  }

  if (!sale) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h2 className="text-xl font-medium text-foreground">Sale not found</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/sales")}>
            Back to Sales
          </Button>
        </div>
      </AppLayout>
    );
  }

  const warehouse = sale.warehouses as any;
  const items = (sale.sale_items || []) as any[];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{sale.sale_number}</h1>
            <p className="text-muted-foreground mt-1">
              {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : ""}
            </p>
          </div>
          <Badge variant={sale.paid ? "default" : "outline"} className="text-sm">
            {sale.paid ? "Paid" : "Unpaid"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Buyer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-foreground">{sale.buyer_name || "—"}</p>
              <p className="text-sm text-muted-foreground">{sale.buyer_contact || ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-foreground">{warehouse?.name || "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {sale.currency} ${fmt2(sale.total_amount || 0)}
              </p>
              {sale.tax_rate > 0 && (
                <p className="text-sm text-muted-foreground">
                  Tax: {sale.tax_rate}% (${fmt2(sale.tax_amount || 0)})
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {sale.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{sale.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => {
                  const detail = item.item_details;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-foreground">{detail?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{detail?.sku || "—"}</TableCell>
                      <TableCell className="text-right text-foreground">{item.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">${fmt2(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">${fmt2(item.total_price)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
