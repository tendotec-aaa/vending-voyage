import { fmt2 } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin,
  Calendar,
  User,
  MoreVertical,
  Play,
  CheckCircle,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Package,
  Cpu,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import type { MaintenanceTicket, TicketStatus } from "@/hooks/useMaintenanceTickets";

interface TicketCardProps {
  ticket: MaintenanceTicket;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => void;
  onDelete: (ticketId: string) => void;
}

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-destructive/10 text-destructive border-destructive/20" },
  in_progress: { label: "In Progress", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

const priorityConfig = {
  low: { label: "Low", icon: ArrowDown, className: "text-muted-foreground" },
  medium: { label: "Medium", icon: ArrowRight, className: "text-blue-500" },
  high: { label: "High", icon: ArrowUp, className: "text-orange-500" },
  urgent: { label: "Urgent", icon: AlertTriangle, className: "text-destructive" },
};

export function TicketCard({ ticket, onUpdateStatus, onDelete }: TicketCardProps) {
  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];
  const PriorityIcon = priority.icon;

  return (
    <Card className="p-4 bg-card border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Header: Issue Type + Status + Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{ticket.issue_type}</h3>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            <div className={`flex items-center gap-1 ${priority.className}`}>
              <PriorityIcon className="w-4 h-4" />
              <span className="text-xs font-medium">{priority.label}</span>
            </div>
          </div>

          {/* Location & Spot */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{ticket.location?.name || "Unknown"}</span>
              {ticket.spot && <span className="text-foreground/50">› {ticket.spot.name}</span>}
            </div>
          </div>

          {/* Description */}
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          )}

          {/* Asset Snapshots (if linked) */}
          {(ticket.machine || ticket.setup || ticket.product) && (
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {ticket.machine && (
                <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                  <Cpu className="w-3 h-3" />
                  <span>Machine: {ticket.machine.serial_number}</span>
                </div>
              )}
              {ticket.setup && (
                <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                  <Layers className="w-3 h-3" />
                  <span>Setup: {ticket.setup.name}</span>
                </div>
              )}
              {ticket.product && (
                <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                  <Package className="w-3 h-3" />
                  <span>Product: {ticket.product.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Meta: Reporter, Date, Due Date, Cost */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            {ticket.reporter && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{ticket.reporter.first_names && ticket.reporter.last_names ? `${ticket.reporter.first_names} ${ticket.reporter.last_names}` : ticket.reporter.email}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Created: {format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
            </div>
            {ticket.due_date && (
              <div className="flex items-center gap-1 text-orange-500">
                <Calendar className="w-3 h-3" />
                <span>Due: {format(new Date(ticket.due_date), "MMM d, yyyy")}</span>
              </div>
            )}
            {ticket.resolved_at && (
              <div className="flex items-center gap-1 text-emerald-500">
                <CheckCircle className="w-3 h-3" />
                <span>Resolved: {format(new Date(ticket.resolved_at), "MMM d, yyyy")}</span>
              </div>
            )}
            {ticket.cost !== null && ticket.cost > 0 && (
              <span className="font-medium text-foreground">Cost: ${fmt2(ticket.cost)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            {ticket.status === "pending" && (
              <DropdownMenuItem onClick={() => onUpdateStatus(ticket.id, "in_progress")}>
                <Play className="w-4 h-4 mr-2" />
                Start Work
              </DropdownMenuItem>
            )}
            {ticket.status === "in_progress" && (
              <DropdownMenuItem onClick={() => onUpdateStatus(ticket.id, "completed")}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
            )}
            {ticket.status !== "pending" && (
              <DropdownMenuItem onClick={() => onUpdateStatus(ticket.id, "pending")}>
                <ArrowDown className="w-4 h-4 mr-2" />
                Revert to Pending
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(ticket.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
