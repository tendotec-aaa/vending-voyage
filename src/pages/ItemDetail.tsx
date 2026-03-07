import { fmt2, fmt3, fmtPct } from "@/lib/formatters";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Save, X, Camera, Upload, Trash2, DollarSign, Warehouse, Truck, ShoppingCart, AlertTriangle, Copy, Check, ChevronDown, Undo2 } from "lucide-react";
import { WarehouseSaleDialog } from "@/components/inventory/WarehouseSaleDialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useCategories } from "@/hooks/useCategories";
import { useItemTypes } from "@/hooks/useItemTypes";
import { format } from "date-fns";

const typeColors: Record<string, string> = {
  merchandise: "bg-primary/10 text-primary border-primary/20",
  machine_model: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  spare_part: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  supply: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const actionColors: Record<string, string> = {
  restock: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  collection: "bg-primary/10 text-primary border-primary/20",
  service: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  swap: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const movementColors: Record<string, string> = {
  receive: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  refill: "bg-primary/10 text-primary border-primary/20",
  removal: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  sale: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  swap_in: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  swap_out: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  reversal: "bg-destructive/10 text-destructive border-destructive/20",
  adjustment: "bg-chart-5/20 text-chart-5 border-chart-5/30",
  transfer: "bg-primary/10 text-primary border-primary/20",
  initial: "bg-muted text-muted-foreground border-border",
  assembly_production: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  assembly_consumption: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  warehouse_sale: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { categories, getSubcategoriesByCategory } = useCategories();
  const { itemTypes, isLoading: itemTypesLoading } = useItemTypes();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Item type editing state
  const [pendingItemTypeId, setPendingItemTypeId] = useState<string | null>(null);
  const [showItemTypeConfirm1, setShowItemTypeConfirm1] = useState(false);
  const [showItemTypeConfirm2, setShowItemTypeConfirm2] = useState(false);
  // Discrepancy management state
  const [showResolveDialog, setShowResolveDialog] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [showVisualDialog, setShowVisualDialog] = useState(false);
  const [visualNote, setVisualNote] = useState("");
  const [visualDate, setVisualDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [visualQuantity, setVisualQuantity] = useState(0);
  const [visualType, setVisualType] = useState<"shortage" | "surplus">("shortage");
  const [discrepancyProcessing, setDiscrepancyProcessing] = useState(false);
  const [showReverseConfirm, setShowReverseConfirm] = useState<any>(null);
  const [reversingEntry, setReversingEntry] = useState(false);
  const [showWarehouseSale, setShowWarehouseSale] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    subcategory_id: "",
  });

  // --- Existing queries ---
  const { data: item, isLoading } = useQuery({
    queryKey: ["item-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_details")
        .select(`*, category:categories(id, name), subcategory:subcategories(id, name)`)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: warehouseStock = [] } = useQuery({
    queryKey: ["item-warehouse-stock", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, quantity_on_hand, warehouse_id, warehouse:warehouses(id, name)")
        .eq("item_detail_id", id!)
        .not("warehouse_id", "is", null);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: machineStock = [] } = useQuery({
    queryKey: ["item-machine-stock", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_slots")
        .select("current_stock, machine:machines(serial_number)")
        .eq("current_product_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: purchaseBatches = [] } = useQuery({
    queryKey: ["item-purchase-batches", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_items")
        .select(`
          id, quantity_ordered, quantity_received, quantity_remaining,
          unit_cost, landed_unit_cost, active_item, arrival_order, final_unit_cost,
          purchase_id,
          purchase:purchases(id, purchase_order_number, status, created_at, received_at)
        `)
        .eq("item_detail_id", id!)
        .order("arrival_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch assemblies that produced this item (for assembled items)
  const { data: itemAssemblies = [] } = useQuery({
    queryKey: ["item-assemblies", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assemblies")
        .select("id, assembly_number, created_at, status, output_quantity, final_unit_cost")
        .eq("output_item_detail_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // --- New queries ---
  const { data: salesData } = useQuery({
    queryKey: ["item-sales-total", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_line_items")
        .select("units_sold, cash_collected, quantity_added, quantity_removed, false_coins, jam_status")
        .eq("product_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: logisticsHistory = [] } = useQuery({
    queryKey: ["item-logistics-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_line_items")
        .select(`
          id, spot_visit_id, slot_id, action_type, quantity_added, quantity_removed,
          cash_collected, meter_reading, units_sold, computed_current_stock,
          false_coins, jam_status, created_at,
          spot_visit:spot_visits(
            id, visit_date, status,
            spot:spots(name, location:locations(name))
          )
        `)
        .eq("product_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["item-visit-snapshots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visit_slot_snapshots")
        .select("visit_id, slot_id, previous_stock, previous_product_id")
        .eq("previous_product_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ["item-inventory-ledger", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_ledger")
        .select(`
          id, created_at, movement_type, quantity, running_balance,
          reference_id, reference_type, notes,
          warehouse_id, slot_id, performed_by
        `)
        .eq("item_detail_id", id!)
        .not("warehouse_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Resolve ledger reference dates (visit_date for visits, received_at for purchases)
  const ledgerRefIds = ledgerEntries
    .filter((e) => e.reference_id && e.reference_type)
    .map((e) => ({ id: e.reference_id!, type: e.reference_type! }));
  const visitRefIds = [...new Set(ledgerRefIds.filter((r) => r.type === "visit").map((r) => r.id))];
  const purchaseRefIds = [...new Set(ledgerRefIds.filter((r) => r.type === "purchase").map((r) => r.id))];

  const { data: visitDatesMap = {} } = useQuery({
    queryKey: ["ledger-visit-dates", visitRefIds],
    queryFn: async () => {
      if (visitRefIds.length === 0) return {};
      const { data } = await supabase
        .from("spot_visits")
        .select("id, visit_date")
        .in("id", visitRefIds);
      const map: Record<string, string> = {};
      (data || []).forEach((v: any) => { if (v.visit_date) map[v.id] = v.visit_date; });
      return map;
    },
    enabled: visitRefIds.length > 0,
  });

  const { data: purchaseDatesMap = {} } = useQuery({
    queryKey: ["ledger-purchase-dates", purchaseRefIds],
    queryFn: async () => {
      if (purchaseRefIds.length === 0) return {};
      const { data } = await supabase
        .from("purchases")
        .select("id, received_at, created_at")
        .in("id", purchaseRefIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.received_at || p.created_at; });
      return map;
    },
    enabled: purchaseRefIds.length > 0,
  });

  // Stock discrepancies
  const { data: discrepancies = [], refetch: refetchDiscrepancies } = useQuery({
    queryKey: ["stock-discrepancies", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_discrepancy" as any)
        .select("*")
        .eq("item_detail_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Machine deployment history for machine_model items
  const { data: machineDeployments = [] } = useQuery({
    queryKey: ["item-machine-deployments", id],
    queryFn: async () => {
      const { data: machines, error } = await supabase
        .from("machines")
        .select(`
          id, serial_number, status, created_at,
          setup:setups(id, name, spot:spots(id, name, location:locations(id, name)))
        `)
        .eq("model_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return machines;
    },
    enabled: !!id && item?.type === "machine_model",
  });

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        description: item.description || "",
        category_id: item.category_id || "",
        subcategory_id: item.subcategory_id || "",
      });
    }
  }, [item]);

  const subcategories = getSubcategoriesByCategory(form.category_id || undefined);

  const updateItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("item_details")
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category_id: form.category_id || null,
          subcategory_id: form.subcategory_id || null,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["consolidated-inventory"] });
      setIsEditing(false);
      toast({ title: "Item updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${id}/photo.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("item-photos").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("item_details")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
      toast({ title: "Photo uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!id || !item?.photo_url) return;
    try {
      const { error } = await supabase
        .from("item_details")
        .update({ photo_url: null })
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
      toast({ title: "Photo removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCopyId = () => {
    if (!item) return;
    navigator.clipboard.writeText(item.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateItemType = useMutation({
    mutationFn: async (newItemTypeId: string) => {
      const { error } = await supabase
        .from("item_details")
        .update({ item_type_id: newItemTypeId } as any)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["item_types"] });
      toast({ title: "Item type updated successfully" });
      setPendingItemTypeId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleItemTypeChange = (newItemTypeId: string) => {
    if (newItemTypeId === (item?.item_type_id || "")) return;
    setPendingItemTypeId(newItemTypeId);
    setShowItemTypeConfirm1(true);
  };

  const handleConfirm1 = () => {
    setShowItemTypeConfirm1(false);
    setShowItemTypeConfirm2(true);
  };

  const handleConfirm2 = () => {
    setShowItemTypeConfirm2(false);
    if (pendingItemTypeId) {
      updateItemType.mutate(pendingItemTypeId);
    }
  };

  const handleCancelItemType = () => {
    setShowItemTypeConfirm1(false);
    setShowItemTypeConfirm2(false);
    setPendingItemTypeId(null);
  };

  // --- Discrepancy handlers ---
  const handleResolveDiscrepancy = async (discrepancyId: string) => {
    if (!id) return;
    setDiscrepancyProcessing(true);
    try {
      const disc = (discrepancies as any[]).find((d: any) => d.id === discrepancyId);
      if (!disc) throw new Error("Discrepancy not found");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // The adjustment corrects the difference — if shortage, it's negative
      const adjustmentDiff = disc.difference;

      // Update discrepancy status
      await supabase
        .from("stock_discrepancy" as any)
        .update({
          status: "resolved",
          admin_note: resolveNote || "Resolved by admin",
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id || null,
        } as any)
        .eq("id", discrepancyId);

      queryClient.invalidateQueries({ queryKey: ["stock-discrepancies", id] });
      queryClient.invalidateQueries({ queryKey: ["item-inventory-ledger", id] });
      setShowResolveDialog(null);
      setResolveNote("");
      toast({ title: "Discrepancy resolved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDiscrepancyProcessing(false);
    }
  };

  const handleReportVisualDiscrepancy = async () => {
    if (!id) return;
    setDiscrepancyProcessing(true);
    try {
      const discrepancyAmount = visualQuantity;
      if (discrepancyAmount <= 0) {
        toast({ title: "Invalid amount", description: "Enter a positive discrepancy amount.", variant: "destructive" });
        setDiscrepancyProcessing(false);
        return;
      }

      // shortage = we're missing units, so inventory goes DOWN → negative difference
      // surplus = we found extra units, so inventory goes UP → positive difference
      const difference = visualType === "shortage" ? -discrepancyAmount : discrepancyAmount;
      // Use warehouse stock only (not totalStock which includes deployed units in machine slots)
      const warehouseTotal = warehouseStock.reduce((s, i) => s + (i.quantity_on_hand || 0), 0);
      const actualQuantity = warehouseTotal + difference;
      const noteText = visualNote || `Visual reconciliation: ${visualType === "shortage" ? "Shortage" : "Surplus"} of ${discrepancyAmount} units detected. Warehouse had ${warehouseTotal}, adjusted to ${actualQuantity}.`;

      // 1. Create stock_discrepancy record (auto-resolved)
      const { error: discError } = await supabase.from("stock_discrepancy" as any).insert({
        item_detail_id: id,
        occurrence_date: visualDate,
        discrepancy_type: "visual",
        expected_quantity: warehouseTotal,
        actual_quantity: actualQuantity,
        difference,
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id || null,
        admin_note: noteText,
      } as any);
      if (discError) throw new Error(`Failed to create discrepancy record: ${discError.message}`);

      // 2. Get the current running balance from the latest WAREHOUSE ledger entry
      const warehouseId = warehouseStock.length > 0 ? warehouseStock[0].warehouse_id : null;
      let currentBalance = warehouseTotal;
      if (warehouseId) {
        const { data: lastLedger } = await supabase
          .from("inventory_ledger")
          .select("running_balance")
          .eq("item_detail_id", id)
          .eq("warehouse_id", warehouseId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (lastLedger) currentBalance = lastLedger.running_balance;
      }
      const newBalance = currentBalance + difference;

      // 3. Insert inventory_ledger entry (adjustment movement)
      const { error: ledgerError } = await supabase.from("inventory_ledger").insert({
        item_detail_id: id,
        movement_type: "adjustment",
        quantity: difference,
        running_balance: newBalance,
        warehouse_id: warehouseId,
        notes: `📋 ${visualType === "shortage" ? "Shortage" : "Surplus"} adjustment — ${noteText}`,
        reference_type: "discrepancy",
        performed_by: user?.id || null,
      });
      if (ledgerError) throw new Error(`Failed to create ledger entry: ${ledgerError.message}`);

      // Step 4 REMOVED — The DB trigger sync_inventory_from_ledger
      // automatically updates inventory.quantity_on_hand from the ledger insert above.
      queryClient.invalidateQueries({ queryKey: ["stock-discrepancies", id] });
      queryClient.invalidateQueries({ queryKey: ["item-inventory-ledger", id] });
      queryClient.invalidateQueries({ queryKey: ["item-warehouse-stock", id] });
      queryClient.invalidateQueries({ queryKey: ["item-logistics-history", id] });
      setShowVisualDialog(false);
      setVisualNote("");
      setVisualQuantity(0);
      toast({
        title: "Stock reconciled",
        description: `${visualType === "shortage" ? "Shortage" : "Surplus"} of ${discrepancyAmount} units recorded and inventory updated.`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDiscrepancyProcessing(false);
    }
  };

  const handleReverseLedgerEntry = async () => {
    if (!showReverseConfirm || !id) return;
    setReversingEntry(true);
    try {
      const entry = showReverseConfirm;
      const warehouseId = entry.warehouse_id;
      // Get current running balance
      const { data: lastEntry } = await supabase
        .from("inventory_ledger")
        .select("running_balance")
        .eq("item_detail_id", id)
        .eq("warehouse_id", warehouseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const currentBalance = lastEntry?.running_balance ?? 0;
      const reversalQty = -entry.quantity;
      const newBalance = currentBalance + reversalQty;

      const { error } = await supabase.from("inventory_ledger").insert({
        item_detail_id: id,
        warehouse_id: warehouseId,
        movement_type: "reversal",
        quantity: reversalQty,
        running_balance: newBalance,
        reference_id: entry.id,
        reference_type: "reversal",
        performed_by: user?.id || null,
        notes: `Reversal of: ${entry.notes || entry.movement_type}`,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["item-inventory-ledger", id] });
      queryClient.invalidateQueries({ queryKey: ["item-warehouse-stock", id] });
      setShowReverseConfirm(null);
      toast({ title: "Entry reversed", description: `Compensating entry of ${reversalQty > 0 ? "+" : ""}${reversalQty} created.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setReversingEntry(false);
    }
  };


    return (
      <AppLayout>
        <div className="text-muted-foreground p-6">Loading...</div>
      </AppLayout>
    );
  if (!item)
    return (
      <AppLayout>
        <div className="text-muted-foreground p-6">Item not found</div>
      </AppLayout>
    );

  // --- Computed values ---
  const totalWarehouse = warehouseStock.reduce((s, i) => s + (i.quantity_on_hand || 0), 0);
  const totalMachine = machineStock.reduce((s, i) => s + (i.current_stock || 0), 0);
  const totalStock = totalWarehouse + totalMachine;

  const activeBatches = purchaseBatches.filter((b: any) => b.active_item && (b.quantity_remaining || 0) > 0);
  const totalInventoryCost = activeBatches.reduce((sum: number, b: any) => {
    return sum + (b.quantity_remaining || 0) * (b.final_unit_cost || 0);
  }, 0);
  const weightedAvgCost = totalStock > 0 ? totalInventoryCost / totalStock : 0;

  const totalUnitsSold = (salesData || []).reduce(
    (sum, s) => sum + (s.units_sold || 0), 0
  );
  const totalRevenue = (salesData || []).reduce(
    (sum, s) => sum + (Number(s.cash_collected) || 0), 0
  );
  const grossProfit = totalRevenue - totalInventoryCost;
  const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalReceived = purchaseBatches.reduce(
    (sum: number, b: any) => sum + (b.quantity_received || 0), 0
  );
  const totalFalseCoins = (salesData || []).reduce(
    (sum, s) => sum + (s.false_coins || 0), 0
  );

  const typeLabel = item.type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "—";
  const categoryLabel = (item as any).category?.name || null;

  // Determine if this item is assembled (has purchase_items with no purchase_id)
  const isAssembledItem = itemAssemblies.length > 0 || purchaseBatches.some((b: any) => !b.purchase_id);
  // Build a map from assembly reference_id to assembly data for display
  const assemblyMap: Record<string, any> = {};
  for (const asm of itemAssemblies) {
    assemblyMap[asm.id] = asm;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl p-4 md:p-6">
        {/* ===== SECTION 1: Navigation & Identity Header ===== */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground truncate">{item.name}</h1>
                <Badge className={typeColors[item.type] || ""}>{typeLabel}</Badge>
                {categoryLabel && (
                  <Badge variant="outline">{categoryLabel}</Badge>
                )}
              </div>
              <p className="text-muted-foreground font-mono text-sm mt-0.5">{item.sku}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={() => updateItem.mutate()} disabled={!form.name.trim() || updateItem.isPending}>
                    <Save className="mr-1 h-4 w-4" /> Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Item Type Selector */}
        {isAdmin && (
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Item Type:</Label>
            <Select
              value={item.item_type_id || ""}
              onValueChange={handleItemTypeChange}
            >
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue placeholder="Select item type" />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {item.item_type_id && (
              <Badge variant="outline" className="text-xs">
                {itemTypes.find((t) => t.id === item.item_type_id)?.name || "Unknown"}
              </Badge>
            )}
          </div>
        )}

        {/* Double Confirmation Dialogs for Item Type Change */}
        <AlertDialog open={showItemTypeConfirm1} onOpenChange={(open) => { if (!open) handleCancelItemType(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Item Type?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to change the item type for <strong>{item.name}</strong> to{" "}
                <strong>{itemTypes.find((t) => t.id === pendingItemTypeId)?.name || "Unknown"}</strong>.
                This may affect how this item is categorized and displayed throughout the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelItemType}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm1}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showItemTypeConfirm2} onOpenChange={(open) => { if (!open) handleCancelItemType(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This is a permanent change. The item type for <strong>{item.name}</strong> will be updated to{" "}
                <strong>{itemTypes.find((t) => t.id === pendingItemTypeId)?.name || "Unknown"}</strong>.
                This action cannot be easily undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelItemType}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm2} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, Change Item Type
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit form (shown only when editing) */}
        {isEditing && (
          <Card>
            <CardHeader><CardTitle>Edit Item Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, subcategory_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select value={form.subcategory_id} onValueChange={(v) => setForm({ ...form, subcategory_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                    <SelectContent>
                      {subcategories.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Photo</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Camera className="mr-1 h-4 w-4" /> {item.photo_url ? "Change" : "Upload"}
                    </Button>
                    {item.photo_url && (
                      <Button variant="outline" size="sm" onClick={handleRemovePhoto}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== SECTION 2: High-Level Metric Cards ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unit Cost</span>
              </div>
              <p className="text-2xl font-bold text-foreground">${fmt3(weightedAvgCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Warehouse</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalWarehouse.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Deployed</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalMachine.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Sold</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalUnitsSold.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* ===== SECTION 3: Financial Performance Panel ===== */}
        <Card>
          <CardHeader><CardTitle>Financial Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-lg font-semibold text-foreground">{totalReceived.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-lg font-semibold text-foreground">${fmt2(totalInventoryCost)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-lg font-semibold text-foreground">${fmt2(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className={`text-lg font-semibold ${grossProfit >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  ${fmt2(grossProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Margin</p>
                <p className={`text-lg font-semibold ${marginPct >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  {totalRevenue > 0 ? `${fmtPct(marginPct)}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Discrepancy Management */}
        {(() => {
          const totalJams = (salesData || []).reduce(
            (sum, s) => sum + (s.jam_status === "by_coin" ? 1 : 0), 0
          );
          const totalLost = totalUnitsSold + totalFalseCoins - totalJams;
          const expectedStock = totalReceived - totalLost;
          const diff = totalStock - expectedStock;
          const pendingDiscs = (discrepancies as any[]).filter((d: any) => d.status === "pending");
          const resolvedDiscs = (discrepancies as any[]).filter((d: any) => d.status === "resolved");
          const hasSystemDiscrepancy = diff !== 0 && totalReceived > 0;

          return (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Stock Discrepancy
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowWarehouseSale(true)}>
                      <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Warehouse Sale
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setVisualQuantity(0); setVisualType("shortage"); setShowVisualDialog(true); }}>
                      Report Visual Discrepancy
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* System-detected discrepancy */}
                {hasSystemDiscrepancy && (
                  <Alert className="border-chart-4/50 bg-chart-4/5">
                    <AlertTriangle className="h-4 w-4 text-chart-4" />
                    <AlertTitle className="text-chart-4">
                      System: {diff > 0 ? `Surplus of ${diff.toLocaleString()}` : `Shortage of ${Math.abs(diff).toLocaleString()}`} units
                    </AlertTitle>
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1 transition-colors">
                        <ChevronDown className="h-3.5 w-3.5" />
                        View Breakdown
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 space-y-1 text-sm font-mono">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Received</span>
                            <span className="text-foreground">{totalReceived.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">− Units Sold</span>
                            <span className="text-destructive">−{totalUnitsSold.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">− False Coins</span>
                            <span className="text-destructive">−{totalFalseCoins.toLocaleString()}</span>
                          </div>
                          {totalJams > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">+ Jams (coin)</span>
                              <span className="text-chart-2">+{totalJams.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="border-t border-border my-1" />
                          <div className="flex justify-between font-semibold">
                            <span className="text-foreground">Expected</span>
                            <span className="text-foreground">{expectedStock.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground pl-2">Warehouse</span>
                            <span className="text-foreground">{totalWarehouse.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground pl-2">Deployed</span>
                            <span className="text-foreground">{totalMachine.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-border my-1" />
                          <div className="flex justify-between font-bold">
                            <span className={diff > 0 ? "text-chart-2" : "text-destructive"}>Discrepancy</span>
                            <span className={diff > 0 ? "text-chart-2" : "text-destructive"}>
                              {diff > 0 ? "+" : ""}{diff.toLocaleString()}
                            </span>
                          </div>
                          {totalJams > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Includes {totalJams} coin jam(s) that added stock without dispensing.
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Alert>
                )}

                {/* Pending discrepancies */}
                {pendingDiscs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Pending ({pendingDiscs.length})</p>
                    {pendingDiscs.map((d: any) => (
                      <div key={d.id} className="p-3 rounded-md border border-chart-4/30 bg-chart-4/5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm">
                            <Badge variant="outline" className="text-xs mr-2 capitalize">{d.discrepancy_type}</Badge>
                            <span className="text-muted-foreground">
                              {d.occurrence_date ? format(new Date(d.occurrence_date), "MMM d, yyyy") : "—"}
                            </span>
                          </div>
                          <span className={`text-sm font-semibold ${d.difference > 0 ? "text-chart-2" : "text-destructive"}`}>
                            {d.difference > 0 ? "+" : ""}{d.difference}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expected: {d.expected_quantity} · Actual: {d.actual_quantity}
                        </div>
                        {d.admin_note && <p className="text-xs text-muted-foreground italic">{d.admin_note}</p>}
                        {isAdmin && (
                          <Button variant="outline" size="sm" onClick={() => { setShowResolveDialog(d.id); setResolveNote(""); }}>
                            Add Note & Resolve
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Resolved discrepancies */}
                {resolvedDiscs.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className="h-3.5 w-3.5" />
                      Resolved ({resolvedDiscs.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {resolvedDiscs.map((d: any) => (
                        <div key={d.id} className="p-3 rounded-md border border-border bg-muted/30 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm">
                              <Badge variant="secondary" className="text-xs mr-2 capitalize">{d.discrepancy_type}</Badge>
                              <span className="text-muted-foreground">
                                {d.occurrence_date ? format(new Date(d.occurrence_date), "MMM d, yyyy") : "—"}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-xs">Resolved</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Difference: {d.difference > 0 ? "+" : ""}{d.difference} · {d.admin_note || "—"}
                          </div>
                          {d.resolved_at && (
                            <span className="text-[10px] text-muted-foreground">
                              Resolved: {format(new Date(d.resolved_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {!hasSystemDiscrepancy && pendingDiscs.length === 0 && resolvedDiscs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No discrepancies detected.</p>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Resolve Discrepancy Dialog */}
        <AlertDialog open={!!showResolveDialog} onOpenChange={(open) => { if (!open) setShowResolveDialog(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resolve Discrepancy</AlertDialogTitle>
              <AlertDialogDescription>Add a note explaining this discrepancy and mark it as resolved.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label>Admin Note</Label>
              <Textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="e.g., Counted manually, units found in wrong bin..." rows={3} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => showResolveDialog && handleResolveDiscrepancy(showResolveDialog)} disabled={discrepancyProcessing}>
                {discrepancyProcessing ? "Processing..." : "Resolve"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Visual Discrepancy Dialog */}
        <AlertDialog open={showVisualDialog} onOpenChange={setShowVisualDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reconcile & Adjust Stock</AlertDialogTitle>
              <AlertDialogDescription>
                Record a stock discrepancy from a physical count. This will adjust inventory levels and create an audit trail entry.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Occurrence Date</Label>
                <Input type="date" value={visualDate} onChange={(e) => setVisualDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Discrepancy Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={visualType === "shortage" ? "destructive" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setVisualType("shortage")}
                  >
                    Shortage (Missing)
                  </Button>
                  <Button
                    type="button"
                    variant={visualType === "surplus" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setVisualType("surplus")}
                  >
                    Surplus (Extra)
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Units {visualType === "shortage" ? "Missing" : "Extra"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={visualQuantity || ""}
                  onChange={(e) => setVisualQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder={`e.g., 50 units ${visualType === "shortage" ? "missing" : "found extra"}`}
                />
                <p className="text-xs text-muted-foreground">
                  Warehouse stock: {totalWarehouse.toLocaleString()} units.
                  {visualQuantity > 0 && (
                    <> After adjustment: <strong>{(totalWarehouse + (visualType === "shortage" ? -visualQuantity : visualQuantity)).toLocaleString()}</strong> units.</>
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea value={visualNote} onChange={(e) => setVisualNote(e.target.value)} placeholder="e.g., Physical count revealed missing units from bin A3..." rows={3} />
              </div>
              {visualQuantity > 0 && (
                <Alert className={visualType === "shortage" ? "border-destructive/50 bg-destructive/10" : "border-chart-2/50 bg-chart-2/10"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This will register a <strong>{visualType}</strong> of {visualQuantity.toLocaleString()} units. Warehouse inventory will be {visualType === "shortage" ? "decreased" : "increased"} from {totalWarehouse.toLocaleString()} to {(totalWarehouse + (visualType === "shortage" ? -visualQuantity : visualQuantity)).toLocaleString()} and a ledger entry created.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReportVisualDiscrepancy} disabled={discrepancyProcessing || visualQuantity <= 0}>
                {discrepancyProcessing ? "Processing..." : "Reconcile & Adjust Stock"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ===== SECTION 4: Detailed History Tabs ===== */}
        <Tabs defaultValue="ledger" className="w-full">
          <TabsList>
            <TabsTrigger value="ledger">Inventory Ledger</TabsTrigger>
            <TabsTrigger value="logistics">Logistics History</TabsTrigger>
            <TabsTrigger value="acquisition">
              {isAssembledItem ? "Assembly History" : "Acquisition History"}
            </TabsTrigger>
          </TabsList>

          {/* ── Inventory Ledger Tab ── */}
          <TabsContent value="ledger">
            <Card>
              <CardContent className="p-2 sm:p-4">
                {ledgerEntries.length === 0 ? (
                  <p className="text-muted-foreground p-4">No ledger entries yet.</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      {ledgerEntries.map((entry) => {
                        const locationLabel = warehouseStock.find((w: any) => w.warehouse?.id === entry.warehouse_id)?.warehouse?.name || "Warehouse";
                        
                        // Resolve actual event date
                        let eventDate = entry.created_at;
                        if (entry.reference_id && entry.reference_type === "visit" && (visitDatesMap as any)[entry.reference_id]) {
                          eventDate = (visitDatesMap as any)[entry.reference_id];
                        } else if (entry.reference_id && entry.reference_type === "purchase" && (purchaseDatesMap as any)[entry.reference_id]) {
                          eventDate = (purchaseDatesMap as any)[entry.reference_id];
                        }

                        // Categorize: In / Dep / Out (warehouse-only view)
                        // IN: Warehouse inbound (positive qty) — receives, returns from field, surplus adjustments
                        const isIn = entry.quantity > 0;
                        // DEP: Warehouse outbound to field (refill, swap refill — negative qty)
                        const isDep = entry.quantity < 0 && ["refill", "swap_out"].includes(entry.movement_type);
                        // OUT: Shortage adjustments (negative qty, not deployment)
                        const isOut = entry.quantity < 0 && !isDep;

                        const inward = isIn ? entry.quantity : null;
                        const deployed = isDep ? Math.abs(entry.quantity) : null;
                        const outward = isOut ? Math.abs(entry.quantity) : null;

                        return (
                          <div
                            key={entry.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 border-b border-border/40 last:border-0"
                          >
                            {/* Left: date + type badge */}
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-[10px] px-1.5 py-0 ${movementColors[entry.movement_type] || ""}`}>
                                  {entry.movement_type.replace(/_/g, " ")}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  🏭 {locationLabel}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground truncate">
                                {entry.notes || "—"}
                              </span>
                            </div>
                            {/* Right: In / Dep / Out / Bal + date */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right min-w-[35px]">
                                <span className="text-[10px] text-muted-foreground block">In</span>
                                <span className="text-sm font-semibold text-chart-2">
                                  {inward ? `+${inward}` : "—"}
                                </span>
                              </div>
                              <div className="text-right min-w-[35px]">
                                <span className="text-[10px] text-muted-foreground block">Dep</span>
                                <span className={`text-sm font-semibold ${deployed !== null ? (deployed < 0 ? "text-destructive" : "text-chart-2") : ""}`}>
                                  {deployed !== null ? (deployed > 0 ? `+${deployed}` : `${deployed}`) : "—"}
                                </span>
                              </div>
                              <div className="text-right min-w-[35px]">
                                <span className="text-[10px] text-muted-foreground block">Out</span>
                                <span className="text-sm font-semibold text-destructive">
                                  {outward ? `-${outward}` : "—"}
                                </span>
                              </div>
                              <div className="text-right min-w-[35px]">
                                <span className="text-[10px] text-muted-foreground block">Bal</span>
                                <span className="text-sm font-medium text-foreground">{entry.running_balance}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground w-16 text-right">
                                {eventDate ? format(new Date(eventDate), "MMM d, yy") : "—"}
                              </span>
                              {isAdmin && entry.movement_type !== "reversal" && (
                                <button
                                  onClick={() => setShowReverseConfirm(entry)}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                                  title="Reverse this entry"
                                >
                                  <Undo2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Totals */}
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">Totals</span>
                      <div className="flex gap-4">
                        <span className="text-chart-2 font-medium">
                          In: +{ledgerEntries.reduce((s, e) => {
                            return s + (e.quantity > 0 ? e.quantity : 0);
                          }, 0).toLocaleString()}
                        </span>
                        <span className="font-medium text-primary">
                          Dep: {ledgerEntries.reduce((s, e) => {
                            const isDep = e.quantity < 0 && ["refill", "swap_out"].includes(e.movement_type);
                            return s + (isDep ? Math.abs(e.quantity) : 0);
                          }, 0).toLocaleString()}
                        </span>
                        <span className="text-destructive font-medium">
                          Out: −{ledgerEntries.reduce((s, e) => {
                            const isDep = e.quantity < 0 && ["refill", "swap_out"].includes(e.movement_type);
                            const isOut = e.quantity < 0 && !isDep;
                            return s + (isOut ? Math.abs(e.quantity) : 0);
                          }, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Logistics History Tab ── */}
          <TabsContent value="logistics">
            <Card>
              <CardContent className="p-2 sm:p-4">
                {item.type === "machine_model" ? (
                  machineDeployments.length === 0 ? (
                    <p className="text-muted-foreground p-4">No machines created from this model yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {machineDeployments.map((machine: any) => {
                        const setup = machine.setup;
                        const spot = setup?.spot;
                        const location = spot?.location;
                        const statusColors: Record<string, string> = {
                          deployed: "bg-chart-2/10 text-chart-2 border-chart-2/20",
                          in_warehouse: "bg-primary/10 text-primary border-primary/20",
                          maintenance: "bg-chart-4/10 text-chart-4 border-chart-4/20",
                          retired: "bg-muted text-muted-foreground border-border",
                        };
                        return (
                          <div
                            key={machine.id}
                            className="rounded-lg border border-border/60 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => navigate(`/machines/${machine.id}`)}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${statusColors[machine.status] || ""}`}>
                                  {machine.status?.replace(/_/g, " ")}
                                </Badge>
                                <span className="text-sm font-medium text-foreground truncate">
                                  {machine.serial_number}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {machine.created_at ? format(new Date(machine.created_at), "MMM d, yyyy") : "—"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-x-2 text-center">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Setup</p>
                                <p className="text-sm font-medium text-foreground">{setup?.name || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Spot</p>
                                <p className="text-sm font-medium text-foreground">{spot?.name || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Location</p>
                                <p className="text-sm font-medium text-foreground">{location?.name || "—"}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <>
                    {/* Visual Discrepancy Reports */}
                    {discrepancies.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                          Stock Reconciliation Reports
                        </p>
                        <div className="space-y-2">
                          {discrepancies.map((d: any) => (
                            <div
                              key={d.id}
                              className="rounded-lg border border-chart-4/30 bg-chart-4/5 p-3"
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge className="text-[10px] px-1.5 py-0 bg-chart-4/20 text-chart-4 border-chart-4/30">
                                    {d.discrepancy_type || "visual"} reconciliation
                                  </Badge>
                                  <Badge className={`text-[10px] px-1.5 py-0 ${d.status === "resolved" ? "bg-chart-2/20 text-chart-2 border-chart-2/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}>
                                    {d.status}
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  {d.occurrence_date ? format(new Date(d.occurrence_date), "MMM d, yyyy") : d.created_at ? format(new Date(d.created_at), "MMM d, yyyy") : "—"}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-x-2 text-center mb-2">
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Expected</p>
                                  <p className="text-sm font-medium text-foreground">{d.expected_quantity?.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Actual</p>
                                  <p className="text-sm font-medium text-foreground">{d.actual_quantity?.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Difference</p>
                                  <p className={`text-sm font-semibold ${d.difference > 0 ? "text-chart-2" : d.difference < 0 ? "text-destructive" : "text-foreground"}`}>
                                    {d.difference > 0 ? `+${d.difference}` : d.difference}
                                  </p>
                                </div>
                              </div>
                              {d.admin_note && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {d.admin_note}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visit Line Items */}
                    {logisticsHistory.length === 0 && discrepancies.length === 0 ? (
                      <p className="text-muted-foreground p-4">No logistics history yet.</p>
                    ) : logisticsHistory.length > 0 ? (
                      <>
                        {discrepancies.length > 0 && (
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                            Visit History
                          </p>
                        )}
                        <div className="space-y-2">
                          {logisticsHistory.map((row: any) => {
                            const visit = row.spot_visit;
                            const spot = visit?.spot;
                            const location = spot?.location;
                            const snap = snapshots.find(
                              (s: any) => s.visit_id === row.spot_visit_id && s.slot_id === row.slot_id
                            );
                            const lastStock = snap?.previous_stock ?? null;
                            const currentStock = row.computed_current_stock ?? null;
                            const unitsSold = row.units_sold ?? 0;
                            const added = row.quantity_added || 0;
                            const removed = row.quantity_removed || 0;
                            const falseCoins = row.false_coins ?? 0;
                            const jamStatus = row.jam_status ?? "no_jam";
                            const auditedCount = row.meter_reading;
                            const jamLabel = jamStatus === "by_coin" ? "Jam (+1)" : jamStatus === "mechanical" ? "Jam (mech)" : "—";

                            return (
                              <div
                                key={row.id}
                                className="rounded-lg border border-border/60 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                                onClick={() => row.spot_visit_id && navigate(`/visits/${row.spot_visit_id}`)}
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${actionColors[row.action_type] || ""}`}>
                                      {row.action_type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {location?.name ? `${location.name} › ${spot?.name || ""}` : spot?.name || "—"}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-muted-foreground shrink-0">
                                    {visit?.visit_date ? format(new Date(visit.visit_date), "MMM d, yyyy") : "—"}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-2 gap-y-1 text-center">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Last</p>
                                    <p className="text-sm font-medium text-foreground">{lastStock ?? "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Current</p>
                                    <p className="text-sm font-medium text-foreground">{currentStock ?? "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Audited</p>
                                    <p className="text-sm font-medium text-foreground">{auditedCount ?? "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Sold</p>
                                    <p className="text-sm font-medium text-primary">{unitsSold || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Added</p>
                                    <p className="text-sm font-medium text-chart-2">{added > 0 ? `+${added}` : "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Removed</p>
                                    <p className="text-sm font-medium text-destructive">{removed > 0 ? `-${removed}` : "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">False</p>
                                    <p className="text-sm font-medium text-chart-4">{falseCoins || "—"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">Jam</p>
                                    <p className="text-[11px] font-medium text-muted-foreground">{jamLabel}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acquisition">
            <Card>
              <CardContent className="p-0">
                {purchaseBatches.length === 0 ? (
                  <p className="text-muted-foreground p-6">
                    {isAssembledItem ? "No assembly history." : "No purchase history."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>{isAssembledItem ? "Assembly #" : "PO Number"}</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Batch Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseBatches.map((pi: any) => {
                        const isFromAssembly = !pi.purchase_id;
                        const matchedAssembly = isFromAssembly
                          ? itemAssemblies.find((a: any) =>
                              a.output_quantity === pi.quantity_ordered &&
                              Math.abs(Number(a.final_unit_cost) - Number(pi.final_unit_cost)) < 0.01
                            ) || itemAssemblies[0]
                          : null;

                        return (
                          <TableRow
                            key={pi.id}
                            className={`cursor-pointer ${!pi.active_item ? "opacity-60" : ""}`}
                            onClick={() => {
                              if (!isFromAssembly && pi.purchase) {
                                navigate(`/purchases/${pi.purchase.id}`);
                              }
                            }}
                          >
                            <TableCell className="text-sm">
                              {isFromAssembly
                                ? matchedAssembly?.created_at
                                  ? format(new Date(matchedAssembly.created_at), "MMM d, yyyy")
                                  : pi.created_at
                                  ? format(new Date(pi.created_at), "MMM d, yyyy")
                                  : "—"
                                : pi.purchase?.received_at
                                ? format(new Date(pi.purchase.received_at), "MMM d, yyyy")
                                : pi.purchase?.created_at
                                ? format(new Date(pi.purchase.created_at), "MMM d, yyyy")
                                : "—"}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {isFromAssembly
                                ? matchedAssembly?.assembly_number || "Assembly"
                                : pi.purchase?.purchase_order_number || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {isFromAssembly ? "Assembly" : "Purchase"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {pi.active_item ? (
                                <Badge variant="secondary" className="text-xs">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Depleted</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">{pi.quantity_ordered}</TableCell>
                            <TableCell className="text-right text-sm">{pi.quantity_received || 0}</TableCell>
                            <TableCell className="text-right text-sm">{pi.quantity_remaining || 0}</TableCell>
                            <TableCell className="text-right text-sm">${fmt3(Number(pi.final_unit_cost))}</TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {pi.active_item && (pi.quantity_remaining || 0) > 0
                                ? `$${fmt2((pi.quantity_remaining || 0) * (pi.final_unit_cost || 0))}`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===== SECTION 5: Metadata Footer ===== */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground border-t pt-4">
          <span>Created: {item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "—"}</span>
          <span>Updated: {item.updated_at ? format(new Date(item.updated_at), "MMM d, yyyy") : "—"}</span>
          <span className="flex items-center gap-1">
            ID: <code className="font-mono">{item.id.slice(0, 8)}…</code>
            <button onClick={handleCopyId} className="hover:text-foreground transition-colors">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </span>
        </div>

        {/* Reverse Entry Confirmation Dialog */}
        <AlertDialog open={!!showReverseConfirm} onOpenChange={(open) => !open && setShowReverseConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reverse Ledger Entry</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a compensating entry of <strong>{showReverseConfirm ? (showReverseConfirm.quantity > 0 ? `-${showReverseConfirm.quantity}` : `+${Math.abs(showReverseConfirm.quantity)}`) : ""}</strong> to neutralize this transaction. The original entry will remain for audit purposes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {showReverseConfirm && (
              <div className="text-sm space-y-1 p-3 rounded-md bg-muted/50">
                <div><strong>Type:</strong> {showReverseConfirm.movement_type.replace(/_/g, " ")}</div>
                <div><strong>Quantity:</strong> {showReverseConfirm.quantity > 0 ? "+" : ""}{showReverseConfirm.quantity}</div>
                <div><strong>Notes:</strong> {showReverseConfirm.notes || "—"}</div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReverseLedgerEntry} disabled={reversingEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {reversingEntry ? "Reversing..." : "Confirm Reversal"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Warehouse Sale Dialog */}
        <WarehouseSaleDialog
          open={showWarehouseSale}
          onOpenChange={setShowWarehouseSale}
          itemDetailId={id!}
          itemName={item.name}
        />
      </div>
    </AppLayout>
  );
}
