import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  TrendingUp,
  TrendingDown,
  Clock,
  Building,
  ArrowRightLeft,
  CheckCircle2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { fmt2 } from "@/lib/formatters";

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch visit with relations including location rent data
  const { data: visit, isLoading } = useQuery({
    queryKey: ["visit-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("spot_visits")
        .select(`
          *,
          spot:spots!spot_visits_spot_id_fkey(
            id, name,
            location:locations!spots_location_id_fkey(id, name, address, rent_amount, negotiation_type, commission_percentage)
          ),
          operator:user_profiles!spot_visits_operator_id_fkey(
            first_names, last_names, email
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch previous visit for same spot (fallback for old records without stored fields)
  const spotId = (visit as any)?.spot?.id;
  const hasStoredDays = visit?.days_since_last_visit !== null && visit?.days_since_last_visit !== undefined;
  const { data: previousVisit } = useQuery({
    queryKey: ["previous-visit", spotId, id],
    queryFn: async () => {
      if (!spotId || !id) return null;
      const { data } = await supabase
        .from("spot_visits")
        .select("id, visit_date, created_at")
        .eq("spot_id", spotId)
        .eq("status", "completed")
        .neq("id", id)
        .lte("visit_date", visit!.visit_date!)
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!spotId && !!visit?.visit_date && !hasStoredDays,
  });

  // Fetch line items with product and slot info
  const { data: lineItems = [] } = useQuery({
    queryKey: ["visit-line-items", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("visit_line_items")
        .select(`
          *,
          product:item_details!visit_line_items_product_id_fkey(id, name, sku),
          slot:machine_slots!visit_line_items_slot_id_fkey(
            id, slot_number, current_stock, capacity,
            machine:machines!machine_slots_machine_id_fkey(serial_number, position_on_setup)
          )
        `)
        .eq("spot_visit_id", id)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ["visit-snapshots", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("visit_slot_snapshots" as any)
        .select("*, previous_product:item_details!visit_slot_snapshots_previous_product_id_fkey(id, name)")
        .eq("visit_id", id);
      if (error) {
        // fallback without join if FK doesn't exist
        const { data: d2 } = await supabase
          .from("visit_slot_snapshots" as any)
          .select("*")
          .eq("visit_id", id);
        return (d2 || []) as any[];
      }
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  // Fetch maintenance tickets
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

  // Fetch inventory adjustments
  const { data: adjustments = [] } = useQuery({
    queryKey: ["visit-adjustments", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("inventory_adjustments")
        .select(`*, item:item_details!inventory_adjustments_item_detail_id_fkey(name, sku)`)
        .eq("visit_id", id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch sibling spot count (fallback for old records without stored fields)
  const locationId = (visit as any)?.spot?.location?.id;
  const hasStoredRent = visit?.monthly_rent_per_spot !== null && visit?.monthly_rent_per_spot !== undefined;
  const { data: spotCountData } = useQuery({
    queryKey: ["spot-count", locationId],
    queryFn: async () => {
      if (!locationId) return 1;
      const { count, error } = await supabase
        .from("spots")
        .select("id", { count: "exact", head: true })
        .eq("location_id", locationId);
      if (error) return 1;
      return count || 1;
    },
    enabled: !!locationId && !hasStoredRent,
  });

  // --- Derived data ---
  const getStatusBadge = (status: string) => {
    if (status === "reversed")
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Reversed</Badge>;
    if (status === "flagged")
      return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">Flagged</Badge>;
    return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">Completed</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      low: "bg-muted/50 text-muted-foreground border-border",
      medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
      high: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
      urgent: "bg-destructive/20 text-destructive border-destructive/30",
    };
    return <Badge className={map[priority] || ""} variant="outline">{priority}</Badge>;
  };

  const formatVisitType = (type: string | null) => {
    if (!type) return "—";
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatJamStatus = (s: string | null | undefined) => {
    if (!s || s === "no_jam") return "No Jam";
    if (s === "by_coin") return "Jam (+1 coin)";
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  const totalRefilled = lineItems.reduce((s: number, li: any) => s + (li.quantity_added || 0), 0);
  const totalRemoved = lineItems.reduce((s: number, li: any) => s + (li.quantity_removed || 0), 0);

  // Days since last visit — prefer stored value, fallback to frontend calculation for old records
  const daysSinceLastVisit = (visit as any).days_since_last_visit ?? (
    previousVisit?.visit_date && visit.visit_date
      ? differenceInDays(new Date(visit.visit_date), new Date(previousVisit.visit_date))
      : null
  );

  // Rent analytics — prefer stored values
  const location = (visit as any)?.spot?.location;
  const monthlyRent = (visit as any).monthly_rent_per_spot ?? (
    (location?.rent_amount || 0) / (spotCountData || 1)
  );
  const rentSinceLastVisit = (visit as any).rent_since_last_visit ?? (
    daysSinceLastVisit !== null ? (monthlyRent / 30) * daysSinceLastVisit : null
  );
  const netProfit = rentSinceLastVisit !== null ? totalCash - rentSinceLastVisit : null;

  // Build enriched slot data
  const enrichedSlots = lineItems.map((li: any) => {
    const snap = snapshots.find((s: any) => s.slot_id === li.slot_id);
    const lastStock = snap?.previous_stock ?? null;
    const added = li.quantity_added || 0;
    const removed = li.quantity_removed || 0;
    const falseCoins = li.false_coins ?? 0;
    const jamStatus = li.jam_status ?? "no_jam";
    const auditedCount = li.meter_reading;

    // Use stored values directly when available (preferred - exact match to form submission)
    const unitsSold = li.units_sold ?? 0;
    let currentStock: number | null = li.computed_current_stock ?? null;

    // Fallback for older visits that don't have stored values
    if (currentStock === null) {
      const pricePerUnit = snap?.previous_coin_acceptor || 1;
      const cashCollected = li.cash_collected || 0;
      const jamAdjustment = jamStatus === "by_coin" ? 1 : 0;
      const fallbackUnitsSold = pricePerUnit > 0 ? Math.round((cashCollected / pricePerUnit) - jamAdjustment) : 0;
      if (auditedCount !== null && visit.visit_type === "inventory_audit") {
        currentStock = auditedCount;
      } else if (lastStock !== null) {
        currentStock = lastStock - fallbackUnitsSold + jamAdjustment - falseCoins + added - removed;
      }
    }

    const capacity = snap?.previous_capacity || li.slot?.capacity || 150;
    const fillPct = currentStock !== null && capacity > 0 ? Math.round((currentStock / capacity) * 100) : null;
    const surplusShortage = auditedCount !== null && currentStock !== null && visit.visit_type !== "inventory_audit" ? auditedCount - currentStock : null;
    const isSwapped = li.action_type === "swap" && snap?.previous_product_id && snap.previous_product_id !== li.product_id;
    const previousProductName = isSwapped ? (snap?.previous_product?.name || "Previous product") : null;

    return {
      id: li.id,
      slotNumber: li.slot?.slot_number,
      serialNumber: li.slot?.machine?.serial_number || "—",
      productName: li.product?.name || "—",
      actionType: li.action_type,
      lastStock,
      currentStock,
      auditedCount,
      fillPct,
      added,
      removed,
      unitsSold,
      cashCollected: li.cash_collected || 0,
      falseCoins,
      jamStatus,
      surplusShortage,
      isSwapped,
      previousProductName,
      capacity,
    };
  });

  const getDaysColor = (days: number | null) => {
    if (days === null) return "text-muted-foreground";
    if (days < 15) return "text-green-600 dark:text-green-400";
    if (days <= 30) return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  return (
    <AppLayout
      title="Visit Report"
      subtitle={`${location?.name || ""} — ${(visit as any).spot?.name || ""}`}
      actions={
        <Button variant="outline" onClick={() => navigate("/visits")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* Row 1: Core Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> Date
              </span>
              <span className="text-sm font-medium text-foreground">
                {visit.visit_date ? format(new Date(visit.visit_date), "MMM dd, yyyy") : "—"}
              </span>
              <span className="text-xs text-muted-foreground">{formatVisitType(visit.visit_type)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Operator
              </span>
              <span className="text-sm font-medium text-foreground">{operatorName}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Cash Collected
              </span>
              <span className="text-sm font-semibold text-foreground">${fmt2(totalCash)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <div>{getStatusBadge(visit.status || "completed")}</div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Analytics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Days Since Last Visit
              </span>
              <span className={`text-sm font-semibold ${getDaysColor(daysSinceLastVisit)}`}>
                {daysSinceLastVisit !== null ? `${daysSinceLastVisit} days` : "First visit"}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Building className="w-3 h-3" /> Monthly Rent (per spot)
              </span>
              <span className="text-sm font-medium text-foreground">${fmt2(monthlyRent)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Rent Since Last Visit
              </span>
              <span className="text-sm font-medium text-foreground">
                {rentSinceLastVisit !== null ? `$${fmt2(rentSinceLastVisit)}` : "—"}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {netProfit !== null && netProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                Net Profit
              </span>
              <span className={`text-sm font-semibold ${netProfit !== null ? (netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive") : "text-muted-foreground"}`}>
                {netProfit !== null ? `$${fmt2(netProfit)}` : "—"}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Profitability Card */}
        {rentSinceLastVisit !== null && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Profitability Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Revenue</span>
                  <p className="font-semibold text-foreground">${fmt2(totalCash)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Rent Accrued</span>
                  <p className="font-semibold text-foreground">${fmt2(rentSinceLastVisit)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Gross Profit</span>
                  <p className={`font-semibold ${netProfit! >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    ${fmt2(netProfit!)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Units Added / Removed</span>
                  <p className="font-semibold text-foreground">{totalRefilled} / {totalRemoved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                <p className="font-medium text-foreground">{location?.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Spot</span>
                <p className="font-medium text-foreground">{(visit as any).spot?.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Visit Type</span>
                <p className="font-medium text-foreground">{formatVisitType(visit.visit_type)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Address</span>
                <p className="font-medium text-foreground">{location?.address || "—"}</p>
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

        {/* Slot Activity Cards */}
        {enrichedSlots.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-foreground" />
              <h3 className="text-base font-semibold text-foreground">Slot Activity</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {enrichedSlots.length} slot{enrichedSlots.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {enrichedSlots.map((slot) => (
                <Card key={slot.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{slot.serialNumber}</span>
                          <span className="text-xs text-muted-foreground">Slot #{slot.slotNumber ?? "?"}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate mt-0.5">{slot.productName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-xs capitalize">
                          {formatVisitType(visit.visit_type)}
                        </Badge>
                        {slot.isSwapped && (
                          <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30 text-xs">
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            Swapped
                          </Badge>
                        )}
                      </div>
                    </div>

                    {slot.isSwapped && slot.previousProductName && (
                      <p className="text-xs text-muted-foreground">
                        Previously: <span className="font-medium">{slot.previousProductName}</span>
                      </p>
                    )}

                    <Separator />

                    {/* Stock row */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Last Stock</span>
                        <span className="text-sm font-medium text-foreground">{slot.lastStock ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Current</span>
                        <span className="text-sm font-medium text-foreground">{slot.currentStock ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Audited</span>
                        <span className="text-sm font-medium text-foreground">{slot.auditedCount ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Fill %</span>
                        {slot.fillPct !== null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-sm font-medium text-foreground">{slot.fillPct}%</span>
                            <Progress value={slot.fillPct} className="h-1 w-full" />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Movement row */}
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Sold</span>
                        <span className="text-sm font-medium text-foreground">{slot.unitsSold}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Added</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{slot.added > 0 ? `+${slot.added}` : "0"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Removed</span>
                        <span className="text-sm font-medium text-destructive">{slot.removed > 0 ? `-${slot.removed}` : "0"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">False Coins</span>
                        <span className="text-sm font-medium text-foreground">{slot.falseCoins}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Jam</span>
                        <span className="text-xs font-medium text-foreground">{formatJamStatus(slot.jamStatus)}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Bottom row */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground text-xs">
                          Cash: <span className="font-semibold text-foreground">${fmt2(slot.cashCollected)}</span>
                        </span>
                        {slot.surplusShortage !== null && (
                          <span className={`text-xs font-medium ${slot.surplusShortage > 0 ? "text-green-600 dark:text-green-400" : slot.surplusShortage < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {slot.surplusShortage > 0 ? "+" : ""}{slot.surplusShortage} {slot.surplusShortage > 0 ? "surplus" : slot.surplusShortage < 0 ? "shortage" : "exact"}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Totals bar */}
            <Card className="mt-3">
              <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-foreground">Totals</span>
                <div className="flex flex-wrap gap-4">
                  <span className="text-muted-foreground">Added: <span className="font-medium text-foreground">{totalRefilled}</span></span>
                  <span className="text-muted-foreground">Removed: <span className="font-medium text-foreground">{totalRemoved}</span></span>
                  <span className="text-muted-foreground">Cash: <span className="font-semibold text-foreground">${fmt2(totalCash)}</span></span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inventory Adjustments */}
        {adjustments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Inventory Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {adjustments.map((adj: any) => (
                <div key={adj.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm">
                  <div>
                    <span className="font-medium text-foreground">{adj.item?.name || "—"}</span>
                    <Badge variant="outline" className="ml-2 capitalize text-xs">{adj.adjustment_type}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Expected: {adj.expected_quantity}</span>
                    <span className="text-muted-foreground">Actual: {adj.actual_quantity}</span>
                    <span className={`font-semibold ${adj.difference < 0 ? "text-destructive" : adj.difference > 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                      {adj.difference > 0 ? "+" : ""}{adj.difference}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Maintenance Tickets - Always visible */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Maintenance Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length > 0 ? (
              <div className="space-y-2">
                {tickets.map((ticket: any) => (
                  <div key={ticket.id} className="flex items-start justify-between p-3 rounded-md border border-border bg-muted/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{ticket.issue_type}</span>
                        {getPriorityBadge(ticket.priority)}
                        <Badge variant="outline" className="capitalize text-xs">{ticket.status}</Badge>
                      </div>
                      {ticket.description && (
                        <p className="text-xs text-muted-foreground">{ticket.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                No maintenance issues reported
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
