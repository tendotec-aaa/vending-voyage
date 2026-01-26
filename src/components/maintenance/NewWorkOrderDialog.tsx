import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CreateTicketData, TicketPriority } from "@/hooks/useMaintenanceTickets";

const formSchema = z.object({
  location_id: z.string().min(1, "Location is required"),
  spot_id: z.string().optional(),
  issue_type: z.string().min(1, "Issue type is required").max(100, "Issue type too long"),
  description: z.string().max(1000, "Description too long").optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTicketData) => void;
  isSubmitting?: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface Spot {
  id: string;
  name: string;
  location_id: string;
}

export function NewWorkOrderDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: NewWorkOrderDialogProps) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [filteredSpots, setFilteredSpots] = useState<Spot[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location_id: "",
      spot_id: "",
      issue_type: "",
      description: "",
      priority: "medium",
      due_date: undefined,
    },
  });

  const selectedLocationId = form.watch("location_id");

  // Fetch locations and spots
  useEffect(() => {
    async function fetchData() {
      const [locationsRes, spotsRes] = await Promise.all([
        supabase.from("locations").select("id, name").order("name"),
        supabase.from("spots").select("id, name, location_id").order("name"),
      ]);

      if (locationsRes.data) setLocations(locationsRes.data);
      if (spotsRes.data) setSpots(spotsRes.data);
    }
    if (open) fetchData();
  }, [open]);

  // Filter spots by selected location
  useEffect(() => {
    if (selectedLocationId) {
      setFilteredSpots(spots.filter((s) => s.location_id === selectedLocationId));
    } else {
      setFilteredSpots([]);
    }
    form.setValue("spot_id", "");
  }, [selectedLocationId, spots, form]);

  const handleSubmit = (values: FormValues) => {
    const ticketData: CreateTicketData = {
      location_id: values.location_id,
      spot_id: values.spot_id || null,
      issue_type: values.issue_type.trim(),
      description: values.description?.trim() || null,
      priority: values.priority as TicketPriority,
      due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
      reporter_id: user?.id || null,
    };
    onSubmit(ticketData);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Work Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Location */}
            <FormField
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border">
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Spot (optional, depends on location) */}
            {filteredSpots.length > 0 && (
              <FormField
                control={form.control}
                name="spot_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spot (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-input">
                          <SelectValue placeholder="Select spot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        {filteredSpots.map((spot) => (
                          <SelectItem key={spot.id} value={spot.id}>
                            {spot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Issue Type */}
            <FormField
              control={form.control}
              name="issue_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Type *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Machine jam, Coin mechanism"
                      className="bg-background border-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date */}
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-background border-input",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the issue..."
                      className="bg-background border-input resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Work Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
