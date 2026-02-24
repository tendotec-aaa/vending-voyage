import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  MapPin,
  User,
  CalendarIcon,
  DollarSign,
  Package,
  Wrench,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch visit with relations
  const { data: visit, isLoading } = useQuery({
    queryKey: ["visit-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("spot_visits")
        .select(
          `
          *,
          spot:spots!spot_visits_spot_id_fkey(
            id, name,
            location:locations!spots_location_id_fkey(id, name, address)
          ),
          operator:user_profiles!spot_visits_operator_id_fkey(
            first_names, last_names, email
          )
        `
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch line items with product and slot info
  const { data: lineItems = [] } = useQuery({
    queryKey: ["visit-line-items", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("visit_line_items")
        .select(
          `
          *,
          product:item_details!visit_line_items_product_id_fkey(id, name, sku),
          slot:machine_slots!visit_line_items_slot_id_fkey(
            id, slot_number,
            machine:machines!machine_slots_machine_id_fkey(serial_number, position_on_setup)
          )
        `
        )
        .eq("spot_visit_id", id)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch snapshots for before/after comparison
  const { data: snapshots = [] } = useQuery({
    queryKey: ["visit-snapshots", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("visit_slot_snapshots" as any)
        .select("*")
        .eq("visit_id", id);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  // Fetch maintenance tickets created from this visit
  const { data: tickets = [] } = useQuery({
    queryKey: ["visit-tickets", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("id, issue_type, priority, status, description")
        .eq("visit_id", id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch inventory adjustments from this visit
  const { data: adjustments = [] } = useQuery({
    queryKey: ["visit-adjustments", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("inventory_adjustments")
        .select(
          `
          *,
          item:item_details!inventory_adjustments_item_detail_id_fkey(name, sku)
        `
        )
        .eq("visit_id", id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    if (status === "reversed")
      return <Badge variant="destructive">Reversed</Badge>;
    if (status === "flagged")
      return (
        <Badge
          variant="outline"
          className="border-yellow-500 text-yellow-600"
        >
          Flagged
        </Badge>
      );
    return <Badge variant="secondary">Completed</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      low: "bg-muted text-muted-foreground",
      medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      high: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      urgent: "bg-red-500/20 text-red-700 dark:text-red-400",
    };
    return (
      <Badge className={map[priority] || ""} variant="outline">
        {priority}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <AppLayout title="Visit Report">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!visit) {
    return (
      <AppLayout title="Visit Report">
        <div className="text-center py-12 text-muted-foreground">
          Visit not found.
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate("/visits")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Visits
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const operatorName = visit.operator
    ? `${visit.operator.first_names || ""} ${visit.operator.last_names || ""}`.trim()
    : "Unknown";

  const totalCash = visit.total_cash_collected || 0;
  const totalRefilled = lineItems.reduce(
    (sum: number, li: any) => sum + (li.quantity_added || 0),
    0
  );
  const totalRemoved = lineItems.reduce(
    (sum: number, li: any) => sum + (li.quantity_removed || 0),
    0
  );

  return (
    <AppLayout
      title="Visit Report"
      subtitle={`${(visit as any).spot?.location?.name || ""} — ${(visit as any).spot?.name || ""}`}
      actions={
        <Button variant="outline" onClick={() => navigate("/visits")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> Date
              </span>
              <span className="text-sm font-medium text-foreground">
                {visit.visit_date
                  ? format(new Date(visit.visit_date), "MMM dd, yyyy")
                  : "—"}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Operator
              </span>
              <span className="text-sm font-medium text-foreground">
                {operatorName}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Cash Collected
              </span>
              <span className="text-sm font-semibold text-foreground">
                ${totalCash.toFixed(2)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <div>{getStatusBadge(visit.status)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Visit Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Visit Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="font-medium text-foreground">
                  {(visit as any).spot?.location?.name || "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Spot</span>
                <p className="font-medium text-foreground">
                  {(visit as any).spot?.name || "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Visit Type</span>
                <p className="font-medium text-foreground capitalize">
                  {visit.visit_type?.replace(/_/g, " ") || "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Address</span>
                <p className="font-medium text-foreground">
                  {(visit as any).spot?.location?.address || "—"}
                </p>
              </div>
            </div>
            {visit.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="text-sm text-foreground mt-1">{visit.notes}</p>
                </div>
              </>
            )}
            {visit.verification_photo_url && (
              <>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Verification Photo
                  </span>
                  <img
                    src={visit.verification_photo_url}
                    alt="Verification"
                    className="mt-2 rounded-md max-h-64 object-contain border border-border"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" /> Slot Activity
                <Badge variant="secondary" className="ml-auto text-xs">
                  {lineItems.length} slot{lineItems.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Slot</TableHead>
                    <TableHead className="text-muted-foreground">Machine</TableHead>
                    <TableHead className="text-muted-foreground">Product</TableHead>
                    <TableHead className="text-muted-foreground">Action</TableHead>
                    <TableHead className="text-muted-foreground text-right">Added</TableHead>
                    <TableHead className="text-muted-foreground text-right">Removed</TableHead>
                    <TableHead className="text-muted-foreground text-right">Cash</TableHead>
                    <TableHead className="text-muted-foreground text-right">Meter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((li: any) => {
                    const snap = snapshots.find(
                      (s: any) => s.slot_id === li.slot_id
                    );
                    return (
                      <TableRow key={li.id} className="border-border">
                        <TableCell className="text-foreground font-medium">
                          #{li.slot?.slot_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {li.slot?.machine?.serial_number || "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {li.product?.name || "—"}
                          {li.action_type === "swap" && snap?.previous_product_id && snap.previous_product_id !== li.product_id && (
                            <span className="block text-xs text-muted-foreground">
                              (swapped)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="capitalize text-xs"
                          >
                            {li.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {li.quantity_added || 0}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {li.quantity_removed || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          ${(li.cash_collected || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {li.meter_reading ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totals row */}
                  <TableRow className="border-border bg-muted/30 font-medium">
                    <TableCell colSpan={4} className="text-foreground">
                      Totals
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {totalRefilled}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {totalRemoved}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      ${totalCash.toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Inventory Adjustments */}
        {adjustments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Inventory Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Item</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground text-right">Expected</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actual</TableHead>
                    <TableHead className="text-muted-foreground text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj: any) => (
                    <TableRow key={adj.id} className="border-border">
                      <TableCell className="text-foreground">
                        {adj.item?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {adj.adjustment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {adj.expected_quantity}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {adj.actual_quantity}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          adj.difference < 0
                            ? "text-destructive"
                            : adj.difference > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-foreground"
                        }`}
                      >
                        {adj.difference > 0 ? "+" : ""}
                        {adj.difference}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Tickets */}
        {tickets.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Maintenance Tickets Created
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tickets.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground capitalize">
                      {ticket.issue_type?.replace(/_/g, " ")}
                    </p>
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground">
                        {ticket.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(ticket.priority)}
                    <Badge variant="secondary" className="capitalize text-xs">
                      {ticket.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
