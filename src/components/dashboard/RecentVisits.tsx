import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Visit {
  id: string;
  visit_date: string | null;
  total_cash_collected: number | null;
  status: string | null;
  spot: { name: string; location: { name: string } | null } | null;
  operator: { first_names: string | null; last_names: string | null } | null;
}

interface RecentVisitsProps {
  visits?: Visit[];
  isLoading?: boolean;
}

export function RecentVisits({ visits, isLoading }: RecentVisitsProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Visits</h3>
        <button
          className="text-sm text-primary hover:underline"
          onClick={() => navigate("/visits")}
        >
          View All
        </button>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))
        ) : !visits || visits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent visits</p>
        ) : (
          visits.map((visit) => {
            const locationName =
              visit.spot?.location?.name || visit.spot?.name || "Unknown";
            const operatorName = [
              visit.operator?.first_names,
              visit.operator?.last_names,
            ]
              .filter(Boolean)
              .join(" ") || "Unknown";
            const cash = Number(visit.total_cash_collected) || 0;

            return (
              <div
                key={visit.id}
                className="flex items-center justify-between p-4 rounded-lg bg-background border border-border cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/visits/${visit.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="font-medium text-foreground truncate">
                      {locationName}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {operatorName}
                    </span>
                    {visit.visit_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(visit.visit_date), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-foreground">
                    ${cash.toFixed(2)}
                  </span>
                  <Badge
                    variant={
                      visit.status === "completed"
                        ? "default"
                        : visit.status === "flagged"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {visit.status === "completed"
                      ? "Completed"
                      : visit.status === "flagged"
                      ? "Flagged"
                      : visit.status || "Unknown"}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
