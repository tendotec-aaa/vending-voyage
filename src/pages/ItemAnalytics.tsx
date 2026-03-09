import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ArrowUpDown, Package } from "lucide-react";
import { useItemAnalytics, type ItemPerformanceRow } from "@/hooks/useItemAnalytics";
import { useItemTypes } from "@/hooks/useItemTypes";
import { ItemDrillDown } from "@/components/insights/ItemDrillDown";
import { fmt2, fmtInt } from "@/lib/formatters";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type SortKey = "velocity" | "unitsSold" | "roi" | "grossProfit" | "stockCover";

export default function ItemAnalytics() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [sortKey, setSortKey] = useState<SortKey>("velocity");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemPerformanceRow | null>(null);

  const selectedTypeId = searchParams.get("type") || "all";

  const { data, isLoading } = useItemAnalytics(year, month);
  const { itemTypes } = useItemTypes();
  const rows = data?.rows || [];

  // Filter item types to only sellable or component
  const filterableTypes = useMemo(
    () => itemTypes.filter(t => t.is_sellable || t.is_component),
    [itemTypes]
  );

  // Filter rows by selected type, then compute Top Notch on filtered set
  const filtered = useMemo(() => {
    let result = selectedTypeId === "all"
      ? [...rows]
      : rows.filter(r => r.itemTypeId === selectedTypeId);

    // Compute Top Notch relative to filtered list
    const velocities = result.filter(r => r.velocity > 0).map(r => r.velocity).sort((a, b) => a - b);
    const p80Index = Math.floor(velocities.length * 0.8);
    const velocityP80 = velocities[p80Index] || Infinity;
    for (const r of result) {
      r.isTopNotch = r.roi > 300 && r.velocity >= velocityP80 && r.velocity > 0;
    }

    return result;
  }, [rows, selectedTypeId]);

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

  const handleTypeChange = (value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === "all") next.delete("type");
      else next.set("type", value);
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

  const stockCoverClass = (days: number) => {
    if (days < 5) return "bg-destructive/20 text-destructive";
    if (days < 15) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Item Performance</h1>
            <p className="text-muted-foreground text-sm">Sellable product leaderboard by sales velocity</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedTypeId} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Item Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sellable</SelectItem>
                {filterableTypes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Performance Leaderboard
              <Badge variant="outline" className="ml-auto">{filtered.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : sorted.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No sellable items found or no sales data for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Item</TableHead>
                      <SortHeader label="Sold" k="unitsSold" />
                      <SortHeader label="Velocity" k="velocity" />
                      <SortHeader label="ROI %" k="roi" />
                      <SortHeader label="Gross Profit" k="grossProfit" />
                      <SortHeader label="Stock Cover" k="stockCover" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map(row => (
                      <TableRow
                        key={row.itemId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedItem(row)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {row.isTopNotch && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 shrink-0" />}
                            <div>
                              <p className="font-medium text-sm">{row.name}</p>
                              <p className="text-xs text-muted-foreground">{row.sku}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{fmtInt(row.unitsSold)}</TableCell>
                        <TableCell className="text-right font-mono">{row.velocity.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.roi.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">${fmt2(row.grossProfit)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${stockCoverClass(row.stockCover)}`}>
                            {row.stockCover >= 999 ? "∞" : `${Math.round(row.stockCover)}d`}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drill-down */}
        <ItemDrillDown
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={open => { if (!open) setSelectedItem(null); }}
          machineRanking={selectedItem && data ? data.getMachineRanking(selectedItem.itemId) : []}
          trend={selectedItem && data ? data.getTrend(selectedItem.itemId) : []}
        />
      </div>
    </AppLayout>
  );
}
