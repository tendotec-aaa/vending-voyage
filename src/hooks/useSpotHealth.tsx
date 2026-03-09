import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

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
  isProjectedRent: boolean;
  isProjectedDepreciation: boolean;
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
      const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

      const [spotsRes, visitsRes, setupsRes, trendVisitsRes, locationsRes, overheadRes] = await Promise.all([
        supabase
          .from("spots")
          .select("id, name, status, location_id, rent_fixed_amount, rent_percentage, locations(id, name, rent_amount, commission_percentage)")
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
        // Fetch posted overhead for this month
        supabase
          .from("overhead_postings" as any)
          .select("location_id, setup_id, posting_type, expense_id, operating_expenses:expense_id(amount)")
          .eq("year_month", yearMonth),
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
      const overheadPostings = (overheadRes.data || []) as any[];

      // Build posted rent map: location_id -> amount
      const postedRentMap = new Map<string, number>();
      const postedDepMap = new Map<string, number>(); // setup_id -> amount
      for (const p of overheadPostings) {
        const amount = Number((p.operating_expenses as any)?.amount) || 0;
        if (p.posting_type === 'rent' && p.location_id) {
          postedRentMap.set(p.location_id, amount);
        } else if (p.posting_type === 'depreciation' && p.setup_id) {
          postedDepMap.set(p.setup_id, amount);
        }
      }

      // Revenue per spot
      const revenueMap = new Map<string, number>();
      visits.forEach((v: any) => {
        revenueMap.set(v.spot_id, (revenueMap.get(v.spot_id) || 0) + (v.total_cash_collected || 0));
      });

      // Count active spots per location
      const spotsPerLocation = new Map<string, number>();
      spots.forEach((s: any) => {
        if (s.location_id) {
          spotsPerLocation.set(s.location_id, (spotsPerLocation.get(s.location_id) || 0) + 1);
        }
      });

      // Depreciation per spot from setups (live calculation)
      const depreciationMap = new Map<string, number>();
      const setupDetailsMap = new Map<string, SetupMachine[]>();
      const setupBySpot = new Map<string, string>(); // spot_id -> setup_id
      setups.forEach((setup: any) => {
        if (!setup.spot_id) return;
        setupBySpot.set(setup.spot_id, setup.id);
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

      // Trend data
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
        const activeSpotCount = spot.location_id ? (spotsPerLocation.get(spot.location_id) || 1) : 1;

        // Rent: prefer posted, fallback to location-level calculation
        let rentCost: number;
        let isProjectedRent = false;
        if (spot.location_id && postedRentMap.has(spot.location_id)) {
          // Posted: split equally among active spots
          rentCost = postedRentMap.get(spot.location_id)! / activeSpotCount;
        } else {
          // Projected: use location rent_amount split by active spots
          const locationRent = Number(location?.rent_amount) || 0;
          rentCost = locationRent / activeSpotCount;
          isProjectedRent = true;
        }

        // Depreciation: prefer posted, fallback to live calculation
        let depreciation: number;
        let isProjectedDepreciation = false;
        const setupId = setupBySpot.get(spot.id);
        if (setupId && postedDepMap.has(setupId)) {
          depreciation = postedDepMap.get(setupId)!;
        } else {
          depreciation = depreciationMap.get(spot.id) || 0;
          isProjectedDepreciation = true;
        }

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
          badge: null,
          isProjectedRent,
          isProjectedDepreciation,
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
          const spot = spots.find((s: any) => s.id === spotId);
          const location = (spot as any)?.locations;
          const locationRent = Number(location?.rent_amount) || 0;
          const activeCount = spot?.location_id ? (spotsPerLocation.get(spot.location_id) || 1) : 1;
          const rent = locationRent / activeCount;
          const dep = depreciationMap.get(spotId) || 0;
          months.push({ month: label, netProfit: rev - rent - dep });
        }
        return months;
      };

      const isProjected = rows.some(r => r.isProjectedRent || r.isProjectedDepreciation);

      return { rows, getSetupDetails, getTrend, locations, isProjected };
    },
  });
}
