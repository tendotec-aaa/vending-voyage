import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Clock, Loader2 } from "lucide-react";
import { MaintenanceStats } from "@/components/maintenance/MaintenanceStats";
import { TicketCard } from "@/components/maintenance/TicketCard";
import { NewWorkOrderDialog } from "@/components/maintenance/NewWorkOrderDialog";
import { useMaintenanceTickets, type CreateTicketData, type TicketStatus } from "@/hooks/useMaintenanceTickets";
import { Skeleton } from "@/components/ui/skeleton";

export default function MaintenancePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    tickets,
    isLoading,
    stats,
    createTicket,
    updateTicketStatus,
    deleteTicket,
  } = useMaintenanceTickets();

  const handleCreateTicket = (data: CreateTicketData) => {
    createTicket.mutate(data, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleUpdateStatus = (ticketId: string, status: TicketStatus) => {
    updateTicketStatus.mutate({ ticketId, status });
  };

  const handleDelete = (ticketId: string) => {
    if (window.confirm("Are you sure you want to delete this work order?")) {
      deleteTicket.mutate(ticketId);
    }
  };

  // Count active tickets (pending + in_progress)
  const activeCount = stats.pending + stats.inProgress;

  return (
    <AppLayout
      title="Maintenance"
      subtitle="Service tickets and machine lifecycle management"
      actions={
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Work Order
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Header badges for pending/in-progress */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Active Work Orders:</span>
          </div>
          {stats.pending > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              <Clock className="w-3 h-3 mr-1" />
              {stats.pending} Pending
            </Badge>
          )}
          {stats.inProgress > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <Loader2 className="w-3 h-3 mr-1" />
              {stats.inProgress} In Progress
            </Badge>
          )}
          {activeCount === 0 && (
            <span className="text-sm text-muted-foreground">No active work orders</span>
          )}
        </div>

        {/* Stats Cards */}
        <MaintenanceStats
          pending={stats.pending}
          inProgress={stats.inProgress}
          completed={stats.completed}
        />

        {/* Ticket List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Work Orders</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No work orders yet.</p>
              <p className="text-sm">Create a new work order to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onUpdateStatus={handleUpdateStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NewWorkOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateTicket}
        isSubmitting={createTicket.isPending}
      />
    </AppLayout>
  );
}
