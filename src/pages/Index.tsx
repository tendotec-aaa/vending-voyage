import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RecentVisits } from "@/components/dashboard/RecentVisits";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MachineIssues } from "@/components/dashboard/MachineIssues";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { LatestRoutes } from "@/components/dashboard/LatestRoutes";
import { DashboardAlerts } from "@/components/dashboard/DashboardAlerts";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { DollarSign, TrendingUp, Truck, MapPin, Calculator, AlertTriangle } from "lucide-react";

const Index = () => {
  const [issuesPeriod, setIssuesPeriod] = useState<"weekly" | "monthly">("weekly");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"weekly" | "monthly">("weekly");
  const stats = useDashboardStats(issuesPeriod, leaderboardPeriod);

  const fmtCurrency = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtPct = (pct: number) => {
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  };

  const fmtUnits = (n: number) => n.toLocaleString("en-US") + " units";

  const weekTotal = stats.chartData?.reduce((s, d) => s + d.revenue, 0) ?? 0;

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Welcome back! Here's your operations overview."
    >
      {/* Actionable Warnings */}
      <DashboardAlerts
        lowStockItems={stats.lowStockItems}
        criticalSlots={stats.criticalSlots}
        isLoadingLowStock={stats.isLoadingLowStock}
        isLoadingCriticalSlots={stats.isLoadingCriticalSlots}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard
          title="Monthly Revenue"
          value={fmtCurrency(stats.monthlyRevenue?.current ?? 0)}
          change={
            stats.monthlyRevenue
              ? `${fmtPct(stats.monthlyRevenue.pctChange)} vs last month`
              : undefined
          }
          changeType={
            stats.monthlyRevenue
              ? stats.monthlyRevenue.pctChange > 0
                ? "positive"
                : stats.monthlyRevenue.pctChange < 0
                ? "negative"
                : "neutral"
              : "neutral"
          }
          icon={DollarSign}
          iconColor="text-emerald-600"
          loading={stats.isLoadingMonthly}
        />
        <KPICard
          title="Weekly Revenue"
          value={fmtCurrency(stats.weeklyRevenue?.current ?? 0)}
          change={
            stats.weeklyRevenue
              ? `${fmtPct(stats.weeklyRevenue.pctChange)} vs last week`
              : undefined
          }
          changeType={
            stats.weeklyRevenue
              ? stats.weeklyRevenue.pctChange > 0
                ? "positive"
                : stats.weeklyRevenue.pctChange < 0
                ? "negative"
                : "neutral"
              : "neutral"
          }
          icon={TrendingUp}
          iconColor="text-primary"
          loading={stats.isLoadingWeekly}
        />
        <KPICard
          title="Active Machines"
          value={String(stats.activeMachines?.deployed ?? 0)}
          change={
            stats.activeMachines
              ? `${stats.activeMachines.total} total in fleet`
              : undefined
          }
          changeType="neutral"
          icon={Truck}
          iconColor="text-amber-600"
          loading={stats.isLoadingMachines}
        />
        <KPICard
          title="Active Spots"
          value={String(stats.activeSpots?.active ?? 0)}
          change={
            stats.activeSpots
              ? `${stats.activeSpots.totalLocations} locations`
              : undefined
          }
          changeType="neutral"
          icon={MapPin}
          iconColor="text-violet-600"
          loading={stats.isLoadingSpots}
        />
        <KPICard
          title="ARPM"
          value={fmtCurrency(stats.arpm)}
          change={`${fmtPct(stats.arpmPctChange)} vs last month`}
          changeType={
            stats.arpmPctChange > 0
              ? "positive"
              : stats.arpmPctChange < 0
              ? "negative"
              : "neutral"
          }
          icon={Calculator}
          iconColor="text-primary"
          loading={stats.isLoadingMonthly || stats.isLoadingMachines}
        />
        <KPICard
          title="Stockout Risk"
          value={String(stats.stockoutRiskCount)}
          change="slots below 5 units"
          changeType={stats.stockoutRiskCount > 0 ? "negative" : "neutral"}
          icon={AlertTriangle}
          iconColor="text-destructive"
          loading={stats.isLoadingCriticalSlots}
        />
      </div>

      {/* Revenue Chart + Machine Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RevenueChart
            data={stats.chartData}
            weekTotal={weekTotal}
            isLoading={stats.isLoadingChart}
          />
        </div>
        <div>
          <MachineIssues
            openTickets={stats.machineIssues?.openTickets ?? []}
            completedTickets={stats.machineIssues?.completedTickets ?? []}
            isLoading={stats.isLoadingIssues}
            period={issuesPeriod}
            onPeriodChange={setIssuesPeriod}
          />
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Leaderboard
          title="Top Spots ($$)"
          items={stats.topSpots}
          formatValue={fmtCurrency}
          isLoading={stats.isLoadingTopSpots}
          period={leaderboardPeriod}
          onPeriodChange={setLeaderboardPeriod}
        />
        <Leaderboard
          title="Top Items (Volume)"
          items={stats.topItems}
          formatValue={fmtUnits}
          isLoading={stats.isLoadingTopItems}
          period={leaderboardPeriod}
          onPeriodChange={setLeaderboardPeriod}
        />
      </div>

      {/* Secondary Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentVisits
            visits={stats.recentVisits as any}
            isLoading={stats.isLoadingVisits}
          />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <LatestRoutes />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
