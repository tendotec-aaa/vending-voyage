import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, Filter, Package, AlertTriangle } from "lucide-react";

const inventory = [
  {
    id: "TOY-001",
    name: "Plush Bear Collection",
    category: "Plush Toys",
    warehouse: 245,
    inMachines: 128,
    total: 373,
    minStock: 100,
    costPerUnit: "$2.45",
    sellPrice: "$3.00",
  },
  {
    id: "TOY-002",
    name: "Capsule Figures Series A",
    category: "Figurines",
    warehouse: 89,
    inMachines: 234,
    total: 323,
    minStock: 150,
    costPerUnit: "$1.80",
    sellPrice: "$2.50",
  },
  {
    id: "TOY-003",
    name: "Keychain Buddies",
    category: "Keychains",
    warehouse: 42,
    inMachines: 56,
    total: 98,
    minStock: 100,
    costPerUnit: "$0.95",
    sellPrice: "$1.50",
  },
  {
    id: "TOY-004",
    name: "Mini Vehicles Pack",
    category: "Vehicles",
    warehouse: 312,
    inMachines: 187,
    total: 499,
    minStock: 200,
    costPerUnit: "$3.20",
    sellPrice: "$4.00",
  },
  {
    id: "TOY-005",
    name: "Bouncy Balls Premium",
    category: "Balls",
    warehouse: 567,
    inMachines: 423,
    total: 990,
    minStock: 300,
    costPerUnit: "$0.45",
    sellPrice: "$1.00",
  },
  {
    id: "TOY-006",
    name: "Sticker Packs Deluxe",
    category: "Stickers",
    warehouse: 23,
    inMachines: 67,
    total: 90,
    minStock: 150,
    costPerUnit: "$0.30",
    sellPrice: "$0.75",
  },
];

export default function InventoryPage() {
  const getStockStatus = (total: number, minStock: number) => {
    const ratio = total / minStock;
    if (ratio < 0.7) return { status: "critical", label: "Critical", variant: "destructive" as const };
    if (ratio < 1) return { status: "low", label: "Low Stock", variant: "secondary" as const };
    return { status: "healthy", label: "Healthy", variant: "default" as const };
  };

  return (
    <AppLayout
      title="Inventory"
      subtitle="Track product stock across warehouses and machines"
      actions={
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Package className="w-4 h-4" />
            Receive Stock
          </Button>
          <Button className="gap-2">
            Transfer Stock
          </Button>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Total SKUs</p>
          <p className="text-2xl font-bold text-foreground">48</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Warehouse Stock</p>
          <p className="text-2xl font-bold text-foreground">1,278</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">In Machines</p>
          <p className="text-2xl font-bold text-foreground">1,095</p>
        </Card>
        <Card className="p-4 bg-card border-border flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
            <p className="text-2xl font-bold text-destructive">3</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 bg-card border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-10 bg-background"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">SKU</TableHead>
              <TableHead className="text-muted-foreground">Product Name</TableHead>
              <TableHead className="text-muted-foreground">Category</TableHead>
              <TableHead className="text-muted-foreground text-right">Warehouse</TableHead>
              <TableHead className="text-muted-foreground text-right">In Machines</TableHead>
              <TableHead className="text-muted-foreground">Stock Level</TableHead>
              <TableHead className="text-muted-foreground text-right">Cost</TableHead>
              <TableHead className="text-muted-foreground text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => {
              const stockStatus = getStockStatus(item.total, item.minStock);
              const stockPercentage = Math.min((item.total / item.minStock) * 100, 100);
              
              return (
                <TableRow key={item.id} className="border-border hover:bg-muted/50">
                  <TableCell className="font-mono text-sm text-primary">{item.id}</TableCell>
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="text-right text-foreground">{item.warehouse}</TableCell>
                  <TableCell className="text-right text-foreground">{item.inMachines}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[150px]">
                      <Progress 
                        value={stockPercentage} 
                        className="flex-1 h-2"
                      />
                      <Badge variant={stockStatus.variant} className="text-xs">
                        {stockStatus.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.costPerUnit}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">{item.sellPrice}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
