import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, subDays, format } from "date-fns";

export interface SpotAnalytics {
  id: string;
  name: string;
  locationId: string | null;
  locationName: string;
  status: string;
  createdAt: string;
  totalSales: number;
  rentAmount: number; // monthly rent per spot
  totalAccruedRent: number; // rent from contract start to last visit
  netProfit: number;
  roi: number;
  currentStock: number;
  totalCapacity: number;
  stockPercentage: number;
  openTickets: number;
  daysActive: number;
  visitCount: number;
  trend: "up" | "down" | "flat";
  last30DaySales: number;
  previous30DaySales: number;
  lastVisitDate: string | null;
  contractStartDate: string | null;
}

export interface SpotTrendData {
  date: string;
  spotId: string;
  spotName: string;
  sales: number;
}

export type DateRangeOption = "30d" | "3m" | "6m" | "1y" | "all";

function getDateRangeStart(range: DateRangeOption): Date | null {
  const now = new Date();
  switch (range) {
    case "30d": return subDays(now, 30);
    case "3m": return subDays(now, 90);
    case "6m": return subDays(now, 180);
    case "1y": return subDays(now, 365);
    case "all": return null;
  }
}

export function useSpotAnalytics(dateRange: DateRangeOption = "all") {
  return useQuery({
    queryKey: ["spot-analytics", dateRange],
    queryFn: async (): Promise<SpotAnalytics[]> => {
      // Fetch spots with locations including contract_start_date
      const { data: spots, error: spotsError } = await supabase
        .from("spots")
        .select(`
          id,
          name,
          status,
          created_at,
          location_id,
          locations (
            id,
            name,
            rent_amount,
            contract_start_date
          )
        `);

      if (spotsError) throw spotsError;

      // Fetch all spot visits
      const { data: visits, error: visitsError } = await supabase
        .from("spot_visits")
        .select("id, spot_id, total_cash_collected, visit_date");

      if (visitsError) throw visitsError;

      // Fetch stock capacity via setups -> machines -> machine_slots
      const { data: setups, error: setupsError } = await supabase
        .from("setups")
        .select(`
          id,
          spot_id,
          machines (
            id,
            machine_slots (
              current_stock,
              capacity
            )
          )
        `);

      if (setupsError) throw setupsError;

      // Fetch open maintenance tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from("maintenance_tickets")
        .select("id, spot_id, status")
        .neq("status", "completed");

      if (ticketsError) throw ticketsError;

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);
      const rangeStart = getDateRangeStart(dateRange);

      // Count spots per location for rent division
      const spotsPerLocation = new Map<string, number>();
      (spots || []).forEach((s: any) => {
        if (s.location_id) {
          spotsPerLocation.set(s.location_id, (spotsPerLocation.get(s.location_id) || 0) + 1);
        }
      });

      // Process each spot
      return (spots || []).map((spot: any) => {
        const location = spot.locations;
        const allSpotVisits = (visits || []).filter((v: any) => v.spot_id === spot.id);
        
        // Filter visits by date range
        const spotVisits = rangeStart
          ? allSpotVisits.filter((v: any) => new Date(v.visit_date) >= rangeStart)
          : allSpotVisits;

        // Find last visit date (from ALL visits, not filtered)
        const lastVisitDate = allSpotVisits.length > 0
          ? allSpotVisits.reduce((latest: string, v: any) => v.visit_date > latest ? v.visit_date : latest, allSpotVisits[0].visit_date)
          : null;

        // Calculate total sales (within date range)
        const totalSales = spotVisits.reduce(
          (sum: number, v: any) => sum + (v.total_cash_collected || 0),
          0
        );

        // Calculate last 30 days vs previous 30 days
        const last30DaySales = allSpotVisits
          .filter((v: any) => new Date(v.visit_date) >= thirtyDaysAgo)
          .reduce((sum: number, v: any) => sum + (v.total_cash_collected || 0), 0);

        const previous30DaySales = allSpotVisits
          .filter((v: any) => {
            const date = new Date(v.visit_date);
            return date >= sixtyDaysAgo && date < thirtyDaysAgo;
          })
          .reduce((sum: number, v: any) => sum + (v.total_cash_collected || 0), 0);

        // Determine trend
        let trend: "up" | "down" | "flat" = "flat";
        if (last30DaySales > previous30DaySales * 1.1) trend = "up";
        else if (last30DaySales < previous30DaySales * 0.9) trend = "down";

        // Calculate stock from setups
        const spotSetups = (setups || []).filter((s: any) => s.spot_id === spot.id);
        let currentStock = 0;
        let totalCapacity = 0;
        spotSetups.forEach((setup: any) => {
          (setup.machines || []).forEach((machine: any) => {
            (machine.machine_slots || []).forEach((slot: any) => {
              currentStock += slot.current_stock || 0;
              totalCapacity += slot.capacity || 0;
            });
          });
        });

        // Calculate open tickets
        const openTickets = (tickets || []).filter(
          (t: any) => t.spot_id === spot.id
        ).length;

        // Calculate rent: monthly / spot count
        const locationSpotCount = spot.location_id ? (spotsPerLocation.get(spot.location_id) || 1) : 1;
        const rentAmount = (location?.rent_amount || 0) / locationSpotCount;
        const contractStartDate = location?.contract_start_date || null;

        // Calculate accrued rent: from contract start (or range start) to last visit date
        let totalAccruedRent = 0;
        if (rentAmount > 0 && lastVisitDate && contractStartDate) {
          const dailyRent = rentAmount / 30;
          const effectiveStart = rangeStart && new Date(contractStartDate) < rangeStart
            ? rangeStart
            : new Date(contractStartDate);
          const effectiveEnd = new Date(lastVisitDate);
          const daysOfRent = Math.max(0, differenceInDays(effectiveEnd, effectiveStart));
          totalAccruedRent = dailyRent * daysOfRent;
        }

        const netProfit = totalSales - totalAccruedRent;
        const roi = totalAccruedRent > 0 ? (netProfit / totalAccruedRent) * 100 : 0;
        const stockPercentage = totalCapacity > 0 ? (currentStock / totalCapacity) * 100 : 0;
        const daysActive = differenceInDays(now, new Date(spot.created_at));

        return {
          id: spot.id,
          name: spot.name,
          locationId: spot.location_id,
          locationName: location?.name || "Unassigned",
          status: spot.status || "active",
          createdAt: spot.created_at,
          totalSales,
          rentAmount,
          totalAccruedRent,
          netProfit,
          roi,
          currentStock,
          totalCapacity,
          stockPercentage,
          openTickets,
          daysActive,
          visitCount: spotVisits.length,
          trend,
          last30DaySales,
          previous30DaySales,
          lastVisitDate,
          contractStartDate,
        };
      });
    },
  });
}

