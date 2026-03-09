import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useWarehouseInventory } from '@/hooks/useWarehouseInventory';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Package, Search } from 'lucide-react';

const OperatorInventory = () => {
  const [search, setSearch] = useState('');
  const { inventory, isLoading } = useWarehouseInventory();

  // Consolidate by item_detail_id across all warehouses
  const consolidated = new Map<string, {
    name: string;
    category: string;
    totalQty: number;
  }>();

  inventory.forEach((inv) => {
    const id = inv.item_detail_id;
    const existing = consolidated.get(id);
    const qty = inv.quantity_on_hand ?? 0;
    if (existing) {
      existing.totalQty += qty;
    } else {
      consolidated.set(id, {
        name: inv.item_detail?.name ?? 'Unknown',
        category: inv.item_detail?.category?.name ?? '—',
        totalQty: qty,
      });
    }
  });

  const items = Array.from(consolidated.entries())
    .map(([id, data]) => ({ id, ...data }))
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AppLayout title="Field Inventory" subtitle="Available stock across all warehouses.">
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="bg-card border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No inventory items found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Warehouse Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isLow = item.totalQty <= 0;
                return (
                  <TableRow key={item.id} className={isLow ? 'bg-destructive/10' : ''}>
                    <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category}</TableCell>
                    <TableCell className="text-right">
                      {isLow ? (
                        <Badge variant="destructive">{item.totalQty}</Badge>
                      ) : (
                        <span className="text-foreground font-medium">{item.totalQty}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
};

export default OperatorInventory;
