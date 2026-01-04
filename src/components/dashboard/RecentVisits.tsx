import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, User } from "lucide-react";

const recentVisits = [
  {
    id: 1,
    location: "Westfield Mall - Food Court",
    driver: "John Smith",
    machine: "VM-001",
    status: "completed",
    time: "2 hours ago",
    revenue: "$127.50",
  },
  {
    id: 2,
    location: "Central Station - Platform 3",
    driver: "Sarah Johnson",
    machine: "VM-023",
    status: "completed",
    time: "3 hours ago",
    revenue: "$89.25",
  },
  {
    id: 3,
    location: "Tech Park Building A",
    driver: "Mike Davis",
    machine: "VM-045",
    status: "in_progress",
    time: "4 hours ago",
    revenue: "$156.00",
  },
  {
    id: 4,
    location: "University Library",
    driver: "Emily Chen",
    machine: "VM-012",
    status: "completed",
    time: "5 hours ago",
    revenue: "$67.75",
  },
  {
    id: 5,
    location: "Airport Terminal 2",
    driver: "John Smith",
    machine: "VM-089",
    status: "pending",
    time: "6 hours ago",
    revenue: "$234.00",
  },
];

export function RecentVisits() {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Visits</h3>
        <button className="text-sm text-primary hover:underline">View All</button>
      </div>
      <div className="space-y-4">
        {recentVisits.map((visit) => (
          <div key={visit.id} className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="font-medium text-foreground truncate">{visit.location}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {visit.driver}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {visit.time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-foreground">{visit.revenue}</span>
              <Badge variant={
                visit.status === "completed" ? "default" : 
                visit.status === "in_progress" ? "secondary" : 
                "outline"
              }>
                {visit.status === "completed" ? "Completed" : 
                 visit.status === "in_progress" ? "In Progress" : 
                 "Pending"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
