import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, Target } from "lucide-react";
import { useSpotHealth, type SpotHealthRow } from "@/hooks/useSpotHealth";
import { SpotDrillDown } from "@/components/insights/SpotDrillDown";
import { fmt2 } from "@/lib/formatters";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type SortKey = "netProfit" | "grossRevenue" | "rentCost" | "depreciation" | "netMargin";

const badgeConfig = {
  prime: { label: "🟢 Prime Real Estate", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
  renegotiate: { label: "🟡 Renegotiate", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
  relocate: { label: "🔴 Relocate", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" },
};

export default function SpotHealth() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sortKey, setSortKey] = useState<SortKey>("netProfit");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<SpotHealthRow | null>(null);

  const selectedLocationId = searchParams.get("location") || "all";

  const { data, isLoading } = useSpotHealth(year, month);
  const rows = data?.rows || [];
  const locations = data?.locations || [];

  const filtered = useMemo(() => {
    if (selectedLocationId === "all") return rows;
    return rows.filter(r => r.locationId === selectedLocationId);
  }, [rows, selectedLocationId]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? diff : -diff;
    });
    return copy;
  }, [filtered, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleLocationChange = (value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === "all") next.delete("location");
      else next.set("location", value);
      return next;
    });
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none text-right"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </span>
    </TableHead>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Spot Health</h1>
            <p className="text-muted-foreground text-sm">Micro-P&L per spot — revenue, rent, depreciation, net profit</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedLocationId} onValueChange={handleLocationChange}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[now.getFullYear(), now.getFullYear() - 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Spot Profitability Leaderboard
              <Badge variant="outline" className="ml-auto">{filtered.length} spots</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : sorted.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No active spots found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Spot</TableHead>
                      <SortHeader label="Revenue" k="grossRevenue" />
                      <SortHeader label="Rent" k="rentCost" />
                      <SortHeader label="Depreciation" k="depreciation" />
                      <SortHeader label="Net Profit" k="netProfit" />
                      <SortHeader label="Margin %" k="netMargin" />
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map(row => (
                      <TableRow
                        key={row.spotId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedSpot(row)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{row.spotName}</p>
                            <p className="text-xs text-muted-foreground">{row.locationName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">${fmt2(row.grossRevenue)}</TableCell>
                        <TableCell className="text-right font-mono">${fmt2(row.rentCost)}</TableCell>
                        <TableCell className="text-right font-mono">${fmt2(row.depreciation)}</TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${row.netProfit < 0 ? "text-destructive" : ""}`}>
                          ${fmt2(row.netProfit)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.grossRevenue > 0 ? `${row.netMargin.toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.badge ? (
                            <Badge variant="outline" className={badgeConfig[row.badge].className}>
                              {badgeConfig[row.badge].label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Normal</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {data && (
          <SpotDrillDown
            spot={selectedSpot}
            open={!!selectedSpot}
            onOpenChange={open => { if (!open) setSelectedSpot(null); }}
            machines={selectedSpot ? data.getSetupDetails(selectedSpot.spotId) : []}
            trend={selectedSpot ? data.getTrend(selectedSpot.spotId) : []}
          />
        )}
      </div>
    </AppLayout>
  );
}
