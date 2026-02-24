import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Eye, RotateCcw, CalendarIcon, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

export default function VisitsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedSpot, setSelectedSpot] = useState<string>("all");
  const [reverseVisitId, setReverseVisitId] = useState<string | null>(null);

  // Fetch visits from DB
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['spot-visits-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spot_visits')
        .select(`
          id,
          visit_date,
          visit_type,
          total_cash_collected,
          status,
          notes,
          spot:spots!spot_visits_spot_id_fkey(
            id,
            name,
            location:locations!spots_location_id_fkey(id, name)
          ),
          operator:user_profiles!spot_visits_operator_id_fkey(
            first_names,
            last_names
          )
        `)
        .order('visit_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch unique locations/spots for filters
  const locations = [...new Set(visits.map((v: any) => v.spot?.location?.name).filter(Boolean))];
  const spots = [...new Set(visits.map((v: any) => v.spot?.name).filter(Boolean))];

  // Rollback mutation
  const reverseVisit = useMutation({
    mutationFn: async (visitId: string) => {
      // Get current user for ledger entries
      const { data: { user } } = await supabase.auth.getUser();
      const performedBy = user?.id || null;

      // 1. Fetch snapshots
      const { data: snapshots, error: snapErr } = await supabase
        .from('visit_slot_snapshots' as any)
        .select('*')
        .eq('visit_id', visitId);
      if (snapErr) throw snapErr;

      // 2. Fetch visit line items BEFORE deleting (needed for warehouse reversal)
      const { data: lineItems, error: lineErr } = await supabase
        .from('visit_line_items')
        .select('id, slot_id, product_id, action_type, quantity_added, quantity_removed')
        .eq('spot_visit_id', visitId);
      if (lineErr) throw lineErr;

      // 3. Find source warehouse
      const { data: warehouses } = await supabase
        .from('warehouses')
        .select('id, is_system')
        .eq('is_system', false)
        .limit(1);
      const sourceWarehouseId = warehouses?.[0]?.id || null;

      // Helper: get latest running balance from ledger
      const getBalance = async (itemId: string, whId: string | null, slotId: string | null) => {
        let query = supabase
          .from('inventory_ledger' as any)
          .select('running_balance')
          .eq('item_detail_id', itemId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (whId) query = query.eq('warehouse_id', whId);
        else query = query.is('warehouse_id', null);
        if (slotId) query = query.eq('slot_id', slotId);
        else query = query.is('slot_id', null);
        const { data } = await query.maybeSingle();
        return (data as any)?.running_balance ?? 0;
      };

      // 4. Reverse warehouse inventory changes + write ledger entries
      if (sourceWarehouseId && lineItems && lineItems.length > 0) {
        for (const li of lineItems as any[]) {
          if (!li.product_id) continue;

          // Undo refill: add back to warehouse
          if ((li.quantity_added || 0) > 0) {
            const { data: existing } = await supabase
              .from('inventory')
              .select('id, quantity_on_hand')
              .eq('item_detail_id', li.product_id)
              .eq('warehouse_id', sourceWarehouseId)
              .maybeSingle();
            if (existing) {
              const newQty = (existing.quantity_on_hand || 0) + li.quantity_added;
              await supabase.from('inventory').update({
                quantity_on_hand: newQty,
                last_updated: new Date().toISOString(),
              }).eq('id', existing.id);
            }
            // Ledger: warehouse gets stock back
            const whBal = await getBalance(li.product_id, sourceWarehouseId, null);
            await supabase.from('inventory_ledger' as any).insert({
              item_detail_id: li.product_id,
              warehouse_id: sourceWarehouseId,
              movement_type: 'reversal',
              quantity: li.quantity_added,
              running_balance: whBal + li.quantity_added,
              reference_id: visitId,
              reference_type: 'visit',
              performed_by: performedBy,
              notes: 'Reversal: refill undone',
            });
          }

          // Undo removal: deduct from warehouse
          if ((li.quantity_removed || 0) > 0 && li.action_type !== 'swap') {
            const { data: existing } = await supabase
              .from('inventory')
              .select('id, quantity_on_hand')
              .eq('item_detail_id', li.product_id)
              .eq('warehouse_id', sourceWarehouseId)
              .maybeSingle();
            if (existing) {
              const newQty = (existing.quantity_on_hand || 0) - li.quantity_removed;
              await supabase.from('inventory').update({
                quantity_on_hand: newQty,
                last_updated: new Date().toISOString(),
              }).eq('id', existing.id);
            }
            // Ledger: warehouse loses returned stock
            const whBal = await getBalance(li.product_id, sourceWarehouseId, null);
            await supabase.from('inventory_ledger' as any).insert({
              item_detail_id: li.product_id,
              warehouse_id: sourceWarehouseId,
              movement_type: 'reversal',
              quantity: -li.quantity_removed,
              running_balance: whBal - li.quantity_removed,
              reference_id: visitId,
              reference_type: 'visit',
              performed_by: performedBy,
              notes: 'Reversal: removal undone',
            });
          }
        }

        // Undo swap returns
        if (snapshots && snapshots.length > 0) {
          for (const snap of snapshots as any[]) {
            const li = (lineItems as any[]).find((l: any) => l.slot_id === snap.slot_id);
            if (li?.action_type === 'swap' && snap.previous_product_id && snap.previous_product_id !== li.product_id) {
              const returnQty = snap.previous_stock || 0;
              if (returnQty > 0) {
                const { data: existing } = await supabase
                  .from('inventory')
                  .select('id, quantity_on_hand')
                  .eq('item_detail_id', snap.previous_product_id)
                  .eq('warehouse_id', sourceWarehouseId)
                  .maybeSingle();
                if (existing) {
                  await supabase.from('inventory').update({
                    quantity_on_hand: (existing.quantity_on_hand || 0) - returnQty,
                    last_updated: new Date().toISOString(),
                  }).eq('id', existing.id);
                }
                // Ledger: swap return reversed
                const whBal = await getBalance(snap.previous_product_id, sourceWarehouseId, null);
                await supabase.from('inventory_ledger' as any).insert({
                  item_detail_id: snap.previous_product_id,
                  warehouse_id: sourceWarehouseId,
                  movement_type: 'reversal',
                  quantity: -returnQty,
                  running_balance: whBal - returnQty,
                  reference_id: visitId,
                  reference_type: 'visit',
                  performed_by: performedBy,
                  notes: 'Reversal: swap return undone',
                });
              }
            }
          }
        }
      }

      // 5. Write slot reversal ledger entries BEFORE restoring slots
      if (snapshots && snapshots.length > 0) {
        for (const snap of snapshots as any[]) {
          const li = (lineItems as any[]).find((l: any) => l.slot_id === snap.slot_id);
          const productId = li?.product_id || snap.previous_product_id;
          if (productId) {
            const slotBal = await getBalance(productId, null, snap.slot_id);
            const restoredStock = snap.previous_stock || 0;
            await supabase.from('inventory_ledger' as any).insert({
              item_detail_id: productId,
              slot_id: snap.slot_id,
              movement_type: 'reversal',
              quantity: restoredStock - slotBal,
              running_balance: restoredStock,
              reference_id: visitId,
              reference_type: 'visit',
              performed_by: performedBy,
              notes: 'Reversal: slot restored to pre-visit state',
            });
          }
        }
      }

      // 6. Restore each machine slot from snapshot
      if (snapshots && snapshots.length > 0) {
        for (const snap of snapshots as any[]) {
          await supabase.from('machine_slots').update({
            current_product_id: snap.previous_product_id,
            current_stock: snap.previous_stock,
            capacity: snap.previous_capacity,
            coin_acceptor: snap.previous_coin_acceptor,
          }).eq('id', snap.slot_id);
        }
      }

      // 7. Delete visit line items
      await supabase
        .from('visit_line_items')
        .delete()
        .eq('spot_visit_id', visitId);

      // 8. Mark visit as reversed
      const { error: updateErr } = await supabase
        .from('spot_visits')
        .update({ status: 'reversed' as any })
        .eq('id', visitId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spot-visits-list'] });
      queryClient.invalidateQueries({ queryKey: ['machine-slots'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['consolidated-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['item-warehouse-stock'] });
      queryClient.invalidateQueries({ queryKey: ['item-machine-stock'] });
      queryClient.invalidateQueries({ queryKey: ['item-logistics-history'] });
      queryClient.invalidateQueries({ queryKey: ['item-inventory-ledger'] });
      toast.success("Visit reversed successfully. Machine slots and warehouse inventory restored.");
      setReverseVisitId(null);
    },
    onError: (error) => {
      toast.error(`Reversal failed: ${error.message}`);
      setReverseVisitId(null);
    },
  });

  const filteredVisits = visits.filter((visit: any) => {
    if (selectedLocation !== "all" && visit.spot?.location?.name !== selectedLocation) return false;
    if (selectedSpot !== "all" && visit.spot?.name !== selectedSpot) return false;
    if (dateRange?.from) {
      const visitDate = new Date(visit.visit_date);
      if (visitDate < dateRange.from) return false;
      if (dateRange.to && visitDate > dateRange.to) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'reversed') return <Badge variant="destructive">Reversed</Badge>;
    if (status === 'flagged') return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Flagged</Badge>;
    return <Badge variant="secondary">Completed</Badge>;
  };

  return (
    <AppLayout
      title="Visit Reports"
      subtitle="Track and manage field service visits"
      actions={
        <Button className="gap-2" onClick={() => navigate("/visits/new")}>
          <Plus className="w-4 h-4" />
          New Visit Report
        </Button>
      }
    >
      {/* Filters */}
      <Card className="p-4 mb-6 bg-card border-border">
        <div className="flex flex-col lg:flex-row gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[280px]",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Select date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSpot} onValueChange={setSelectedSpot}>
            <SelectTrigger className="min-w-[140px]">
              <SelectValue placeholder="All Spots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Spots</SelectItem>
              {spots.map((spot) => (
                <SelectItem key={spot} value={spot}>
                  {spot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(dateRange || selectedLocation !== "all" || selectedSpot !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateRange(undefined);
                setSelectedLocation("all");
                setSelectedSpot("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* Visits Table */}
      <Card className="bg-card border-border">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Location</TableHead>
                <TableHead className="text-muted-foreground">Spot</TableHead>
                <TableHead className="text-muted-foreground">Operator</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground text-right">Cash Collected</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No visit reports found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVisits.map((visit: any) => (
                  <TableRow key={visit.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">
                      {visit.visit_date ? format(new Date(visit.visit_date), "MMM dd, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-foreground truncate max-w-[180px]">
                      {visit.spot?.location?.name || "—"}
                    </TableCell>
                    <TableCell className="text-foreground">{visit.spot?.name || "—"}</TableCell>
                    <TableCell className="text-foreground">
                      {visit.operator
                        ? `${visit.operator.first_names || ""} ${visit.operator.last_names || ""}`.trim() || "—"
                        : "—"}
                    </TableCell>
                    <TableCell className="text-foreground capitalize">
                      {visit.visit_type?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      ${(visit.total_cash_collected || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(visit.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && visit.status !== 'reversed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setReverseVisitId(visit.id)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Reverse Visit Confirmation Dialog */}
      <AlertDialog open={!!reverseVisitId} onOpenChange={(open) => !open && setReverseVisitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse This Visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all machine slots to their pre-visit state and mark this visit as "reversed."
              The visit record will be kept for audit purposes but all inventory changes will be undone.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverseVisit.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reverseVisit.isPending}
              onClick={() => reverseVisitId && reverseVisit.mutate(reverseVisitId)}
            >
              {reverseVisit.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reversing...</>
              ) : (
                "Yes, Reverse Visit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
