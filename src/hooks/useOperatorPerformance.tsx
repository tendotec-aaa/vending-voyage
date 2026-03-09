import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, subWeeks, differenceInDays, parseISO } from 'date-fns';

interface WeekStats {
  visits: number;
  issues: number;
  ticketsResolved: number;
  cashCollected: number;
}

interface StaleSpot {
  spotId: string;
  spotName: string;
  locationName: string;
  lastVisitDate: string | null;
  daysElapsed: number;
}

export function useOperatorPerformance(userId: string | undefined, locationIds: string[]) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['operator-performance', userId, thisWeekStart.toISOString()],
    queryFn: async (): Promise<{ thisWeek: WeekStats; lastWeek: WeekStats }> => {
      if (!userId) return { thisWeek: { visits: 0, issues: 0, ticketsResolved: 0, cashCollected: 0 }, lastWeek: { visits: 0, issues: 0, ticketsResolved: 0, cashCollected: 0 } };

      // This week visits
      const { count: thisVisits } = await supabase
        .from('spot_visits')
        .select('id', { count: 'exact', head: true })
        .eq('operator_id', userId)
        .gte('visit_date', thisWeekStart.toISOString())
        .lte('visit_date', thisWeekEnd.toISOString());

      // Last week visits
      const { count: lastVisits } = await supabase
        .from('spot_visits')
        .select('id', { count: 'exact', head: true })
        .eq('operator_id', userId)
        .gte('visit_date', lastWeekStart.toISOString())
        .lte('visit_date', lastWeekEnd.toISOString());

      // This week issues
      const { count: thisIssues } = await supabase
        .from('maintenance_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', userId)
        .gte('created_at', thisWeekStart.toISOString())
        .lte('created_at', thisWeekEnd.toISOString());

      // Last week issues
      const { count: lastIssues } = await supabase
        .from('maintenance_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', userId)
        .gte('created_at', lastWeekStart.toISOString())
        .lte('created_at', lastWeekEnd.toISOString());

      // This week resolved tickets
      const { count: thisResolved } = await supabase
        .from('maintenance_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', userId)
        .eq('status', 'completed')
        .gte('resolved_at', thisWeekStart.toISOString())
        .lte('resolved_at', thisWeekEnd.toISOString());

      // Last week resolved
      const { count: lastResolved } = await supabase
        .from('maintenance_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', userId)
        .eq('status', 'completed')
        .gte('resolved_at', lastWeekStart.toISOString())
        .lte('resolved_at', lastWeekEnd.toISOString());

      // This week cash
      const { data: thisCashData } = await supabase
        .from('spot_visits')
        .select('total_cash_collected')
        .eq('operator_id', userId)
        .gte('visit_date', thisWeekStart.toISOString())
        .lte('visit_date', thisWeekEnd.toISOString());

      const thisCash = (thisCashData ?? []).reduce((sum, v) => sum + (v.total_cash_collected ?? 0), 0);

      // Last week cash
      const { data: lastCashData } = await supabase
        .from('spot_visits')
        .select('total_cash_collected')
        .eq('operator_id', userId)
        .gte('visit_date', lastWeekStart.toISOString())
        .lte('visit_date', lastWeekEnd.toISOString());

      const lastCash = (lastCashData ?? []).reduce((sum, v) => sum + (v.total_cash_collected ?? 0), 0);

      return {
        thisWeek: { visits: thisVisits ?? 0, issues: thisIssues ?? 0, ticketsResolved: thisResolved ?? 0, cashCollected: thisCash },
        lastWeek: { visits: lastVisits ?? 0, issues: lastIssues ?? 0, ticketsResolved: lastResolved ?? 0, cashCollected: lastCash },
      };
    },
    enabled: !!userId,
  });

  const { data: staleSpots, isLoading: isLoadingStale } = useQuery({
    queryKey: ['stale-spots', userId, locationIds],
    queryFn: async (): Promise<StaleSpot[]> => {
      if (!locationIds.length) return [];

      // Get spots in assigned locations
      const { data: spots } = await supabase
        .from('spots')
        .select('id, name, location_id, locations:location_id(name)')
        .in('location_id', locationIds)
        .eq('status', 'active');

      if (!spots?.length) return [];

      // Get latest visit per spot
      const spotIds = spots.map(s => s.id);
      const { data: visits } = await supabase
        .from('spot_visits')
        .select('spot_id, visit_date')
        .in('spot_id', spotIds)
        .order('visit_date', { ascending: false });

      // Build map of latest visit per spot
      const latestVisitMap = new Map<string, string>();
      (visits ?? []).forEach(v => {
        if (v.spot_id && !latestVisitMap.has(v.spot_id)) {
          latestVisitMap.set(v.spot_id, v.visit_date!);
        }
      });

      const today = new Date();
      const result: StaleSpot[] = [];

      spots.forEach((spot: any) => {
        const lastVisit = latestVisitMap.get(spot.id);
        const daysElapsed = lastVisit
          ? differenceInDays(today, parseISO(lastVisit))
          : 999;

        if (daysElapsed > 7) {
          result.push({
            spotId: spot.id,
            spotName: spot.name,
            locationName: (spot.locations as any)?.name ?? '',
            lastVisitDate: lastVisit ?? null,
            daysElapsed,
          });
        }
      });

      result.sort((a, b) => b.daysElapsed - a.daysElapsed);
      return result;
    },
    enabled: locationIds.length > 0,
  });

  return {
    thisWeek: stats?.thisWeek ?? { visits: 0, issues: 0, ticketsResolved: 0, cashCollected: 0 },
    lastWeek: stats?.lastWeek ?? { visits: 0, issues: 0, ticketsResolved: 0, cashCollected: 0 },
    staleSpots: staleSpots ?? [],
    isLoading: isLoadingStats || isLoadingStale,
  };
}
