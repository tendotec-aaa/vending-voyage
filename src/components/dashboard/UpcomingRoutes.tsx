import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Truck } from "lucide-react";

const routes = [
  {
    id: 1,
    name: "Downtown Route A",
    driver: "John Smith",
    stops: 8,
    startTime: "8:00 AM",
    status: "scheduled",
  },
  {
    id: 2,
    name: "Mall Circuit",
    driver: "Sarah Johnson",
    stops: 12,
    startTime: "9:30 AM",
    status: "in_progress",
  },
  {
    id: 3,
    name: "University Loop",
    driver: "Mike Davis",
    stops: 6,
    startTime: "11:00 AM",
    status: "scheduled",
  },
];

export function UpcomingRoutes() {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Today's Routes</h3>
        <button className="text-sm text-primary hover:underline">View All</button>
      </div>
      <div className="space-y-3">
        {routes.map((route) => (
          <div key={route.id} className="p-4 rounded-lg bg-background border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">{route.name}</span>
              </div>
              <Badge variant={route.status === "in_progress" ? "default" : "secondary"}>
                {route.status === "in_progress" ? "In Progress" : "Scheduled"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {route.stops} stops
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {route.startTime}
              </span>
              <span>{route.driver}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
