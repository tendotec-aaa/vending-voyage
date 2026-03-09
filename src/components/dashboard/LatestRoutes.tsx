import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Truck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startOfDay, endOfDay } from 'date-fns';

interface LatestRoute {
  id: string;
  name: string;
  status: string | null;
  scheduled_for: string;
  driverName: string;
  totalStops: number;
  visitedStops: number;
  completionPct: number;
}

export function LatestRoutes() {
  const navigate = useNavigate();

  const { data: routes, isLoading } = useQuery({
    queryKey: ['latest-routes-widget'],
    queryFn: async () => {
      // Fetch 5 most recent routes with driver info
      const { data: routesData, error } = await supabase
        .from('routes')
        .select('id, name, status, scheduled_for, driver_id, user_profiles!routes_driver_id_fkey(first_names, last_names)')
        .order('scheduled_for', { ascending: false })
        .limit(5);

      if (error || !routesData?.length) return [];

      const routeIds = routesData.map(r => r.id);

      // Get stop counts per route
      const { data: stopsData } = await supabase
        .from('route_stops')
        .select('route_id, location_id')
        .in('route_id', routeIds);

      // Get location IDs to find spots
      const locationIds = [...new Set((stopsData || []).map(s => s.location_id).filter(Boolean))] as string[];

      const { data: spotsData } = locationIds.length > 0
        ? await supabase.from('spots').select('id, location_id').in('location_id', locationIds)
        : { data: [] };

      // Get today's visits
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      const spotIds = (spotsData || []).map(s => s.id);

      let visitedSpotIds = new Set<string>();
      if (spotIds.length > 0) {
        const { data: visitsData } = await supabase
          .from('spot_visits')
          .select('spot_id')
          .gte('visit_date', todayStart)
          .lte('visit_date', todayEnd)
          .in('spot_id', spotIds);
        visitedSpotIds = new Set((visitsData || []).map(v => v.spot_id).filter(Boolean) as string[]);
      }

      // Build per-route completion
      const result: LatestRoute[] = routesData.map((r: any) => {
        const routeStops = (stopsData || []).filter(s => s.route_id === r.id);
        const totalStops = routeStops.length;

        // Count visited stops (all spots at that location visited)
        let visitedStops = 0;
        for (const stop of routeStops) {
          const locSpots = (spotsData || []).filter(sp => sp.location_id === stop.location_id);
          if (locSpots.length > 0 && locSpots.every(sp => visitedSpotIds.has(sp.id))) {
            visitedStops++;
          }
        }

        const driver = r.user_profiles;
        const driverName = driver
          ? [driver.first_names, driver.last_names].filter(Boolean).join(' ') || 'Unnamed'
          : 'Unassigned';

        return {
          id: r.id,
          name: r.name,
          status: r.status,
          scheduled_for: r.scheduled_for,
          driverName,
          totalStops,
          visitedStops,
          completionPct: totalStops > 0 ? Math.round((visitedStops / totalStops) * 100) : 0,
        };
      });

      return result;
    },
  });

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Latest Routes</h3>
        <button
          onClick={() => navigate('/routes')}
          className="text-sm text-primary hover:underline"
        >
          View All
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !routes?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">No routes found.</p>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <div
              key={route.id}
              className="p-4 rounded-lg bg-background border border-border cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/routes/${route.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">{route.name}</span>
                </div>
                <Badge variant={route.status === 'active' ? 'default' : 'secondary'}>
                  {route.status === 'active' ? 'Active' : route.status === 'completed' ? 'Done' : 'Planned'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{route.driverName}</p>
              <div className="flex items-center gap-2">
                <Progress value={route.completionPct} className="h-2 flex-1" />
                <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                  {route.completionPct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