export function useSpotTrends(spotIds: string[], timeRange: number = 30) {
  return useQuery({
    queryKey: ["spot-trends", spotIds, timeRange],
    queryFn: async (): Promise<SpotTrendData[]> => {
      if (spotIds.length === 0) return [];

      const startDate = subDays(new Date(), timeRange);

      const { data: visits, error } = await supabase
        .from("spot_visits")
        .select("spot_id, total_cash_collected, visit_date")
        .in("spot_id", spotIds)
        .gte("visit_date", startDate.toISOString());

      if (error) throw error;

      const { data: spots } = await supabase
        .from("spots")
        .select("id, name")
        .in("id", spotIds);

      const spotNameMap = new Map((spots || []).map((s: any) => [s.id, s.name]));

      // Group by date and spot
      const grouped = new Map<string, number>();
      (visits || []).forEach((v: any) => {
        const date = format(new Date(v.visit_date), "yyyy-MM-dd");
        const key = `${date}-${v.spot_id}`;
        grouped.set(key, (grouped.get(key) || 0) + (v.total_cash_collected || 0));
      });

      const result: SpotTrendData[] = [];
      grouped.forEach((sales, key) => {
        const [date, spotId] = key.split("-");
        result.push({
          date,
          spotId,
          spotName: spotNameMap.get(spotId) || "Unknown",
          sales,
        });
      });

      return result.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: spotIds.length > 0,
  });
}

export function useLocationsForFilter() {
  return useQuery({
    queryKey: ["locations-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });
}
