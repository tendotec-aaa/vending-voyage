import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { SpotHealthRow, SetupMachine, TrendPoint } from "@/hooks/useSpotHealth";
import { fmt2 } from "@/lib/formatters";

interface SpotDrillDownProps {
  spot: SpotHealthRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machines: SetupMachine[];
  trend: TrendPoint[];
}

export function SpotDrillDown({ spot, open, onOpenChange, machines, trend }: SpotDrillDownProps) {
  if (!spot) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{spot.spotName}</SheetTitle>
          <p className="text-sm text-muted-foreground">{spot.locationName}</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* P&L Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Monthly P&L</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Revenue</span>
                <span className="font-mono">${fmt2(spot.grossRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rent Cost</span>
                <span className="font-mono text-destructive">-${fmt2(spot.rentCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Depreciation</span>
                <span className="font-mono text-destructive">-${fmt2(spot.depreciation)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Net Profit</span>
                <span className={`font-mono ${spot.netProfit < 0 ? "text-destructive" : ""}`}>
                  ${fmt2(spot.netProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Active Setup */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Active Setup ({machines.length} machines)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {machines.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No machines deployed.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Dep/mo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map(m => (
                      <TableRow key={m.machineId}>
                        <TableCell className="font-mono text-xs">{m.serial}</TableCell>
                        <TableCell className="text-sm">{m.modelName}</TableCell>
                        <TableCell className="text-right font-mono text-sm">${fmt2(m.depreciationPerMonth)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 3-Month Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">3-Month Net Profit Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {trend.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      formatter={(value: number) => [`$${fmt2(value)}`, "Net Profit"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
                      {trend.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.netProfit >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
