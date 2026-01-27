import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TicketStatus = "pending" | "in_progress" | "completed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface MaintenanceTicket {
  id: string;
  created_at: string;
  location_id: string;
  spot_id: string | null;
  issue_type: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  due_date: string | null;
  reporter_id: string | null;
  resolved_at: string | null;
  cost: number | null;
  machine_id: string | null;
  slot_id: string | null;
  setup_id: string | null;
  product_id: string | null;
  visit_id: string | null;
  // Joined data
  location?: { id: string; name: string };
  spot?: { id: string; name: string } | null;
  machine?: { id: string; serial_number: string } | null;
  setup?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
  reporter?: { id: string; first_names: string | null; last_names: string | null; email: string | null } | null;
}

export interface CreateTicketData {
  location_id: string;
  spot_id?: string | null;
  issue_type: string;
  description?: string | null;
  priority?: TicketPriority;
  due_date?: string | null;
  reporter_id?: string | null;
}

export function useMaintenanceTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ["maintenance-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select(`
          *,
          location:locations(id, name),
          spot:spots(id, name),
          machine:machines(id, serial_number),
          setup:setups(id, name),
          product:item_definitions(id, name),
          reporter:user_profiles(id, first_names, last_names, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MaintenanceTicket[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async (ticketData: CreateTicketData) => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .insert(ticketData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      toast({
        title: "Work Order Created",
        description: "The maintenance ticket has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTicketStatus = useMutation({
    mutationFn: async ({
      ticketId,
      status,
      cost,
    }: {
      ticketId: string;
      status: TicketStatus;
      cost?: number;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "completed") {
        updateData.resolved_at = new Date().toISOString();
        if (cost !== undefined) updateData.cost = cost;
      }

      const { data, error } = await supabase
        .from("maintenance_tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      toast({
        title: "Status Updated",
        description: "The ticket status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("maintenance_tickets")
        .delete()
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      toast({
        title: "Ticket Deleted",
        description: "The maintenance ticket has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate stats
  const stats = {
    pending: ticketsQuery.data?.filter((t) => t.status === "pending").length || 0,
    inProgress: ticketsQuery.data?.filter((t) => t.status === "in_progress").length || 0,
    completed: ticketsQuery.data?.filter((t) => t.status === "completed").length || 0,
  };

  return {
    tickets: ticketsQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    error: ticketsQuery.error,
    stats,
    createTicket,
    updateTicketStatus,
    deleteTicket,
  };
}
