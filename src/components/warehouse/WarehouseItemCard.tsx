import { Box, Warehouse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WarehouseItemCardProps {
  name: string;
  quantity: number;
  category: string | null;
  subcategory: string | null;
  unitCost: number;
  warehouseName?: string;
  showWarehouse?: boolean;
}

export function WarehouseItemCard({
  name,
  quantity,
  category,
  subcategory,
  unitCost,
  warehouseName,
  showWarehouse,
}: WarehouseItemCardProps) {
  const totalValue = quantity * unitCost;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Box className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{name}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {category && (
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
              )}
              {subcategory && (
                <Badge variant="outline" className="text-xs">
                  {subcategory}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {showWarehouse && warehouseName && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Warehouse className="w-3 h-3" />
            {warehouseName}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="text-sm font-semibold text-foreground">{quantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-sm font-semibold text-primary">
              {unitCost > 0 ? `$${totalValue.toFixed(2)}` : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
