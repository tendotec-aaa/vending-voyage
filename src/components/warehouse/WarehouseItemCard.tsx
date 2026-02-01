import { Box } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WarehouseItemCardProps {
  name: string;
  quantity: number;
  category: string | null;
  subcategory: string | null;
  unitCost: number;
}

export function WarehouseItemCard({
  name,
  quantity,
  category,
  subcategory,
  unitCost,
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

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="text-sm font-semibold text-foreground">{quantity}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unit Cost</p>
            <p className="text-sm font-semibold text-foreground">
              ${unitCost.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-sm font-semibold text-primary">
              ${totalValue.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
