import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { useSpotAnalytics, useLocationsForFilter, DateRangeOption } from "@/hooks/useSpotAnalytics";
import { SpotLeaderboard } from "@/components/spots/SpotLeaderboard";
import { SpotTrends } from "@/components/spots/SpotTrends";
import { SpotAlerts } from "@/components/spots/SpotAlerts";
import { Skeleton } from "@/components/ui/skeleton";

type ProfitabilityFilter = "all" | "profitable" | "loss";
type StockFilter = "all" | "low" | "healthy";

const dateRangeLabels: Record<DateRangeOption, string> = {
  "30d": "Last 30 Days",
  "3m": "Last 3 Months",
  "6m": "Last 6 Months",
  "1y": "Last Year",
  "all": "All Time",
};

export default function Spots() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("all");
  const { data: spots, isLoading } = useSpotAnalytics(dateRange);
  const { data: locations } = useLocationsForFilter();
  
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [profitabilityFilter, setProfitabilityFilter] = useState<ProfitabilityFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const filteredSpots = useMemo(() => {
    if (!spots) return [];
    
    return spots.filter((spot) => {
      if (locationFilter !== "all" && spot.locationId !== locationFilter) return false;
      if (profitabilityFilter === "profitable" && spot.netProfit < 0) return false;
      if (profitabilityFilter === "loss" && spot.netProfit >= 0) return false;
      if (stockFilter === "low" && spot.stockPercentage >= 25) return false;
      if (stockFilter === "healthy" && spot.stockPercentage < 25) return false;
      return true;
    });
  }, [spots, locationFilter, profitabilityFilter, stockFilter]);

  const exportToCSV = () => {
    if (!filteredSpots.length) return;
    
    const headers = ["Rank", "Spot Name", "Location", "Total Sales", "Total Rent", "Net Profit", "ROI %", "Stock %", "Days Open", "Visits", "Trend"];
    const sortedSpots = [...filteredSpots].sort((a, b) => b.netProfit - a.netProfit);
    
    const rows = sortedSpots.map((spot, idx) => [
      idx + 1,
      spot.name,
      spot.locationName,
      spot.totalSales,
      spot.totalAccruedRent.toFixed(2),
      spot.netProfit.toFixed(2),
      spot.roi.toFixed(1),
      spot.stockPercentage.toFixed(1),
      spot.daysActive,
      spot.visitCount,
      spot.trend,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spots-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Count alerts for tab badge
  const alertCount = useMemo(() => {
    if (!spots) return 0;
    const lowStock = spots.filter((s) => s.stockPercentage < 25 && s.totalCapacity > 0).length;
    const unprofitable = spots.filter((s) => s.roi < 0).length;
    const maintenance = spots.filter((s) => s.openTickets > 0).length;
    return lowStock + unprofitable + maintenance;
  }, [spots]);

  if (isLoading) {
    return (
      <AppLayout title="Spots Analytics" subtitle="Loading spot performance data...">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Spots Analytics"
      subtitle="Monitor spot performance, trends, and alerts"
      actions={
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      }
    >
      {/* Quick Filters */}
      <Card className="p-4 mb-6 bg-card border-border">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(dateRangeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={profitabilityFilter} onValueChange={(v) => setProfitabilityFilter(v as ProfitabilityFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Profitability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Spots</SelectItem>
              <SelectItem value="profitable">Profitable</SelectItem>
              <SelectItem value="loss">Loss</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Stock Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="healthy">Healthy Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="leaderboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2 relative">
            <AlertTriangle className="w-4 h-4" />
            Alerts
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <SpotLeaderboard spots={filteredSpots} />
        </TabsContent>

        <TabsContent value="trends">
          <SpotTrends spots={filteredSpots} />
        </TabsContent>

        <TabsContent value="alerts">
          <SpotAlerts spots={filteredSpots} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
