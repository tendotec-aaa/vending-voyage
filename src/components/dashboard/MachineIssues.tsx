import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Ticket {
  id: string;
  created_at: string;
  issue_type: string;
  status: string;
  priority: string;
  description?: string | null;
  resolved_at?: string | null;
  location?: { name: string } | null;
  machine?: { serial_number: string } | null;
  _pinned: boolean;
}

interface MachineIssuesProps {
  openTickets: Ticket[];
  completedTickets: Ticket[];
  isLoading?: boolean;
  period: "weekly" | "monthly";
  onPeriodChange: (period: "weekly" | "monthly") => void;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-destructive/80 text-destructive-foreground",
  medium: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  low: "bg-secondary text-secondary-foreground",
};

function TicketRow({ ticket }: { ticket: Ticket }) {
  const isOpen = ticket.status !== "completed";

  return (
    <div
      className={`flex items-start justify-between p-3 rounded-lg bg-background border ${
        isOpen ? "border-destructive/30" : "border-border"
      }`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={priorityColors[ticket.priority] || "bg-secondary text-secondary-foreground"}>
            {ticket.priority}
          </Badge>
          {isOpen ? (
            <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
              Open
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs gap-1">
              <CheckCircle className="w-3 h-3" />
              Resolved
            </Badge>
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {ticket.issue_type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {ticket.location?.name && <span>{ticket.location.name}</span>}
          {ticket.machine?.serial_number && (
            <span>• {ticket.machine.serial_number}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MachineIssues({
  openTickets,
  completedTickets,
  isLoading,
  period,
  onPeriodChange,
}: MachineIssuesProps) {
  const hasAny = openTickets.length > 0 || completedTickets.length > 0;

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Machine Issues</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="issues-period" className="text-xs text-muted-foreground">
            {period === "weekly" ? "Weekly" : "Monthly"}
          </Label>
          <Switch
            id="issues-period"
            checked={period === "monthly"}
            onCheckedChange={(checked) =>
              onPeriodChange(checked ? "monthly" : "weekly")
            }
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !hasAny ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No issues reported</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {openTickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
          {completedTickets.length > 0 && openTickets.length > 0 && (
            <div className="border-t border-border my-2" />
          )}
          {completedTickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </Card>
  );
}
