import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, getDaysInMonth, format } from "date-fns";

export interface SpotHealthRow {
  spotId: string;
  spotName: string;
  locationId: string | null;
  locationName: string;
  grossRevenue: number;
  rentCost: number;
  depreciation: number;
  netProfit: number;
  netMargin: number;
  badge: "prime" | "renegotiate" | "relocate" | null;
}

export interface SetupMachine {
  machineId: string;
  serial: string;
  modelName: string;
  depreciationPerMonth: number;
}

export interface TrendPoint {
  month: string;
  netProfit: number;
}

export function useSpotHealth(year: number, month: number) {
  return useQuery({
    queryKey: ["spot-health", year, month],
    queryFn: async () => {
      const selectedStart = startOfMonth(new Date(year, month - 1));
      const selectedEnd = endOfMonth(new Date(year, month - 1));
      const trendStart = startOfMonth(subMonths(selectedStart, 2));

      // Parallel fetches
      const [spotsRes, visitsRes, setupsRes, trendVisitsRes, locationsRes] = await Promise.all([
        supabase
          .from("spots")
          .select("id, name, status, location_id, rent_fixed_amount, rent_percentage, locations(id, name)")
          .eq("status", "active"),
        supabase
          .from("spot_visits")
          .select("spot_id, total_cash_collected")
          .gte("visit_date", selectedStart.toISOString())
          .lte("visit_date", selectedEnd.toISOString()),
        supabase
          .from("setups")
          .select("id, spot_id, machines(id, serial_number, model_id, item_details:model_id(name, monthly_depreciation))")
          .not("spot_id", "is", null),
        supabase
          .from("spot_visits")
          .select("spot_id, total_cash_collected, visit_date")
          .gte("visit_date", trendStart.toISOString())
          .lte("visit_date", selectedEnd.toISOString()),
        supabase
          .from("locations")
          .select("id, name")
          .order("name"),
      ]);

      if (spotsRes.error) throw spotsRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (setupsRes.error) throw setupsRes.error;
      if (trendVisitsRes.error) throw trendVisitsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      const spots = spotsRes.data || [];
      const visits = visitsRes.data || [];
      const setups = setupsRes.data || [];
      const trendVisits = trendVisitsRes.data || [];
      const locations = locationsRes.data || [];

      // Revenue per spot for selected month
      const revenueMap = new Map<string, number>();
      visits.forEach((v: any) => {
        revenueMap.set(v.spot_id, (revenueMap.get(v.spot_id) || 0) + (v.total_cash_collected || 0));
      });

      // Depreciation per spot from setups
      const depreciationMap = new Map<string, number>();
      const setupDetailsMap = new Map<string, SetupMachine[]>();
      setups.forEach((setup: any) => {
        if (!setup.spot_id) return;
        const machines: SetupMachine[] = [];
        let totalDep = depreciationMap.get(setup.spot_id) || 0;
        (setup.machines || []).forEach((m: any) => {
          const model = m.item_details;
          const dep = model?.monthly_depreciation || 0;
          totalDep += dep;
          machines.push({
            machineId: m.id,
            serial: m.serial_number,
            modelName: model?.name || "Unknown",
            depreciationPerMonth: dep,
          });
        });
        depreciationMap.set(setup.spot_id, totalDep);
        setupDetailsMap.set(setup.spot_id, [
          ...(setupDetailsMap.get(setup.spot_id) || []),
          ...machines,
        ]);
      });

      // Trend data: revenue per spot per month (3 months)
      const trendMap = new Map<string, Map<string, number>>();
      trendVisits.forEach((v: any) => {
        const monthKey = format(new Date(v.visit_date), "yyyy-MM");
        if (!trendMap.has(v.spot_id)) trendMap.set(v.spot_id, new Map());
        const spotMap = trendMap.get(v.spot_id)!;
        spotMap.set(monthKey, (spotMap.get(monthKey) || 0) + (v.total_cash_collected || 0));
      });

      // Build rows
      const rows: SpotHealthRow[] = spots.map((spot: any) => {
        const location = spot.locations as any;
        const grossRevenue = revenueMap.get(spot.id) || 0;
        const rentFixed = spot.rent_fixed_amount || 0;
        const rentPct = spot.rent_percentage || 0;
        const rentCost = rentFixed + (grossRevenue * rentPct / 100);
        const depreciation = depreciationMap.get(spot.id) || 0;
        const netProfit = grossRevenue - rentCost - depreciation;
        const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

        return {
          spotId: spot.id,
          spotName: spot.name,
          locationId: spot.location_id,
          locationName: location?.name || "Unassigned",
          grossRevenue,
          rentCost,
          depreciation,
          netProfit,
          netMargin,
          badge: null, // computed below
        };
      });

      // Compute badges
      const revenueValues = rows.map(r => r.grossRevenue).sort((a, b) => a - b);
      const medianRevenue = revenueValues.length > 0
        ? revenueValues[Math.floor(revenueValues.length / 2)]
        : 0;

      rows.forEach(row => {
        if (row.netProfit < 0) {
          row.badge = "relocate";
        } else if (row.netMargin > 40) {
          row.badge = "prime";
        } else if (row.grossRevenue >= medianRevenue && row.netMargin < 15 && row.grossRevenue > 0) {
          row.badge = "renegotiate";
        }
      });

      // Sort by net profit desc
      rows.sort((a, b) => b.netProfit - a.netProfit);

      const getSetupDetails = (spotId: string): SetupMachine[] =>
        setupDetailsMap.get(spotId) || [];

      const getTrend = (spotId: string): TrendPoint[] => {
        const months: TrendPoint[] = [];
        for (let i = 2; i >= 0; i--) {
          const m = subMonths(selectedStart, i);
          const key = format(m, "yyyy-MM");
          const label = format(m, "MMM yyyy");
          const spotRevMap = trendMap.get(spotId);
          const rev = spotRevMap?.get(key) || 0;
          // For trend, compute net profit using same rent/depreciation
          const spot = spots.find((s: any) => s.id === spotId);
          const rentFixed = spot?.rent_fixed_amount || 0;
          const rentPct = spot?.rent_percentage || 0;
          const rent = rentFixed + (rev * rentPct / 100);
          const dep = depreciationMap.get(spotId) || 0;
          months.push({ month: label, netProfit: rev - rent - dep });
        }
        return months;
      };

      return { rows, getSetupDetails, getTrend, locations };
    },
  });
}
