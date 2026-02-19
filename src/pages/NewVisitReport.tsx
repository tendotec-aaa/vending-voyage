import { fmt2 } from "@/lib/formatters";
import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
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
import { 
  ArrowLeft, 
  Camera, 
  Upload,
  Save, 
  CalendarIcon,
  AlertTriangle,
  ImagePlus,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Location = Database["public"]["Tables"]["locations"]["Row"];
type Spot = Database["public"]["Tables"]["spots"]["Row"];
type Setup = Database["public"]["Tables"]["setups"]["Row"];
type Machine = Database["public"]["Tables"]["machines"]["Row"];
type MachineSlot = Database["public"]["Tables"]["machine_slots"]["Row"];
interface ItemDetailBasic {
  id: string;
  name: string;
  sku: string;
  type: string;
}
type VisitActionType = Database["public"]["Enums"]["visit_action_type"];

// Visit types - maps to visit_action_type enum where applicable
const visitTypes = [
  { id: "installation", name: "Installation", actionType: "restock" as VisitActionType },
  { id: "routine_service", name: "Routine Service", actionType: "collection" as VisitActionType },
  { id: "inventory_audit", name: "Inventory Audit", actionType: "collection" as VisitActionType },
  { id: "maintenance", name: "Maintenance", actionType: "service" as VisitActionType },
  { id: "emergency", name: "Emergency", actionType: "service" as VisitActionType },
];

// Jam status options
const jamStatusOptions = [
  { id: "no_jam", name: "No Jam" },
  { id: "with_coins", name: "With Coins" },
  { id: "without_coins", name: "Without Coins" },
  { id: "by_coin", name: "By Coin" },
];

// Severity options
const severityOptions = [
  { id: "low", name: "Low" },
  { id: "medium", name: "Medium" },
  { id: "high", name: "High" },
];

// Position labels for setup types
const getPositionLabel = (position: number, setupType: string | null, totalMachines: number): string => {
  if (totalMachines === 1) return "";
  if (setupType === "double") return position === 1 ? "Left" : "Right";
  if (setupType === "triple") {
    if (position === 1) return "Left";
    if (position === 2) return "Center";
    return "Right";
  }
  if (setupType === "quad") {
    if (position === 1) return "Top-Left";
    if (position === 2) return "Top-Right";
    if (position === 3) return "Bottom-Left";
    return "Bottom-Right";
  }
  return `Position ${position}`;
};

interface SlotEntry {
  id: string;
  machineId: string;
  machineSerialNo: string;
  slotId: string;
  slotNumber: number;
  toyName: string;
  toyId: string;
  replaceAllToys: boolean;
  lastStock: number;
  unitsSold: number;
  unitsRefilled: number;
  unitsRemoved: number;
  falseCoins: number;
  auditedCount: number | null;
  currentStock: number;
  pricePerUnit: number;
  jamStatus: string;
  capacity: number;
  reportIssue: boolean;
  issueDescription: string;
  severity: string;
  toyCapacity: number;
  cashCollected: number;
}

export default function NewVisitReport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Location Details state
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSpot, setSelectedSpot] = useState("");
  
  // Visit Details state
  const [visitType, setVisitType] = useState("");
  const [visitDate, setVisitDate] = useState<Date>(new Date());
  
  // Slots state
  const [slots, setSlots] = useState<SlotEntry[]>([]);
  
  // Observations state
  const [hasObservationIssue, setHasObservationIssue] = useState(false);
  const [observationIssueLog, setObservationIssueLog] = useState("");
  const [observationSeverity, setObservationSeverity] = useState("");
  
  // Photo & Sign Off state
  const [confirmAccurate, setConfirmAccurate] = useState(false);

  // 30-day warning dialog state
  const [show30DayWarning, setShow30DayWarning] = useState(false);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch spots for selected location
  const { data: spots = [] } = useQuery({
    queryKey: ['spots', selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) return [];
      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .eq('location_id', selectedLocation)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLocation,
  });

  // Fetch setup for selected spot
  const { data: spotSetup } = useQuery({
    queryKey: ['setup-for-spot', selectedSpot],
    queryFn: async () => {
      if (!selectedSpot) return null;
      const { data, error } = await supabase
        .from('setups')
        .select('*')
        .eq('spot_id', selectedSpot)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedSpot,
  });

  // Fetch machines for the setup
  const { data: machines = [] } = useQuery({
    queryKey: ['machines-for-setup', spotSetup?.id],
    queryFn: async () => {
      if (!spotSetup?.id) return [];
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('setup_id', spotSetup.id)
        .order('position_on_setup');
      if (error) throw error;
      return data;
    },
    enabled: !!spotSetup?.id,
  });

  // Fetch machine slots for all machines
  const { data: machineSlots = [] } = useQuery({
    queryKey: ['machine-slots', machines.map(m => m.id)],
    queryFn: async () => {
      if (machines.length === 0) return [];
      const { data, error } = await supabase
        .from('machine_slots')
        .select('*')
        .in('machine_id', machines.map(m => m.id))
        .order('slot_number');
      if (error) throw error;
      return data;
    },
    enabled: machines.length > 0,
  });

  // Fetch last visit for selected spot
  const { data: lastVisit } = useQuery({
    queryKey: ['last-visit', selectedSpot],
    queryFn: async () => {
      if (!selectedSpot) return null;
      const { data, error } = await supabase
        .from('spot_visits')
        .select('visit_date')
        .eq('spot_id', selectedSpot)
        .order('visit_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSpot,
  });

  // Fetch products (merchandise type items)
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_details')
        .select('id, name, sku, type')
        .eq('type', 'merchandise')
        .order('name');
      if (error) throw error;
      return (data || []) as ItemDetailBasic[];
    },
  });

  // Calculate days since last visit
  const daysSinceLastVisit = useMemo(() => {
    if (visitType === 'installation') return 0;
    if (!lastVisit?.visit_date) return null;
    return differenceInDays(visitDate, new Date(lastVisit.visit_date));
  }, [lastVisit, visitType, visitDate]);

  const getDaysSinceColor = (days: number | null) => {
    if (days === null) return "bg-muted text-muted-foreground";
    if (days < 15) return "bg-green-500/20 text-green-700 dark:text-green-400";
    if (days <= 30) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    return "bg-red-500/20 text-red-700 dark:text-red-400";
  };

  // Auto-detect installation visit
  useEffect(() => {
    if (machineSlots.length > 0 && selectedSpot) {
      const allEmpty = machineSlots.every(
        slot => !slot.current_product_id && (slot.current_stock === 0 || slot.current_stock === null)
      );
      if (allEmpty) {
        setVisitType('installation');
        // Set visit date to contract start date
        const location = locations.find(l => l.id === selectedLocation);
        if (location?.contract_start_date) {
          setVisitDate(new Date(location.contract_start_date));
        }
      }
    }
  }, [machineSlots, selectedSpot, selectedLocation, locations]);

  // Generate slots based on actual machine_slots from database
  useEffect(() => {
    if (machineSlots.length > 0 && selectedSpot && visitType) {
      const generatedSlots: SlotEntry[] = machineSlots.map((slot) => {
        const machine = machines.find(m => m.id === slot.machine_id);
        const product = products.find(p => p.id === slot.current_product_id);
        
        return {
          id: slot.id,
          machineId: slot.machine_id || '',
          machineSerialNo: machine?.serial_number || 'Unknown',
          slotId: slot.id,
          slotNumber: slot.slot_number,
          toyName: product?.name || "Unassigned",
          toyId: slot.current_product_id || "",
          replaceAllToys: false,
          lastStock: slot.current_stock || 0,
          unitsSold: 0,
          unitsRefilled: 0,
          unitsRemoved: 0,
          falseCoins: 0,
          auditedCount: null,
          currentStock: slot.current_stock || 0,
          pricePerUnit: Number(slot.coin_acceptor) || 1,
          jamStatus: "no_jam",
          capacity: slot.capacity || 150,
          reportIssue: false,
          issueDescription: "",
          severity: "",
          toyCapacity: slot.capacity || 0,
          cashCollected: 0,
        };
      });
      
      setSlots(generatedSlots);
    } else if (!selectedSpot || !visitType) {
      setSlots([]);
    }
  }, [machineSlots, machines, products, selectedSpot, visitType]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalCashCollected = slots.reduce((sum, slot) => {
      return sum + (slot.unitsSold * slot.pricePerUnit);
    }, 0);
    
    const totalRefilled = slots.reduce((sum, slot) => sum + slot.unitsRefilled, 0);
    
    return { totalCashCollected, totalRefilled };
  }, [slots]);

  const updateSlot = (id: string, updates: Partial<SlotEntry>) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id !== id) return slot;
      
      const updated = { ...slot, ...updates };
      
      // Recalculate current stock
      if (visitType === 'installation') {
        updated.currentStock = updated.unitsRefilled;
      } else if (visitType === 'inventory_audit' && updated.auditedCount !== null) {
        updated.currentStock = updated.auditedCount;
      } else {
        updated.currentStock = updated.lastStock - updated.unitsSold + updated.unitsRefilled - updated.unitsRemoved;
      }
      
      // Calculate cash collected
      updated.cashCollected = updated.unitsSold * updated.pricePerUnit;
      
      return updated;
    }));
  };

  // Submit visit report mutation
  const submitVisitReport = useMutation({
    mutationFn: async () => {
      const visitTypeData = visitTypes.find(t => t.id === visitType);
      
      // Create spot_visit record with operator_id and visit_type
      const { data: visitData, error: visitError } = await supabase
        .from('spot_visits')
        .insert({
          spot_id: selectedSpot,
          visit_date: visitDate.toISOString(),
          total_cash_collected: totals.totalCashCollected,
          notes: hasObservationIssue ? `${observationSeverity}: ${observationIssueLog}` : null,
          status: hasObservationIssue ? 'flagged' : 'completed',
          operator_id: user?.id,
          visit_type: visitType,
        } as any)
        .select()
        .single();
      
      if (visitError) throw visitError;
      
      // Create visit_line_items for each slot
      const lineItems = slots.map(slot => ({
        spot_visit_id: visitData.id,
        machine_id: slot.machineId,
        slot_id: slot.slotId,
        product_id: slot.toyId || null,
        action_type: visitTypeData?.actionType || 'collection',
        quantity_added: slot.unitsRefilled,
        quantity_removed: slot.unitsRemoved,
        cash_collected: slot.cashCollected,
        meter_reading: slot.auditedCount,
      }));
      
      const { error: lineItemsError } = await supabase
        .from('visit_line_items')
        .insert(lineItems);
      
      if (lineItemsError) throw lineItemsError;
      
      // Update machine_slots with current_product_id, current_stock, and installation fields
      for (const slot of slots) {
        const updateData: Record<string, any> = { current_stock: slot.currentStock };
        if (slot.toyId) updateData.current_product_id = slot.toyId;
        if (visitType === 'installation') {
          updateData.capacity = slot.capacity;
          updateData.coin_acceptor = slot.pricePerUnit;
        }
        await supabase
          .from('machine_slots')
          .update(updateData)
          .eq('id', slot.slotId);
      }
      
      return visitData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spot_visits'] });
      queryClient.invalidateQueries({ queryKey: ['machine-slots'] });
      toast.success("Visit report submitted successfully!");
      navigate("/visits");
    },
    onError: (error) => {
      toast.error(`Error submitting report: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!selectedLocation) {
      toast.error("Please select a location");
      return;
    }
    if (!selectedSpot) {
      toast.error("Please select a spot");
      return;
    }
    if (!visitType) {
      toast.error("Please select a visit type");
      return;
    }
    if (!confirmAccurate) {
      toast.error("Please confirm the report is accurate");
      return;
    }
    
    // Check if 30+ days since last visit
    if (daysSinceLastVisit !== null && daysSinceLastVisit > 30) {
      setShow30DayWarning(true);
      return;
    }
    
    submitVisitReport.mutate();
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved successfully!");
  };

  const getCapacityPercentage = (slot: SlotEntry) => {
    return slot.capacity > 0 ? Math.round((slot.currentStock / slot.capacity) * 100) : 0;
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage <= 25) return "bg-red-500";
    if (percentage <= 50) return "bg-yellow-500";
    if (percentage <= 75) return "bg-blue-500";
    return "bg-green-500";
  };

  const getCapacityTextColor = (percentage: number) => {
    if (percentage <= 25) return "text-red-600 dark:text-red-400";
    if (percentage <= 50) return "text-yellow-600 dark:text-yellow-400";
    if (percentage <= 75) return "text-blue-600 dark:text-blue-400";
    return "text-green-600 dark:text-green-400";
  };

  const renderCapacityIndicator = (slot: SlotEntry) => {
    const percentage = getCapacityPercentage(slot);
    const colorClass = getCapacityColor(percentage);
    const textColorClass = getCapacityTextColor(percentage);
    
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{slot.currentStock} / {slot.capacity}</span>
          <span className={cn("font-semibold", textColorClass)}>{percentage}%</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all", colorClass)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const renderSlotCard = (slot: SlotEntry, index: number) => {
    const isInstallation = visitType === 'installation';
    const isAudit = visitType === 'inventory_audit';
    
    return (
      <Card key={slot.id} className="p-4 bg-background border-border">
        <div className="space-y-4">
          {/* Header Info */}
          <div className="flex items-start justify-between border-b border-border pb-3 gap-4">
            {/* LEFT: Toy Name — the most important info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                {isInstallation ? "Assign Toy" : "Toy"}
              </p>
              {isInstallation ? (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border-2",
                  slot.toyName && slot.toyName !== "Unassigned"
                    ? "border-primary bg-primary/10"
                    : "border-dashed border-muted-foreground/50 bg-muted/40"
                )}>
                  <span className={cn(
                    "text-base font-bold truncate",
                    slot.toyName && slot.toyName !== "Unassigned"
                      ? "text-primary"
                      : "text-muted-foreground italic"
                  )}>
                    {slot.toyName && slot.toyName !== "Unassigned" ? slot.toyName : "No toy assigned yet"}
                  </span>
                </div>
              ) : (
                <p className={cn(
                  "text-lg font-bold truncate",
                  slot.toyName === "Unassigned" ? "text-muted-foreground italic" : "text-foreground"
                )}>
                  {slot.toyName}
                </p>
              )}
            </div>

            {/* RIGHT: Machine Serial + Slot */}
            <div className="text-right shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Machine · Slot #{slot.slotNumber}</p>
              <p className="text-sm font-mono text-muted-foreground">{slot.machineSerialNo}</p>
            </div>
          </div>

          {/* Installation View */}
          {isInstallation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Assign Toy</Label>
                <Select
                  value={slot.toyId}
                  onValueChange={(value) => {
                    const product = products.find(p => p.id === value);
                    updateSlot(slot.id, { toyId: value, toyName: product?.name || "" });
                  }}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Select toy" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Toy Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  value={slot.toyCapacity || ""}
                  onChange={(e) => updateSlot(slot.id, { 
                    toyCapacity: parseInt(e.target.value) || 0,
                    capacity: parseInt(e.target.value) || 0
                  })}
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label>Units Refilled</Label>
                <Input
                  type="number"
                  min="0"
                  value={slot.unitsRefilled || ""}
                  onChange={(e) => updateSlot(slot.id, { unitsRefilled: parseInt(e.target.value) || 0 })}
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label>Price/Unit ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={slot.pricePerUnit || ""}
                  onChange={(e) => updateSlot(slot.id, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <div className="p-2 bg-muted rounded-md text-foreground font-medium">
                  {slot.currentStock}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                {renderCapacityIndicator(slot)}
              </div>
            </div>
          )}

          {/* Routine Service / Maintenance / Emergency View */}
          {(visitType === 'routine_service' || visitType === 'maintenance' || visitType === 'emergency') && (
            <>
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id={`replace-${slot.id}`}
                  checked={slot.replaceAllToys}
                  onCheckedChange={(checked) => updateSlot(slot.id, { replaceAllToys: !!checked })}
                />
                <Label htmlFor={`replace-${slot.id}`}>Replace all toys in this slot</Label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Last Stock</Label>
                  <div className="p-2 bg-muted rounded-md text-foreground font-medium">
                    {slot.lastStock}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Units Sold</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.unitsSold || ""}
                    onChange={(e) => updateSlot(slot.id, { unitsSold: parseInt(e.target.value) || 0 })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Units Refilled</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.unitsRefilled || ""}
                    onChange={(e) => updateSlot(slot.id, { unitsRefilled: parseInt(e.target.value) || 0 })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Units Removed</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.unitsRemoved || ""}
                    onChange={(e) => updateSlot(slot.id, { unitsRemoved: parseInt(e.target.value) || 0 })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>False Coins</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.falseCoins || ""}
                    onChange={(e) => updateSlot(slot.id, { falseCoins: parseInt(e.target.value) || 0 })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <div className="p-2 bg-muted rounded-md text-foreground font-medium">
                    {slot.currentStock}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Price/Unit</Label>
                  <div className="p-2 bg-muted rounded-md text-foreground font-medium">
                    ${fmt2(slot.pricePerUnit)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Jam Status</Label>
                  <Select
                    value={slot.jamStatus}
                    onValueChange={(value) => updateSlot(slot.id, { jamStatus: value })}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jamStatusOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-2 space-y-2">
                <Label>Capacity</Label>
                {renderCapacityIndicator(slot)}
              </div>

              {/* Issue Reporting */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`issue-${slot.id}`}
                    checked={slot.reportIssue}
                    onCheckedChange={(checked) => updateSlot(slot.id, { reportIssue: !!checked })}
                  />
                  <Label htmlFor={`issue-${slot.id}`}>Report Issue</Label>
                </div>
                
                {slot.reportIssue && (
                  <div className="mt-3 space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label>Describe the issue...</Label>
                      <Textarea
                        placeholder="Enter issue description..."
                        value={slot.issueDescription}
                        onChange={(e) => updateSlot(slot.id, { issueDescription: e.target.value })}
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select
                        value={slot.severity}
                        onValueChange={(value) => updateSlot(slot.id, { severity: value })}
                      >
                        <SelectTrigger className="bg-card w-48">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          {severityOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Inventory Audit View */}
          {isAudit && (
            <>
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id={`replace-${slot.id}`}
                  checked={slot.replaceAllToys}
                  onCheckedChange={(checked) => updateSlot(slot.id, { replaceAllToys: !!checked })}
                />
                <Label htmlFor={`replace-${slot.id}`}>Replace all toys in this slot</Label>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Last Stock</Label>
                  <div className="p-2 bg-muted rounded-md text-foreground font-medium">
                    {slot.lastStock}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Units Sold</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.unitsSold || ""}
                    onChange={(e) => updateSlot(slot.id, { unitsSold: parseInt(e.target.value) || 0 })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Units Refilled</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.unitsRefilled || ""}
                    onChange={(e) => updateSlot(slot.id, { unitsRefilled: parseInt(e.target.value) || 0 })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Units Removed</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.unitsRemoved || ""}
                    onChange={(e) => updateSlot(slot.id, { unitsRemoved: parseInt(e.target.value) || 0 })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>False Coins</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.falseCoins || ""}
                    onChange={(e) => updateSlot(slot.id, { falseCoins: parseInt(e.target.value) || 0 })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Audited Count (Physical)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Enter count"
                    value={slot.auditedCount ?? ""}
                    onChange={(e) => updateSlot(slot.id, { 
                      auditedCount: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <div className={cn(
                    "p-2 rounded-md font-medium",
                    slot.auditedCount !== null && slot.auditedCount !== (slot.lastStock - slot.unitsSold + slot.unitsRefilled - slot.unitsRemoved)
                      ? "bg-warning/20 text-warning-foreground border border-warning"
                      : "bg-muted text-foreground"
                  )}>
                    {slot.auditedCount !== null ? (
                      <>
                        {slot.lastStock - slot.unitsSold + slot.unitsRefilled - slot.unitsRemoved} / AC: {slot.auditedCount}
                        {slot.auditedCount !== (slot.lastStock - slot.unitsSold + slot.unitsRefilled - slot.unitsRemoved) && (
                          <span className="text-xs block">
                            {slot.auditedCount > (slot.lastStock - slot.unitsSold + slot.unitsRefilled - slot.unitsRemoved) 
                              ? `+${slot.auditedCount - (slot.lastStock - slot.unitsSold + slot.unitsRefilled - slot.unitsRemoved)} surplus`
                              : `${slot.auditedCount - (slot.lastStock - slot.unitsSold + slot.unitsRefilled - slot.unitsRemoved)} shortage`
                            }
                          </span>
                        )}
                      </>
                    ) : (
                      slot.currentStock
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Price/Unit</Label>
                  <div className="p-2 bg-muted rounded-md text-foreground font-medium">
                    ${fmt2(slot.pricePerUnit)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Jam Status</Label>
                  <Select
                    value={slot.jamStatus}
                    onValueChange={(value) => updateSlot(slot.id, { jamStatus: value })}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jamStatusOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  {renderCapacityIndicator(slot)}
                </div>
              </div>

              {/* Issue Reporting */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`issue-${slot.id}`}
                    checked={slot.reportIssue}
                    onCheckedChange={(checked) => updateSlot(slot.id, { reportIssue: !!checked })}
                  />
                  <Label htmlFor={`issue-${slot.id}`}>Report Issue</Label>
                </div>
                
                {slot.reportIssue && (
                  <div className="mt-3 space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label>Describe the issue...</Label>
                      <Textarea
                        placeholder="Enter issue description..."
                        value={slot.issueDescription}
                        onChange={(e) => updateSlot(slot.id, { issueDescription: e.target.value })}
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select
                        value={slot.severity}
                        onValueChange={(value) => updateSlot(slot.id, { severity: value })}
                      >
                        <SelectTrigger className="bg-card w-48">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          {severityOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Card>
    );
  };

  return (
    <AppLayout
      title="New Visit Report"
      subtitle="Record a field service visit"
      actions={
        <Button variant="outline" onClick={() => navigate("/visits")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Visits
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Location Details */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Location Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select 
                value={selectedLocation} 
                onValueChange={(value) => {
                  setSelectedLocation(value);
                  setSelectedSpot("");
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spot">Spot</Label>
              <Select 
                value={selectedSpot} 
                onValueChange={setSelectedSpot}
                disabled={!selectedLocation}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={selectedLocation ? "Select a spot..." : "Select location first"} />
                </SelectTrigger>
                <SelectContent>
                  {spots.map((spot) => (
                    <SelectItem key={spot.id} value={spot.id}>
                      {spot.name} {spot.description ? `- ${spot.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Setup Info Display */}
          {selectedSpot && spotSetup && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-3">
                <h4 className="font-medium text-foreground">Setup: {spotSetup.name || "Unnamed"}</h4>
                <Badge variant="secondary" className="capitalize">
                  {spotSetup.type || "single"}
                </Badge>
              </div>
              {machines.length > 0 && (
                <div className="space-y-1.5">
                  {machines.map((machine) => (
                    <div key={machine.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {getPositionLabel(machine.position_on_setup || 1, spotSetup.type, machines.length)}
                      </span>
                      {getPositionLabel(machine.position_on_setup || 1, spotSetup.type, machines.length) && (
                        <span className="text-muted-foreground">—</span>
                      )}
                      <span>S/N: {machine.serial_number}</span>
                      {machine.model_type && <span className="text-xs">({machine.model_type})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Visit Details */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Visit Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="visitType">Visit Type</Label>
              <Select value={visitType} onValueChange={setVisitType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select visit type..." />
                </SelectTrigger>
                <SelectContent>
                  {visitTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visit Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background",
                      !visitDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {visitDate ? format(visitDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={visitDate}
                    onSelect={(date) => date && setVisitDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Days Since Last Visit */}
            {selectedSpot && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Days Since Last Visit
                </Label>
                <div className={cn(
                  "p-3 rounded-md font-semibold text-lg flex items-center gap-2",
                  getDaysSinceColor(daysSinceLastVisit)
                )}>
                  {daysSinceLastVisit !== null ? daysSinceLastVisit : "—"}
                  <span className="text-sm font-normal">
                    {daysSinceLastVisit === 0 ? "days (first visit)" : daysSinceLastVisit !== null ? "days" : "No data"}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Total Cash Collected</Label>
              <div className="p-3 bg-muted rounded-md text-foreground font-semibold text-lg">
                ${fmt2(totals.totalCashCollected)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Toys Refilled</Label>
              <div className="p-3 bg-muted rounded-md text-foreground font-semibold text-lg">
                {totals.totalRefilled} units
              </div>
            </div>
          </div>
        </Card>

        {/* Slot Inventory */}
        {selectedSpot && visitType && (
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Slot Inventory
              {slots.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({slots.length} slots)
                </span>
              )}
            </h3>
            
            {slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No machine slots found for this spot.</p>
                <p className="text-sm">Please ensure machines with slots are assigned to this spot's setup.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {slots.map((slot, index) => renderSlotCard(slot, index))}
              </div>
            )}
          </Card>
        )}

        {/* Observations */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Observations</h3>
          
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="observation-issue"
              checked={hasObservationIssue}
              onCheckedChange={(checked) => setHasObservationIssue(!!checked)}
            />
            <Label htmlFor="observation-issue">Log an issue about this visit</Label>
          </div>
          
          {hasObservationIssue && (
            <div className="space-y-4 pl-6 border-l-2 border-warning">
              <div className="space-y-2">
                <Label>Issue Log</Label>
                <Textarea
                  placeholder="Describe any issues about the setup or machines..."
                  value={observationIssueLog}
                  onChange={(e) => setObservationIssueLog(e.target.value)}
                  className="bg-background"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={observationSeverity} onValueChange={setObservationSeverity}>
                  <SelectTrigger className="bg-background w-48">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Attach Image (Optional)</Label>
                <Button variant="outline" className="gap-2">
                  <ImagePlus className="w-4 h-4" />
                  Upload Image
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Photo & Sign Off */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Photo & Sign Off</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Visit Photo</Label>
              <div className="flex gap-3">
                <Button variant="outline" className="gap-2">
                  <Camera className="w-4 h-4" />
                  Take Photo
                </Button>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
              <Checkbox
                id="confirm-accurate"
                checked={confirmAccurate}
                onCheckedChange={(checked) => setConfirmAccurate(!!checked)}
              />
              <div className="space-y-1">
                <Label htmlFor="confirm-accurate" className="text-base font-medium cursor-pointer">
                  I confirm that this report is accurate
                </Label>
                <p className="text-sm text-muted-foreground">
                  By checking this box, I attest that all information entered in this report is accurate to the best of my knowledge.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitVisitReport.isPending}
            className="gap-2"
          >
            {submitVisitReport.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </div>

      {/* 30-Day Warning Dialog */}
      <AlertDialog open={show30DayWarning} onOpenChange={setShow30DayWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Over 30 Days Since Last Visit
            </AlertDialogTitle>
            <AlertDialogDescription>
              It has been over 30 days since the last visit to this spot. Are you sure the selected date is correct, or do you need to change it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Change Date</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitVisitReport.mutate()}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
