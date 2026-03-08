import { fmt2 } from "@/lib/formatters";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, DollarSign, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSales } from "@/hooks/useSales";
import { Skeleton } from "@/components/ui/skeleton";

export default function Sales() {
  const navigate = useNavigate();
  const { sales, isLoading } = useSales();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSales = useMemo(() => {
    return sales.filter((s: any) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.sale_number?.toLowerCase().includes(q) ||
        s.buyer_name?.toLowerCase().includes(q)
      );
    });
  }, [sales, searchQuery]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales</h1>
            <p className="text-muted-foreground mt-1">Warehouse sales orders and transactions</p>
          </div>
          <Button onClick={() => navigate("/sales/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Sale
          </Button>
        </div>

        <Card className="p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by sale number or buyer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No sales found</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {searchQuery ? "Try adjusting your search." : "Create your first sales order."}
            </p>
            <Button onClick={() => navigate("/sales/new")}>
              <Plus className="mr-2 h-4 w-4" /> Create Sale
            </Button>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale: any) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">{sale.sale_number}</TableCell>
                    <TableCell className="text-muted-foreground">{sale.buyer_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(sale.sale_items || []).length}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      ${fmt2(sale.total_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sale.paid ? "default" : "outline"}>
                        {sale.paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
