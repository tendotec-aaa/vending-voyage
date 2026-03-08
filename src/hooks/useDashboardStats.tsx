import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  min,
  endOfMonth,
  format,
  addDays,
  differenceInCalendarDays,
} from "date-fns";

const TZ_OFFSET_HOURS = 5;

function nowLocal(): Date {
  const utcNow = new Date();
  return new Date(utcNow.getTime() - TZ_OFFSET_HOURS * 60 * 60 * 1000);
}

function toISOStringUTC5(localDate: Date): string {
  const real = new Date(localDate.getTime() + TZ_OFFSET_HOURS * 60 * 60 * 1000);
  return real.toISOString();
}

function getMonthBounds() {
  const local = nowLocal();
  const currentMonthStart = startOfMonth(local);
  const currentEnd = local;
  const dayOfMonth = local.getDate();
  const prevMonthStart = startOfMonth(subMonths(local, 1));
  const prevMonthLastDay = endOfMonth(subMonths(local, 1));
  const prevEnd = min([addDays(prevMonthStart, dayOfMonth - 1), prevMonthLastDay]);

  return {
    currentStart: toISOStringUTC5(currentMonthStart),
    currentEnd: toISOStringUTC5(currentEnd),
    prevStart: toISOStringUTC5(prevMonthStart),
    prevEnd: toISOStringUTC5(addDays(prevEnd, 1)),
  };
}

