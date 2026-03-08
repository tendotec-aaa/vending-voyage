import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronDown, Package, Cpu } from "lucide-react";
import { useState } from "react";

interface LowStockItem {
  itemName: string;
  sku: string;
  warehouseName: string;
  quantity: number;
}

interface CriticalSlot {
  machineSerial: string;
  locationName: string;
  slotNumber: number;
  currentStock: number;
}

interface DashboardAlertsProps {
  lowStockItems: LowStockItem[];
  criticalSlots: CriticalSlot[];
  isLoadingLowStock?: boolean;
  isLoadingCriticalSlots?: boolean;
}

export function DashboardAlerts({
  lowStockItems,
  criticalSlots,
  isLoadingLowStock,
  isLoadingCriticalSlots,
}: DashboardAlertsProps) {
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [criticalOpen, setCriticalOpen] = useState(false);

  if (isLoadingLowStock || isLoadingCriticalSlots) {
    return (
      <div className="space-y-3 mb-6">
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (lowStockItems.length === 0 && criticalSlots.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {criticalSlots.length > 0 && (
        <Collapsible open={criticalOpen} onOpenChange={setCriticalOpen}>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <Cpu className="h-4 w-4" />
                <span>{criticalSlots.length} Critical Machine Slot{criticalSlots.length > 1 ? "s" : ""} — Stock ≤ 5 units</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${criticalOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
            </AlertTitle>
            <CollapsibleContent>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  {criticalSlots.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-destructive/20 last:border-0">
                      <span>{s.machineSerial} — Slot {s.slotNumber} @ {s.locationName || "Unknown"}</span>
                      <span className="font-semibold">{s.currentStock} units</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </CollapsibleContent>
          </Alert>
        </Collapsible>
      )}

      {lowStockItems.length > 0 && (
        <Collapsible open={lowStockOpen} onOpenChange={setLowStockOpen}>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <Package className="h-4 w-4" />
                <span>{lowStockItems.length} Warehouse Item{lowStockItems.length > 1 ? "s" : ""} Below 100 Units</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${lowStockOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
            </AlertTitle>
            <CollapsibleContent>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  {lowStockItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                      <span>{item.itemName} <span className="text-muted-foreground">({item.sku})</span> — {item.warehouseName}</span>
                      <span className="font-semibold">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </CollapsibleContent>
          </Alert>
        </Collapsible>
      )}
    </div>
  );
}
