import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Star } from "lucide-react";
import type { ItemPerformanceRow, MachineSalesRow, MonthTrend } from "@/hooks/useItemAnalytics";
import { fmt2, fmtInt } from "@/lib/formatters";

interface ItemDrillDownProps {
  item: ItemPerformanceRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineRanking: MachineSalesRow[];
  trend: MonthTrend[];
}

export function ItemDrillDown({ item, open, onOpenChange, machineRanking, trend }: ItemDrillDownProps) {
  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {item.name}
            {item.isTopNotch && <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{item.sku}</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Units Sold: {fmtInt(item.unitsSold)}</Badge>
            <Badge variant="secondary">Velocity: {item.velocity.toFixed(2)}/m/d</Badge>
            <Badge variant="secondary">ROI: {item.roi.toFixed(1)}%</Badge>
            <Badge variant="secondary">Profit: ${fmt2(item.grossProfit)}</Badge>
          </div>

          {/* 3-Month Sparkline */}
          <div>
            <h4 className="text-sm font-medium mb-2">3-Month Trend</h4>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <Line
                    type="monotone"
                    dataKey="units"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              {trend.map(t => (
                <span key={t.month}>{t.month} ({fmtInt(t.units)})</span>
              ))}
            </div>
          </div>

          {/* Machine Ranking */}
          <div>
            <h4 className="text-sm font-medium mb-2">Machine Performance</h4>
            {machineRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">No machine data for this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Vel/day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineRanking.map(m => (
                    <TableRow key={m.machineId}>
                      <TableCell className="font-mono text-xs">{m.serialNumber}</TableCell>
                      <TableCell className="text-sm">{m.locationName}</TableCell>
                      <TableCell className="text-right">{fmtInt(m.unitsSold)}</TableCell>
                      <TableCell className="text-right">{m.velocity.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