function getWeekBounds() {
  const local = nowLocal();
  const currentWeekStart = startOfWeek(local, { weekStartsOn: 1 });
  const currentEnd = local;
  const daysSinceMonday = differenceInCalendarDays(local, currentWeekStart);
  const prevWeekStart = subWeeks(currentWeekStart, 1);
  const prevEnd = addDays(prevWeekStart, daysSinceMonday + 1);
  const weekChartEnd = addDays(currentWeekStart, 7);

  return {
    currentStart: toISOStringUTC5(currentWeekStart),
    currentEnd: toISOStringUTC5(currentEnd),
    prevStart: toISOStringUTC5(prevWeekStart),
    prevEnd: toISOStringUTC5(prevEnd),
    chartStart: toISOStringUTC5(currentWeekStart),
    chartEnd: toISOStringUTC5(weekChartEnd),
    weekStartDate: currentWeekStart,
  };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

async function fetchRevenue(start: string, end: string) {
  const [visitsRes, salesRes] = await Promise.all([
    supabase
      .from("spot_visits")
      .select("total_cash_collected")
      .gte("visit_date", start)
      .lt("visit_date", end),
    supabase
      .from("sales")
      .select("total_amount")
      .gte("sale_date", start.slice(0, 10))
      .lte("sale_date", end.slice(0, 10)),
  ]);
  if (visitsRes.error) throw visitsRes.error;
  if (salesRes.error) throw salesRes.error;

  const visitSum = (visitsRes.data || []).reduce((s, v) => s + (Number(v.total_cash_collected) || 0), 0);
  const saleSum = (salesRes.data || []).reduce((s, v) => s + (Number(v.total_amount) || 0), 0);
  return visitSum + saleSum;
}

export function useDashboardStats(
  issuesPeriod: "weekly" | "monthly" = "weekly",
  leaderboardPeriod: "weekly" | "monthly" = "weekly"
) {
  const monthBounds = getMonthBounds();
  const weekBounds = getWeekBounds();

  const monthlyRevenue = useQuery({
    queryKey: ["dashboard-monthly-revenue"],
    queryFn: async () => {
      const [current, previous] = await Promise.all([
        fetchRevenue(monthBounds.currentStart, monthBounds.currentEnd),
        fetchRevenue(monthBounds.prevStart, monthBounds.prevEnd),
      ]);
      return { current, previous, pctChange: pctChange(current, previous) };
    },
  });

  const weeklyRevenue = useQuery({
    queryKey: ["dashboard-weekly-revenue"],
    queryFn: async () => {
      const [current, previous] = await Promise.all([
        fetchRevenue(weekBounds.currentStart, weekBounds.currentEnd),
        fetchRevenue(weekBounds.prevStart, weekBounds.prevEnd),
      ]);
      return { current, previous, pctChange: pctChange(current, previous) };
    },
  });

  const chartData = useQuery({
    queryKey: ["dashboard-chart-data"],
    queryFn: async () => {
      const [visitsRes, salesRes] = await Promise.all([
        supabase
          .from("spot_visits")
          .select("visit_date, total_cash_collected")
          .gte("visit_date", weekBounds.chartStart)
          .lt("visit_date", weekBounds.chartEnd),
        supabase
          .from("sales")
          .select("sale_date, total_amount")
          .gte("sale_date", weekBounds.chartStart.slice(0, 10))
          .lte("sale_date", weekBounds.chartEnd.slice(0, 10)),
      ]);
      if (visitsRes.error) throw visitsRes.error;
      if (salesRes.error) throw salesRes.error;

      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const buckets: Record<string, number> = {};
      dayNames.forEach((d) => (buckets[d] = 0));

      for (const v of visitsRes.data || []) {
        const d = new Date(v.visit_date!);
        const shifted = new Date(d.getTime() - TZ_OFFSET_HOURS * 60 * 60 * 1000);
        const dayIdx = (shifted.getDay() + 6) % 7;
        buckets[dayNames[dayIdx]] += Number(v.total_cash_collected) || 0;
      }
      for (const s of salesRes.data || []) {
        const d = new Date(s.sale_date + "T12:00:00Z");
        const dayIdx = (d.getDay() + 6) % 7;
        buckets[dayNames[dayIdx]] += Number(s.total_amount) || 0;
      }

      return dayNames.map((name) => ({ name, revenue: buckets[name] }));
    },
  });

  const activeMachines = useQuery({
    queryKey: ["dashboard-active-machines"],
    queryFn: async () => {
      const [deployedRes, totalRes] = await Promise.all([
        supabase.from("machines").select("id", { count: "exact", head: true }).eq("status", "deployed"),
        supabase.from("machines").select("id", { count: "exact", head: true }),
      ]);
      if (deployedRes.error) throw deployedRes.error;
      if (totalRes.error) throw totalRes.error;
      return { deployed: deployedRes.count || 0, total: totalRes.count || 0 };
    },
  });

  const activeSpots = useQuery({
    queryKey: ["dashboard-active-spots"],
    queryFn: async () => {
      const [activeRes, totalLocationsRes] = await Promise.all([
        supabase.from("spots").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("locations").select("id", { count: "exact", head: true }),
      ]);
      if (activeRes.error) throw activeRes.error;
      if (totalLocationsRes.error) throw totalLocationsRes.error;
      return { active: activeRes.count || 0, totalLocations: totalLocationsRes.count || 0 };
    },
  });

  const recentVisits = useQuery({
    queryKey: ["dashboard-recent-visits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spot_visits")
        .select(`
          id, visit_date, total_cash_collected, status,
          spot:spots(name, location:locations(name)),
          operator:user_profiles(first_names, last_names)
        `)
        .order("visit_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const machineIssues = useQuery({
    queryKey: ["dashboard-machine-issues", issuesPeriod],
    queryFn: async () => {
      const openRes = await supabase
        .from("maintenance_tickets")
        .select(`
          id, created_at, issue_type, status, priority, description,
          location:locations(name),
          machine:machines(serial_number)
        `)
        .neq("status", "completed")
        .order("created_at", { ascending: false });
      if (openRes.error) throw openRes.error;

      const periodStart =
        issuesPeriod === "weekly" ? weekBounds.currentStart : monthBounds.currentStart;

      const completedRes = await supabase
        .from("maintenance_tickets")
        .select(`
          id, created_at, issue_type, status, priority, resolved_at, description,
          location:locations(name),
          machine:machines(serial_number)
        `)
        .eq("status", "completed")
        .gte("resolved_at", periodStart)
        .order("resolved_at", { ascending: false })
        .limit(10);
      if (completedRes.error) throw completedRes.error;

      const openTickets = (openRes.data || []).map((t) => ({ ...t, _pinned: true }));
      const completedTickets = (completedRes.data || []).map((t) => ({ ...t, _pinned: false }));
      return { openTickets, completedTickets };
    },
  });

  const lowStockItems = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("quantity_on_hand, item_detail:item_details(name, sku), warehouse:warehouses(name)")
        .not("warehouse_id", "is", null)
        .lt("quantity_on_hand", 4000)
        .neq("quantity_on_hand", 0);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        itemName: row.item_detail?.name ?? "Unknown",
        sku: row.item_detail?.sku ?? "",
        warehouseName: row.warehouse?.name ?? "Unknown",
        quantity: row.quantity_on_hand ?? 0,
      }));
    },
  });

  const criticalSlots = useQuery({
    queryKey: ["dashboard-critical-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_slots")
        .select("slot_number, current_stock, machine:machines(serial_number, status, setup:setups(spot:spots(location:locations(name))))")
        .lte("current_stock", 5);
      if (error) throw error;

      // Client-side filter for deployed machines only
      return (data || [])
        .filter((row: any) => row.machine?.status === "deployed" && row.machine?.setup?.spot != null)
        .map((row: any) => {
          const locationName =
            row.machine?.setup?.spot?.location?.name ?? "Unknown";
          return {
            machineSerial: row.machine?.serial_number ?? "Unknown",
            locationName,
            slotNumber: row.slot_number,
            currentStock: row.current_stock ?? 0,
          };
        });
    },
  });

  // Leaderboard bounds
  const lbBounds =
    leaderboardPeriod === "weekly"
      ? {
          start: weekBounds.currentStart,
          end: weekBounds.currentEnd,
          prevStart: weekBounds.prevStart,
          prevEnd: weekBounds.prevEnd,
        }
      : {
          start: monthBounds.currentStart,
          end: monthBounds.currentEnd,
          prevStart: monthBounds.prevStart,
          prevEnd: monthBounds.prevEnd,
        };

  const topSpots = useQuery({
    queryKey: ["dashboard-top-spots", leaderboardPeriod],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_spots_revenue", {
        p_start: lbBounds.start,
        p_end: lbBounds.end,
        p_prev_start: lbBounds.prevStart,
        p_prev_end: lbBounds.prevEnd,
      });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        name: r.spot_name,
        value: Number(r.current_revenue) || 0,
        pctChange: pctChange(Number(r.current_revenue) || 0, Number(r.prev_revenue) || 0),
      }));
    },
  });

  const topItems = useQuery({
    queryKey: ["dashboard-top-items", leaderboardPeriod],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_items_volume", {
        p_start: lbBounds.start,
        p_end: lbBounds.end,
        p_prev_start: lbBounds.prevStart,
        p_prev_end: lbBounds.prevEnd,
      });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        name: r.item_name,
        value: Number(r.current_volume) || 0,
        pctChange: pctChange(Number(r.current_volume) || 0, Number(r.prev_volume) || 0),
      }));
    },
  });

  // Derived metrics
  const arpm =
    (monthlyRevenue.data?.current ?? 0) / (activeMachines.data?.deployed || 1);

  const prevArpm =
    (monthlyRevenue.data?.previous ?? 0) / (activeMachines.data?.deployed || 1);

  const arpmPctChange = pctChange(arpm, prevArpm);

  const stockoutRiskCount = criticalSlots.data?.length ?? 0;

  return {
    monthlyRevenue: monthlyRevenue.data,
    weeklyRevenue: weeklyRevenue.data,
    chartData: chartData.data,
    activeMachines: activeMachines.data,
    activeSpots: activeSpots.data,
    recentVisits: recentVisits.data,
    machineIssues: machineIssues.data,
    isLoadingMonthly: monthlyRevenue.isLoading,
    isLoadingWeekly: weeklyRevenue.isLoading,
    isLoadingChart: chartData.isLoading,
    isLoadingMachines: activeMachines.isLoading,
    isLoadingSpots: activeSpots.isLoading,
    isLoadingVisits: recentVisits.isLoading,
    isLoadingIssues: machineIssues.isLoading,
    lowStockItems: lowStockItems.data ?? [],
    criticalSlots: criticalSlots.data ?? [],
    isLoadingLowStock: lowStockItems.isLoading,
    isLoadingCriticalSlots: criticalSlots.isLoading,
    topSpots: topSpots.data ?? [],
    topItems: topItems.data ?? [],
    isLoadingTopSpots: topSpots.isLoading,
    isLoadingTopItems: topItems.isLoading,
    arpm,
    arpmPctChange,
    stockoutRiskCount,
  };
}
