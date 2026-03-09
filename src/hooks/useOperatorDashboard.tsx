import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface RouteStop {
  id: string;
  sort_order: number | null;
  location: { id: string; name: string; address: string | null } | null;
  spots: { id: string; name: string }[];
  visited: boolean;
}

export interface OperatorRoute {
  id: string;
  name: string;
  status: string | null;
  scheduled_for: string;
}

export function useOperatorDashboard(userId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: route, isLoading: isLoadingRoute } = useQuery({
    queryKey: ['operator-route', userId, today],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('routes')
        .select('id, name, status, scheduled_for')
        .eq('driver_id', userId)
        .in('status', ['planned', 'active'])
        .order('scheduled_for', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching operator route:', error);
        return null;
      }
      return data as OperatorRoute | null;
    },
    enabled: !!userId,
  });

  const { data: stops, isLoading: isLoadingStops } = useQuery({
    queryKey: ['operator-stops', route?.id, userId, today],
    queryFn: async () => {
      if (!route?.id || !userId) return [];

      // Fetch route stops with locations
      const { data: stopsData, error: stopsError } = await supabase
        .from('route_stops')
        .select('id, sort_order, location_id, locations(id, name, address)')
        .eq('route_id', route.id)
        .order('sort_order', { ascending: true });

      if (stopsError) {
        console.error('Error fetching route stops:', stopsError);
        return [];
      }

      if (!stopsData?.length) return [];

      // Get location IDs to fetch spots
      const locationIds = stopsData
        .map((s: any) => s.location_id)
        .filter(Boolean) as string[];

      // Fetch spots for these locations
      const { data: spotsData } = await supabase
        .from('spots')
        .select('id, name, location_id')
        .in('location_id', locationIds);

      // Fetch today's visits by this operator
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      const spotIds = (spotsData || []).map(s => s.id);
      
      let visitedSpotIds: Set<string> = new Set();
      if (spotIds.length > 0) {
        const { data: visitsData } = await supabase
          .from('spot_visits')
          .select('spot_id')
          .eq('operator_id', userId)
          .gte('visit_date', todayStart)
          .lte('visit_date', todayEnd)
          .in('spot_id', spotIds);

        visitedSpotIds = new Set((visitsData || []).map(v => v.spot_id).filter(Boolean) as string[]);
      }

      // Build stops with spots and visited status
      const result: RouteStop[] = stopsData.map((stop: any) => {
        const locationSpots = (spotsData || []).filter(
          (sp: any) => sp.location_id === stop.location_id
        );
        const allVisited = locationSpots.length > 0 && locationSpots.every(
          (sp: any) => visitedSpotIds.has(sp.id)
        );

        return {
          id: stop.id,
          sort_order: stop.sort_order,
          location: stop.locations,
          spots: locationSpots.map((sp: any) => ({ id: sp.id, name: sp.name })),
          visited: allVisited,
        };
      });

      return result;
    },
    enabled: !!route?.id && !!userId,
  });

  const totalStops = stops?.length ?? 0;
  const visitedStops = stops?.filter(s => s.visited).length ?? 0;
  const progressPct = totalStops > 0 ? Math.round((visitedStops / totalStops) * 100) : 0;

  return {
    route,
    stops: stops ?? [],
    progressPct,
    totalStops,
    visitedStops,
    isLoading: isLoadingRoute || isLoadingStops,
  };
}
