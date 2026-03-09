import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOperatorDashboard } from '@/hooks/useOperatorDashboard';
import { useUserLocations } from '@/hooks/useUserLocations';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, CheckCircle2, Clock, Route, AlertTriangle, Eye, Package } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OperatorDashboard = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const asUser = searchParams.get('as_user');
  const isGhostMode = !!asUser && isAdmin;
  const targetUserId = isGhostMode ? asUser : user?.id;

  const { route, stops, progressPct, totalStops, visitedStops, isLoading } =
    useOperatorDashboard(targetUserId ?? undefined);

  const { locationIds, isLoading: locLoading } = useUserLocations(targetUserId ?? undefined);

  const { data: pendingIssues } = useQuery({
    queryKey: ['operator-pending-issues', targetUserId, locationIds],
    queryFn: async () => {
      if (!locationIds.length && !isAdmin) return [];
      let spotsQuery = supabase.from('spots').select('id, name, location_id');
      if (locationIds.length > 0) {
        spotsQuery = spotsQuery.in('location_id', locationIds);
      }
      const { data: spots } = await spotsQuery;
      if (!spots?.length) return [];

      const { data: discrepancies, error } = await supabase
        .from('stock_discrepancy')
        .select('id, item_detail_id, discrepancy_type, difference, status, occurrence_date, item_details:item_detail_id(name)')
        .eq('status', 'pending')
        .order('occurrence_date', { ascending: false })
        .limit(20);

      if (error) { console.error('Error fetching discrepancies:', error); return []; }

      return (discrepancies ?? []).map((d: any) => ({
        id: d.id, itemName: d.item_details?.name ?? t('common.unknown'),
        type: d.discrepancy_type, difference: d.difference, date: d.occurrence_date,
      }));
    },
    enabled: !!targetUserId && (!locLoading || isAdmin),
  });

  const { data: pendingTickets } = useQuery({
    queryKey: ['operator-pending-tickets', targetUserId, locationIds],
    queryFn: async () => {
      if (!locationIds.length && !isAdmin) return [];
      let query = supabase
        .from('maintenance_tickets')
        .select('id, issue_type, description, priority, location_id, locations:location_id(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
      if (locationIds.length > 0) { query = query.in('location_id', locationIds); }
      const { data, error } = await query;
      if (error) { console.error('Error fetching tickets:', error); return []; }
      return (data ?? []).map((t: any) => ({
        id: t.id, issueType: t.issue_type, description: t.description,
        priority: t.priority, locationName: t.locations?.name ?? 'Unknown',
      }));
    },
    enabled: !!targetUserId && (!locLoading || isAdmin),
  });

  const allIssues = [
    ...(pendingIssues ?? []).map(i => ({ ...i, kind: 'discrepancy' as const })),
    ...(pendingTickets ?? []).map(t => ({ ...t, kind: 'ticket' as const })),
  ];

  if (isLoading) {
    return (
      <AppLayout title={t('operatorDashboard.title')} subtitle={t('operatorDashboard.loadingRoute')}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={t('operatorDashboard.title')}
      subtitle={route ? t('operatorDashboard.routeSubtitle', { name: route.name }) : t('operatorDashboard.todayOverview')}
    >
      {isGhostMode && (
        <Alert className="mb-4 border-primary/50 bg-primary/5">
          <Eye className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            <strong>{t('operatorDashboard.ghostMode')}:</strong> {t('operatorDashboard.ghostModeDesc')}{' '}
            <button onClick={() => navigate('/admin/operators')} className="underline hover:no-underline">
              {t('operatorDashboard.backToOperators')}
            </button>
          </AlertDescription>
        </Alert>
      )}

      {!route && (
        <Card className="p-8 text-center bg-card border-border">
          <Route className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">{t('operatorDashboard.noRoute')}</h3>
          <p className="text-sm text-muted-foreground">{t('operatorDashboard.noRouteDesc')}</p>
        </Card>
      )}

      {route && (
        <div className="space-y-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {t('operatorDashboard.progress', { visited: visitedStops, total: totalStops })}
              </span>
              <span className="text-sm font-semibold text-primary">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </Card>

          <div className="space-y-3">
            {stops.map((stop, index) => (
              <Card
                key={stop.id}
                className={`p-4 bg-card border-border transition-colors ${
                  !stop.visited ? 'cursor-pointer hover:border-primary/50' : 'opacity-75'
                }`}
                onClick={() => {
                  if (!stop.visited && stop.location?.id) {
                    const params = new URLSearchParams();
                    params.set('location_id', stop.location.id);
                    if (stop.spots.length > 0) params.set('spot_id', stop.spots[0].id);
                    if (route?.id) params.set('route_id', route.id);
                    navigate(`/visits/new?${params.toString()}`);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {stop.location?.name ?? t('operatorDashboard.unknownLocation')}
                      </p>
                      {stop.location?.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{stop.location.address}</span>
                        </p>
                      )}
                      {stop.spots.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {stop.spots.map(s => s.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={stop.visited ? 'default' : 'secondary'} className="flex-shrink-0">
                    {stop.visited ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {t('operatorDashboard.visited')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t('operatorDashboard.pending')}
                      </span>
                    )}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          {stops.length === 0 && (
            <Card className="p-6 text-center bg-card border-border">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('operatorDashboard.noStops')}</p>
            </Card>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {t('operatorDashboard.pendingIssues')}
          {allIssues.length > 0 && <Badge variant="destructive">{allIssues.length}</Badge>}
        </h2>

        {allIssues.length === 0 ? (
          <Card className="p-6 text-center bg-card border-border">
            <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('operatorDashboard.allClear')}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {allIssues.map((issue) => (
              <Card
                key={issue.kind === 'discrepancy' ? `d-${issue.id}` : `t-${issue.id}`}
                className="p-3 bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => { if (issue.kind === 'ticket') navigate('/maintenance'); }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {issue.kind === 'discrepancy'
                          ? `${t('operatorDashboard.stock')}: ${(issue as any).itemName} (${(issue as any).difference > 0 ? '+' : ''}${(issue as any).difference})`
                          : `${(issue as any).issueType}: ${(issue as any).locationName}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {issue.kind === 'discrepancy' ? (issue as any).type : (issue as any).description?.slice(0, 60)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={issue.kind === 'ticket' && (issue as any).priority === 'high' ? 'destructive' : 'secondary'} className="flex-shrink-0">
                    {issue.kind === 'discrepancy' ? t('operatorDashboard.discrepancy') : (issue as any).priority}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OperatorDashboard;