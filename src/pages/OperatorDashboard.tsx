import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOperatorDashboard } from '@/hooks/useOperatorDashboard';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, CheckCircle2, Clock, Route, AlertTriangle, Eye } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const OperatorDashboard = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const asUser = searchParams.get('as_user');
  const isGhostMode = !!asUser && isAdmin;
  const targetUserId = isGhostMode ? asUser : user?.id;

  const { route, stops, progressPct, totalStops, visitedStops, isLoading } =
    useOperatorDashboard(targetUserId ?? undefined);

  if (isLoading) {
    return (
      <AppLayout title="My Dashboard" subtitle="Loading your route...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="My Dashboard"
      subtitle={route ? `Route: ${route.name}` : "Today's route overview"}
    >
      {/* Ghost Mode Banner */}
      {isGhostMode && (
        <Alert className="mb-4 border-primary/50 bg-primary/5">
          <Eye className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            <strong>Ghost Mode:</strong> You are viewing this operator's dashboard.{' '}
            <button
              onClick={() => navigate('/admin/operators')}
              className="underline hover:no-underline"
            >
              Back to Operators
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* No Route State */}
      {!route && (
        <Card className="p-8 text-center bg-card border-border">
          <Route className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No route assigned</h3>
          <p className="text-sm text-muted-foreground">
            There are no active or planned routes for today.
          </p>
        </Card>
      )}

      {/* Route Content */}
      {route && (
        <div className="space-y-4">
          {/* Progress Tracker */}
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Progress: {visitedStops}/{totalStops} stops
              </span>
              <span className="text-sm font-semibold text-primary">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </Card>

          {/* Route Stops List */}
          <div className="space-y-3">
            {stops.map((stop, index) => (
              <Card
                key={stop.id}
                className={`p-4 bg-card border-border transition-colors ${
                  !stop.visited ? 'cursor-pointer hover:border-primary/50' : 'opacity-75'
                }`}
                onClick={() => {
                  if (!stop.visited && stop.spots.length > 0) {
                    navigate(`/visits/new?spot_id=${stop.spots[0].id}`);
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
                        {stop.location?.name ?? 'Unknown Location'}
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
                  <Badge
                    variant={stop.visited ? 'default' : 'secondary'}
                    className="flex-shrink-0"
                  >
                    {stop.visited ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Visited
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Pending
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
              <p className="text-sm text-muted-foreground">
                This route has no stops configured.
              </p>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default OperatorDashboard;
