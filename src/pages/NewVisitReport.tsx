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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Camera, 
  Upload,
  Save, 
  CalendarIcon,
  AlertTriangle,
  ImagePlus,
  Clock,
  Star,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
} from "lucide-react";
import { VisitDraftsDropdown, saveDraft, type VisitDraft } from "@/components/visits/VisitDraftsDropdown";
import { ToyPicker } from "@/components/visits/ToyPicker";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, differenceInDays, startOfDay } from "date-fns";
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
  { id: "by_coin", name: "By Coin (+1)" },
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
  // For swaps
  previousProductId: string | null;
  previousStock: number;
  // For evidence lock
  swapPhotoUrl: string | null;
  swapPhotoFile: File | null;
  // Phase 2: New product fields (for swap)
  newToyId: string;
  newToyName: string;
  newToyCapacity: number;
  newUnitsRefilled: number;
  newPricePerUnit: number;
  newCurrentStock: number;
  swapSurplusShortage: number;
}

interface PerformanceGrade {
  totalCash: number;
  avgCash: number;
  grade: "above" | "average" | "below";
  slotsServiced: number;
  issuesFlagged: number;
  ticketsCreated: number;
  warnings: string[];
}

const FORM_CACHE_KEY = "visit-report-form-cache";
const CATEGORY_CACHE_KEY = "visit-report-last-category";

interface FormCache {
  selectedLocation: string;
  selectedSpot: string;
  visitType: string;
  visitDate: string;
  hasObservationIssue: boolean;
  observationIssueLog: string;
  observationSeverity: string;
  confirmAccurate: boolean;
  slots: Omit<SlotEntry, 'swapPhotoFile'>[];
}

function loadFormCache(): Partial<FormCache> | null {
  try {
    const raw = localStorage.getItem(FORM_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearFormCache() {
  localStorage.removeItem(FORM_CACHE_KEY);
}

export default function NewVisitReport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const cached = useMemo(() => loadFormCache(), []);
  
  // Location Details state
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSpot, setSelectedSpot] = useState("");
  
  // Visit Details state
  const [visitType, setVisitType] = useState(cached?.visitType || "");
  const [visitDate, setVisitDate] = useState<Date>(cached?.visitDate ? new Date(cached.visitDate) : new Date());
  const [toyCategoryFilter, setToyCategoryFilter] = useState(() => {
    try {
      return localStorage.getItem(CATEGORY_CACHE_KEY) || "all";
    } catch {
      return "all";
    }
  });
  
  // Slots state
  const [slots, setSlots] = useState<SlotEntry[]>([]);
  
  // Observations state
  const [hasObservationIssue, setHasObservationIssue] = useState(cached?.hasObservationIssue || false);
  const [observationIssueLog, setObservationIssueLog] = useState(cached?.observationIssueLog || "");
  const [observationSeverity, setObservationSeverity] = useState(cached?.observationSeverity || "");
  
  // Photo & Sign Off state
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [visitPhotoFile, setVisitPhotoFile] = useState<File | null>(null);
  const [visitPhotoUrl, setVisitPhotoUrl] = useState<string | null>(null);
  const [observationPhotoFile, setObservationPhotoFile] = useState<File | null>(null);
  const [observationPhotoUrl, setObservationPhotoUrl] = useState<string | null>(null);

  // 30-day warning dialog state
  const [show30DayWarning, setShow30DayWarning] = useState(false);

  // Performance grade modal state
  const [showPerformanceGrade, setShowPerformanceGrade] = useState(false);
  const [performanceGrade, setPerformanceGrade] = useState<PerformanceGrade | null>(null);

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

  // Fetch spots for selected location (with setup info and last visit date)
  const { data: spotsWithSetups = [] } = useQuery({
    queryKey: ['spots-with-setups', selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) return [];
      const { data, error } = await supabase
        .from('spots')
        .select('*, setups(id, name)')
        .eq('location_id', selectedLocation)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;

      // Fetch last visit per spot
      const spotIds = (data || []).map((s: any) => s.id);
      let lastVisitMap: Record<string, string> = {};
      if (spotIds.length > 0) {
        const { data: visits } = await supabase
          .from('spot_visits')
          .select('spot_id, visit_date')
          .in('spot_id', spotIds)
          .eq('status', 'completed')
          .order('visit_date', { ascending: false });
        if (visits) {
          for (const v of visits) {
            if (v.spot_id && !lastVisitMap[v.spot_id]) {
              lastVisitMap[v.spot_id] = v.visit_date!;
            }
          }
        }
      }

      return (data || []).map((s: any) => ({
        ...s,
        hasSetup: Array.isArray(s.setups) ? s.setups.length > 0 : !!s.setups,
        lastVisitDate: lastVisitMap[s.id] || null,
        daysSinceLastVisit: lastVisitMap[s.id] ? differenceInDays(new Date(), new Date(lastVisitMap[s.id])) : null,
      }));
    },
    enabled: !!selectedLocation,
  });
  const spots = spotsWithSetups as (Spot & { hasSetup: boolean; lastVisitDate: string | null; daysSinceLastVisit: number | null })[];

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

  // Fetch products (merchandise type items) with category_id
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_details')
        .select('id, name, sku, type, category_id')
        .eq('type', 'merchandise')
        .order('name');
      if (error) throw error;
      return (data || []) as (ItemDetailBasic & { category_id: string | null })[];
    },
  });

  // Fetch categories for toy picker filter
  const { data: toyCategories = [] } = useQuery({
    queryKey: ['categories-for-visit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouses for visit: refill source (standard bodegas) and return vehicle (transitional)
  const { data: allVisitWarehouses = [] } = useQuery({
    queryKey: ['warehouses-for-visit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, is_system, is_transitional')
        .eq('is_system', false)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const refillSourceWarehouses = allVisitWarehouses.filter(w => !w.is_transitional);
  const returnVehicleWarehouses = allVisitWarehouses.filter(w => w.is_transitional);

  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>("");
  const [returnWarehouseId, setReturnWarehouseId] = useState<string>("");

  // Auto-select first refill source when loaded
  useEffect(() => {
    if (refillSourceWarehouses.length > 0 && !sourceWarehouseId) {
      setSourceWarehouseId(refillSourceWarehouses[0].id);
    }
  }, [refillSourceWarehouses, sourceWarehouseId]);

  // Determine if return vehicle is required (any visit type except installation)
  const requiresReturnVehicle = visitType && visitType !== "installation";

  // Fetch historical sales data for smart-restock guidance (Feature 5)
  const { data: salesHistory = [] } = useQuery({
    queryKey: ['sales-history', selectedSpot],
    queryFn: async () => {
      if (!selectedSpot) return [];
      // Get last 5 visits and their line items for this spot
      const { data: visits, error: vErr } = await supabase
        .from('spot_visits')
        .select('id, visit_date')
        .eq('spot_id', selectedSpot)
        .eq('status', 'completed')
        .order('visit_date', { ascending: false })
        .limit(5);
      if (vErr || !visits || visits.length < 2) return [];

      const visitIds = visits.map(v => v.id);
      const { data: lineItems, error: lErr } = await supabase
        .from('visit_line_items')
        .select('slot_id, cash_collected, quantity_added, spot_visit_id')
        .in('spot_visit_id', visitIds);
      if (lErr) return [];

      // Calculate per-slot daily sales rate
      const oldestDate = new Date(visits[visits.length - 1].visit_date!);
      const newestDate = new Date(visits[0].visit_date!);
      const daySpan = Math.max(1, differenceInDays(newestDate, oldestDate));

      // Group by slot_id and compute total cash
      const slotSales: Record<string, { totalCash: number; totalSold: number }> = {};
      for (const li of lineItems || []) {
        if (!li.slot_id) continue;
        if (!slotSales[li.slot_id]) slotSales[li.slot_id] = { totalCash: 0, totalSold: 0 };
        slotSales[li.slot_id].totalCash += li.cash_collected || 0;
      }

      // Return per-slot rate
      return Object.entries(slotSales).map(([slotId, data]) => ({
        slotId,
        dailyRate: data.totalCash / daySpan, // cash per day as proxy for units
        daySpan,
      }));
    },
    enabled: !!selectedSpot,
  });

  // Fetch average cash for this spot (for performance grade - Feature 7)
  const { data: spotAvgCash } = useQuery({
    queryKey: ['spot-avg-cash', selectedSpot],
    queryFn: async () => {
      if (!selectedSpot) return null;
      const { data, error } = await supabase
        .from('spot_visits')
        .select('total_cash_collected')
        .eq('spot_id', selectedSpot)
        .eq('status', 'completed')
        .order('visit_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      if (!data || data.length === 0) return 0;
      const sum = data.reduce((acc, v) => acc + (v.total_cash_collected || 0), 0);
      return sum / data.length;
    },
    enabled: !!selectedSpot,
  });

  // Filtered products based on category filter
  const filteredProducts = useMemo(() => {
    if (toyCategoryFilter === "all") return products;
    return products.filter((p) => p.category_id === toyCategoryFilter);
  }, [products, toyCategoryFilter]);

  // Calculate days since last visit (using startOfDay for accurate calendar-day count)
  const selectedLocation_ = locations.find(l => l.id === selectedLocation);
  const referenceDate = useMemo(() => {
    if (lastVisit?.visit_date) return { date: new Date(lastVisit.visit_date), label: "Last Visit" };
    if (visitType === 'installation' && selectedLocation_?.contract_start_date) {
      return { date: new Date(selectedLocation_.contract_start_date), label: "Contract Start" };
    }
    return null;
  }, [lastVisit, visitType, selectedLocation_]);

  const daysSinceLastVisit = useMemo(() => {
    if (visitType === 'installation') return 0;
    if (!referenceDate) return null;
    return differenceInDays(startOfDay(visitDate), startOfDay(referenceDate.date));
  }, [referenceDate, visitType, visitDate]);

  const getDaysSinceColor = (days: number | null) => {
    if (days === null) return "bg-muted text-muted-foreground";
    if (days < 15) return "bg-green-500/20 text-green-700 dark:text-green-400";
    if (days <= 30) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    return "bg-red-500/20 text-red-700 dark:text-red-400";
  };

  // Smart-restock guidance per slot
  const getRestockSuggestion = (slotId: string, currentStock: number, capacity: number) => {
    const history = salesHistory.find(h => h.slotId === slotId);
    if (!history || history.dailyRate <= 0) return null;
    const targetDays = 14;
    const suggested = Math.ceil(history.dailyRate * targetDays) - currentStock;
    return {
      suggested: Math.max(0, Math.min(suggested, capacity - currentStock)),
      dailyRate: history.dailyRate,
    };
  };

  // Prefill visit date to last visit date when spot changes
  useEffect(() => {
    if (lastVisit?.visit_date && selectedSpot) {
      setVisitDate(new Date(lastVisit.visit_date));
    }
  }, [lastVisit, selectedSpot]);

  // Auto-detect installation visit
  useEffect(() => {
    if (machineSlots.length > 0 && selectedSpot) {
      const allEmpty = machineSlots.every(
        slot => !slot.current_product_id && (slot.current_stock === 0 || slot.current_stock === null)
      );
      if (allEmpty) {
        setVisitType('installation');
        const location = locations.find(l => l.id === selectedLocation);
        if (location?.contract_start_date) {
          setVisitDate(new Date(location.contract_start_date));
        }
      } else {
        setVisitType('routine_service');
      }
    }
  }, [machineSlots, selectedSpot, selectedLocation, locations]);

  // Generate slots based on actual machine_slots from database
  useEffect(() => {
    if (machineSlots.length > 0 && selectedSpot && visitType) {
      const generatedSlots: SlotEntry[] = machineSlots.map((slot) => {
        const machine = machines.find(m => m.id === slot.machine_id);
        const product = products.length > 0 ? products.find(p => p.id === slot.current_product_id) : undefined;
        
        return {
          id: slot.id,
          machineId: slot.machine_id || '',
          machineSerialNo: machine?.serial_number || 'Unknown',
          slotId: slot.id,
          slotNumber: slot.slot_number,
          toyName: product?.name || (slot.current_product_id ? "Loading..." : "Unassigned"),
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
          previousProductId: slot.current_product_id || null,
          previousStock: slot.current_stock || 0,
          swapPhotoUrl: null,
          swapPhotoFile: null,
          newToyId: "",
          newToyName: "",
          newToyCapacity: slot.capacity || 150,
          newUnitsRefilled: 0,
          newPricePerUnit: 1,
          newCurrentStock: 0,
          swapSurplusShortage: 0,
        };
      });

      // Sort by slot_number ASC, then machine position_on_setup ASC
      generatedSlots.sort((a, b) => {
        if (a.slotNumber !== b.slotNumber) return a.slotNumber - b.slotNumber;
        const machineA = machines.find(m => m.id === a.machineId);
        const machineB = machines.find(m => m.id === b.machineId);
        return (machineA?.position_on_setup || 0) - (machineB?.position_on_setup || 0);
      });
      
      // Overlay cached slot values if restoring from cache
      if (cached?.slots && cached.slots.length > 0) {
        const restored = generatedSlots.map(slot => {
          const cs = cached.slots!.find((s: any) => s.slotId === slot.slotId);
          if (!cs) return slot;
          return {
            ...slot,
            unitsSold: cs.unitsSold || 0,
            unitsRefilled: cs.unitsRefilled || 0,
            unitsRemoved: cs.unitsRemoved || 0,
            falseCoins: cs.falseCoins || 0,
            auditedCount: cs.auditedCount ?? null,
            jamStatus: cs.jamStatus || "no_jam",
            reportIssue: cs.reportIssue || false,
            issueDescription: cs.issueDescription || "",
            severity: cs.severity || "",
            replaceAllToys: cs.replaceAllToys || false,
            toyId: cs.toyId || slot.toyId,
            // Always prefer the freshly resolved name from products over cached "Unassigned"
            toyName: slot.toyName !== "Unassigned" ? slot.toyName : (cs.toyName && cs.toyName !== "Unassigned" ? cs.toyName : slot.toyName),
            pricePerUnit: cs.pricePerUnit || slot.pricePerUnit,
            capacity: cs.capacity || slot.capacity,
            toyCapacity: cs.toyCapacity || slot.toyCapacity,
            currentStock: cs.currentStock ?? slot.currentStock,
            cashCollected: cs.cashCollected ?? slot.cashCollected,
          };
        });
        setSlots(restored);
      } else {
        setSlots(generatedSlots);
      }
    } else if (!selectedSpot || !visitType) {
      setSlots([]);
    }
  }, [machineSlots, machines, products, selectedSpot, visitType]);

  // Auto-save form state to localStorage
  useEffect(() => {
    const cache: FormCache = {
      selectedLocation,
      selectedSpot,
      visitType,
      visitDate: visitDate.toISOString(),
      hasObservationIssue,
      observationIssueLog,
      observationSeverity,
      confirmAccurate,
      slots: slots.map(s => ({ ...s, swapPhotoFile: null })),
    };
    localStorage.setItem(FORM_CACHE_KEY, JSON.stringify(cache));
  }, [selectedLocation, selectedSpot, visitType, visitDate, hasObservationIssue, observationIssueLog, observationSeverity, confirmAccurate, slots]);

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
      } else if (updated.replaceAllToys) {
        // For swap: old product current stock should reach 0
        const jamAdjustment = updated.jamStatus === 'by_coin' ? 1 : 0;
        const falseCoinsAdj = updated.falseCoins || 0;
        updated.currentStock = updated.lastStock - updated.unitsSold + jamAdjustment - falseCoinsAdj - updated.unitsRemoved;
        updated.swapSurplusShortage = -updated.currentStock; // negate: positive = surplus (extra units), negative = shortage (missing units)
        // New product stock
        updated.newCurrentStock = updated.newUnitsRefilled;
      } else {
        const jamAdjustment = updated.jamStatus === 'by_coin' ? 1 : 0;
        const falseCoinsAdj = updated.falseCoins || 0;
        updated.currentStock = updated.lastStock - updated.unitsSold + jamAdjustment - falseCoinsAdj + updated.unitsRefilled - updated.unitsRemoved;
      }
      
      // Calculate cash collected (always from old product sales)
      updated.cashCollected = updated.unitsSold * updated.pricePerUnit;
      
      return updated;
    }));
  };

  // Check if swap photos are required but missing (Feature 4 validation)
  const hasMissingSwapPhotos = useMemo(() => {
    return slots.some(s => s.replaceAllToys && s.toyId && !s.swapPhotoFile && !s.swapPhotoUrl);
  }, [slots]);

  // Handle swap photo upload for a slot
  const handleSwapPhotoSelect = (slotId: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    updateSlot(slotId, { swapPhotoFile: file, swapPhotoUrl: previewUrl });
  };

  // Upload swap photos to storage and return URLs
  const uploadSwapPhotos = async (visitId: string): Promise<Record<string, string>> => {
    const photoUrls: Record<string, string> = {};
    for (const slot of slots) {
      if (slot.replaceAllToys && slot.swapPhotoFile) {
        const filePath = `swap-evidence/${visitId}/${slot.slotId}.jpg`;
        const { error } = await supabase.storage
          .from('item-photos')
          .upload(filePath, slot.swapPhotoFile, { upsert: true });
        if (!error) {
          const { data: urlData } = supabase.storage
            .from('item-photos')
            .getPublicUrl(filePath);
          photoUrls[slot.slotId] = urlData.publicUrl;
        }
      }
    }
    return photoUrls;
  };

  // Submit visit report mutation — now calls edge function
  const submitVisitReport = useMutation({
    mutationFn: async () => {
      const visitTypeData = visitTypes.find(t => t.id === visitType);

      // Upload swap photos first (we use a temp ID then the real one from the edge fn)
      // Actually, photos need visit_id from DB. We'll upload after getting visitId from response.
      
      const payload = {
        spotId: selectedSpot,
        locationId: selectedLocation,
        setupId: spotSetup?.id || "",
        visitDate: visitDate.toISOString(),
        visitType,
        actionType: visitTypeData?.actionType || "collection",
        totalCashCollected: totals.totalCashCollected,
        hasObservationIssue,
        observationIssueLog,
        observationSeverity,
        sourceWarehouseId: sourceWarehouseId || null,
        returnWarehouseId: returnWarehouseId || null,
        slots: slots.map(s => ({
          slotId: s.slotId,
          machineId: s.machineId,
          toyId: s.toyId,
          toyName: s.toyName,
          replaceAllToys: s.replaceAllToys,
          lastStock: s.lastStock,
          unitsSold: s.unitsSold,
          unitsRefilled: s.replaceAllToys ? 0 : s.unitsRefilled,
          unitsRemoved: s.unitsRemoved,
          falseCoins: s.falseCoins,
          auditedCount: s.auditedCount,
          currentStock: s.replaceAllToys ? s.newCurrentStock : s.currentStock,
          pricePerUnit: s.pricePerUnit,
          jamStatus: s.jamStatus,
          capacity: s.replaceAllToys ? s.newToyCapacity : s.capacity,
          reportIssue: s.reportIssue,
          issueDescription: s.issueDescription,
          severity: s.severity,
          cashCollected: s.cashCollected,
          photoUrl: null,
          previousProductId: s.previousProductId,
          previousStock: s.previousStock,
          newToyId: s.newToyId || "",
          newToyName: s.newToyName || "",
          newToyCapacity: s.newToyCapacity || 150,
          newUnitsRefilled: s.newUnitsRefilled || 0,
          newPricePerUnit: s.newPricePerUnit || 1,
          newCurrentStock: s.newCurrentStock || 0,
          swapSurplusShortage: s.replaceAllToys ? s.swapSurplusShortage : 0,
        })),
      };

      const { data, error } = await supabase.functions.invoke('submit-visit-report', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Upload swap photos now that we have visitId
      if (data?.visitId) {
        const photoUrls = await uploadSwapPhotos(data.visitId);
        // Update visit_line_items with photo URLs if any
        for (const [slotId, url] of Object.entries(photoUrls)) {
          await supabase
            .from('visit_line_items')
            .update({ photo_url: url } as any)
            .eq('spot_visit_id', data.visitId)
            .eq('slot_id', slotId);
        }

        // Upload visit verification photo
        if (visitPhotoFile) {
          const visitPhotoPath = `visit-photos/${data.visitId}/verification.jpg`;
          const { error: vpErr } = await supabase.storage
            .from('item-photos')
            .upload(visitPhotoPath, visitPhotoFile, { upsert: true });
          if (!vpErr) {
            const { data: vpUrl } = supabase.storage.from('item-photos').getPublicUrl(visitPhotoPath);
            await supabase
              .from('spot_visits')
              .update({ verification_photo_url: vpUrl.publicUrl })
              .eq('id', data.visitId);
          }
        }

        // Upload observation photo
        if (observationPhotoFile) {
          const obsPhotoPath = `visit-photos/${data.visitId}/observation.jpg`;
          const { error: opErr } = await supabase.storage
            .from('item-photos')
            .upload(obsPhotoPath, observationPhotoFile, { upsert: true });
          if (!opErr) {
            const { data: opUrl } = supabase.storage.from('item-photos').getPublicUrl(obsPhotoPath);
            // Append observation photo URL to the notes
            await supabase
              .from('spot_visits')
              .update({ notes: `${data.notes || ''}\n[Observation Photo](${opUrl.publicUrl})`.trim() } as any)
              .eq('id', data.visitId);
          }
        }
      }

      return data;
    },
    onSuccess: (data) => {
      clearFormCache();
      queryClient.invalidateQueries({ queryKey: ['spot_visits'] });
      queryClient.invalidateQueries({ queryKey: ['machine-slots'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });

      // Show warnings if any
      if (data?.warnings?.length > 0) {
        data.warnings.forEach((w: string) => toast.warning(w));
      }

      // Show performance grade modal (Feature 7)
      const avgCash = spotAvgCash || 0;
      const totalCash = totals.totalCashCollected;
      let grade: "above" | "average" | "below" = "average";
      if (avgCash > 0) {
        const ratio = totalCash / avgCash;
        if (ratio >= 1.1) grade = "above";
        else if (ratio < 0.9) grade = "below";
      }

      setPerformanceGrade({
        totalCash,
        avgCash,
        grade,
        slotsServiced: slots.length,
        issuesFlagged: slots.filter(s => s.reportIssue).length + (hasObservationIssue ? 1 : 0),
        ticketsCreated: data?.ticketsCreated || 0,
        warnings: data?.warnings || [],
      });
      setShowPerformanceGrade(true);
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
    if (requiresReturnVehicle && !returnWarehouseId) {
      toast.error("Please select a return vehicle");
      return;
    }
    if (!confirmAccurate) {
      toast.error("Please confirm the report is accurate");
      return;
    }
    if (hasMissingSwapPhotos) {
      toast.error("Please upload a photo for each product swap");
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
    const locationObj = locations.find(l => l.id === selectedLocation);
    const spotObj = spots.find(s => s.id === selectedSpot);
    const draft: VisitDraft = {
      id: `draft-${selectedLocation}-${selectedSpot}-${Date.now()}`,
      savedAt: new Date().toISOString(),
      locationName: locationObj?.name || "",
      spotName: spotObj?.name || "",
      visitType,
      selectedLocation,
      selectedSpot,
      visitDate: visitDate.toISOString(),
      slots: slots.map(s => ({ ...s, swapPhotoFile: null })), // Can't serialize File
      hasObservationIssue,
      observationIssueLog,
      observationSeverity,
    };
    saveDraft(draft);
    toast.success("Draft saved successfully!");
  };

  const handleLoadDraft = (draft: VisitDraft) => {
    setSelectedLocation(draft.selectedLocation);
    setSelectedSpot(draft.selectedSpot);
    setVisitType(draft.visitType);
    setVisitDate(new Date(draft.visitDate));
    setHasObservationIssue(draft.hasObservationIssue);
    setObservationIssueLog(draft.observationIssueLog);
    setObservationSeverity(draft.observationSeverity);
    // Slots will be regenerated from DB when spot loads, but we restore user-entered values after
    if (draft.slots?.length > 0) {
      // Wait for slots to regenerate from DB, then overlay draft values
      setTimeout(() => {
        setSlots(prev => {
          if (prev.length === 0) return prev;
          return prev.map(slot => {
            const draftSlot = draft.slots.find((ds: any) => ds.slotId === slot.slotId);
            if (!draftSlot) return slot;
            return {
              ...slot,
              unitsSold: draftSlot.unitsSold || 0,
              unitsRefilled: draftSlot.unitsRefilled || 0,
              unitsRemoved: draftSlot.unitsRemoved || 0,
              falseCoins: draftSlot.falseCoins || 0,
              auditedCount: draftSlot.auditedCount ?? null,
              jamStatus: draftSlot.jamStatus || "no_jam",
              reportIssue: draftSlot.reportIssue || false,
              issueDescription: draftSlot.issueDescription || "",
              severity: draftSlot.severity || "",
              replaceAllToys: draftSlot.replaceAllToys || false,
              toyId: draftSlot.toyId || slot.toyId,
              toyName: draftSlot.toyName || slot.toyName,
              pricePerUnit: draftSlot.pricePerUnit || slot.pricePerUnit,
              capacity: draftSlot.capacity || slot.capacity,
              toyCapacity: draftSlot.toyCapacity || slot.toyCapacity,
            };
          });
        });
      }, 1500);
    }
    toast.success("Draft loaded!");
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

  // Render smart-restock suggestion (Feature 5)
  const renderRestockSuggestion = (slot: SlotEntry) => {
    if (visitType === 'installation') return null;
    const suggestion = getRestockSuggestion(slot.slotId, slot.lastStock, slot.capacity);
    if (!suggestion || suggestion.suggested <= 0) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
        <Lightbulb className="w-3 h-3 text-yellow-500" />
        <span>Suggested: ~{suggestion.suggested} units (based on {fmt2(suggestion.dailyRate)}/day avg)</span>
      </div>
    );
  };

  // Render swap photo upload area (Feature 4)
  const renderSwapPhotoUpload = (slot: SlotEntry) => {
    if (!slot.replaceAllToys || !slot.toyId) return null;
    return (
      <div className="border-t border-border pt-3 mt-3">
        <Label className="flex items-center gap-1.5 text-sm font-medium mb-2">
          <Camera className="w-4 h-4" />
          Swap Evidence Photo <span className="text-destructive">*</span>
        </Label>
        {slot.swapPhotoUrl ? (
          <div className="relative w-32 h-32 rounded-md overflow-hidden border border-border">
            <img src={slot.swapPhotoUrl} alt="Swap evidence" className="w-full h-full object-cover" />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={() => updateSlot(slot.id, { swapPhotoFile: null, swapPhotoUrl: null })}
            >
              ×
            </Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-muted-foreground/40 rounded-md cursor-pointer hover:border-primary/60 transition-colors">
            <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Upload</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSwapPhotoSelect(slot.id, file);
              }}
            />
          </label>
        )}
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
               <ToyPicker
                products={filteredProducts}
                categories={toyCategories}
                value={slot.toyId}
                onSelect={(id, name) => updateSlot(slot.id, { toyId: id, toyName: name })}
                label="Assign Toy"
                placeholder="Search toy..."
                showCategoryFilter={false}
              />
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
                  onCheckedChange={(checked) => {
                    updateSlot(slot.id, { replaceAllToys: !!checked });
                  }}
                />
                <Label htmlFor={`replace-${slot.id}`}>Replace all toys in this slot</Label>
              </div>

              {slot.replaceAllToys ? (
                <>
                  {/* Phase 1: Closing Out Old Product */}
                  <div className="p-3 rounded-md border border-border bg-muted/30 space-y-4 mb-4">
                    <p className="text-sm font-semibold text-muted-foreground">Closing Out: {slot.toyName}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Last Stock</Label>
                        <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.lastStock}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Units Sold</Label>
                        <Input type="number" min="0" value={slot.unitsSold || ""} onChange={(e) => updateSlot(slot.id, { unitsSold: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Units Removed</Label>
                        <Input type="number" min="0" value={slot.unitsRemoved || ""} onChange={(e) => updateSlot(slot.id, { unitsRemoved: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>False Coins</Label>
                        <Input type="number" min="0" value={slot.falseCoins || ""} onChange={(e) => updateSlot(slot.id, { falseCoins: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price/Unit</Label>
                        <div className="p-2 bg-muted rounded-md text-foreground font-medium">${fmt2(slot.pricePerUnit)}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Jam Status</Label>
                        <Select value={slot.jamStatus} onValueChange={(value) => updateSlot(slot.id, { jamStatus: value })}>
                          <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {jamStatusOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Current Stock</Label>
                        <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.currentStock}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Surplus / Shortage</Label>
                        <div className={cn(
                          "p-2 rounded-md font-medium",
                          slot.swapSurplusShortage > 0 ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                          slot.swapSurplusShortage < 0 ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                          "bg-muted text-foreground"
                        )}>
                          {slot.swapSurplusShortage > 0 ? `+${slot.swapSurplusShortage} surplus` : slot.swapSurplusShortage < 0 ? `${slot.swapSurplusShortage} shortage` : "0"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 2: New Product Setup */}
                  <div className="p-3 rounded-md border-2 border-primary/30 bg-primary/5 space-y-4">
                    <p className="text-sm font-semibold text-primary">New Product Setup</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <ToyPicker
                        products={filteredProducts}
                        categories={toyCategories}
                        value={slot.newToyId}
                        onSelect={(id, name) => updateSlot(slot.id, { newToyId: id, newToyName: name })}
                        label="Assign Toy"
                        placeholder="Search toy..."
                        showCategoryFilter={false}
                      />
                      <div className="space-y-2">
                        <Label>Toy Capacity</Label>
                        <Input type="number" min="0" value={slot.newToyCapacity || ""} onChange={(e) => updateSlot(slot.id, { newToyCapacity: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Units Refilled</Label>
                        <Input type="number" min="0" value={slot.newUnitsRefilled || ""} onChange={(e) => updateSlot(slot.id, { newUnitsRefilled: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price/Unit ($)</Label>
                        <Input type="number" min="0" step="0.01" value={slot.newPricePerUnit || ""} onChange={(e) => updateSlot(slot.id, { newPricePerUnit: parseFloat(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Stock</Label>
                        <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.newCurrentStock}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        {(() => {
                          const pct = slot.newToyCapacity > 0 ? Math.round((slot.newCurrentStock / slot.newToyCapacity) * 100) : 0;
                          const colorClass = pct <= 25 ? "bg-red-500" : pct <= 50 ? "bg-yellow-500" : pct <= 75 ? "bg-blue-500" : "bg-green-500";
                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{slot.newCurrentStock} / {slot.newToyCapacity}</span>
                                <span className="font-semibold">{pct}%</span>
                              </div>
                              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                                <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Swap Photo Upload */}
                  {renderSwapPhotoUpload(slot)}
                </>
              ) : (
                /* Normal routine view (no swap) */
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Last Stock</Label>
                      <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.lastStock}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Units Sold</Label>
                      <Input type="number" min="0" value={slot.unitsSold || ""} onChange={(e) => updateSlot(slot.id, { unitsSold: parseInt(e.target.value) || 0 })} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>Units Refilled</Label>
                      <Input type="number" min="0" value={slot.unitsRefilled || ""} onChange={(e) => updateSlot(slot.id, { unitsRefilled: parseInt(e.target.value) || 0 })} className="bg-card" />
                      {renderRestockSuggestion(slot)}
                    </div>
                    <div className="space-y-2">
                      <Label>Units Removed</Label>
                      <Input type="number" min="0" value={slot.unitsRemoved || ""} onChange={(e) => updateSlot(slot.id, { unitsRemoved: parseInt(e.target.value) || 0 })} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>False Coins</Label>
                      <Input type="number" min="0" value={slot.falseCoins || ""} onChange={(e) => updateSlot(slot.id, { falseCoins: parseInt(e.target.value) || 0 })} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Stock</Label>
                      <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.currentStock}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Price/Unit</Label>
                      <div className="p-2 bg-muted rounded-md text-foreground font-medium">${fmt2(slot.pricePerUnit)}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Jam Status</Label>
                      <Select value={slot.jamStatus} onValueChange={(value) => updateSlot(slot.id, { jamStatus: value })}>
                        <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {jamStatusOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-2">
                    <Label>Capacity</Label>
                    {renderCapacityIndicator(slot)}
                  </div>
                </>
              )}

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

              {slot.replaceAllToys ? (
                <>
                  {/* Phase 1: Closing Out Old Product */}
                  <div className="p-3 rounded-md border border-border bg-muted/30 space-y-4 mb-4">
                    <p className="text-sm font-semibold text-muted-foreground">Closing Out: {slot.toyName}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Last Stock</Label>
                        <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.lastStock}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Units Sold</Label>
                        <Input type="number" min="0" value={slot.unitsSold || ""} onChange={(e) => updateSlot(slot.id, { unitsSold: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Units Removed</Label>
                        <Input type="number" min="0" value={slot.unitsRemoved || ""} onChange={(e) => updateSlot(slot.id, { unitsRemoved: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>False Coins</Label>
                        <Input type="number" min="0" value={slot.falseCoins || ""} onChange={(e) => updateSlot(slot.id, { falseCoins: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price/Unit</Label>
                        <div className="p-2 bg-muted rounded-md text-foreground font-medium">${fmt2(slot.pricePerUnit)}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Jam Status</Label>
                        <Select value={slot.jamStatus} onValueChange={(value) => updateSlot(slot.id, { jamStatus: value })}>
                          <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {jamStatusOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Current Stock</Label>
                        <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.currentStock}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Surplus / Shortage</Label>
                        <div className={cn(
                          "p-2 rounded-md font-medium",
                          slot.swapSurplusShortage > 0 ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                          slot.swapSurplusShortage < 0 ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                          "bg-muted text-foreground"
                        )}>
                          {slot.swapSurplusShortage > 0 ? `+${slot.swapSurplusShortage} surplus` : slot.swapSurplusShortage < 0 ? `${slot.swapSurplusShortage} shortage` : "0"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 2: New Product Setup */}
                  <div className="p-3 rounded-md border-2 border-primary/30 bg-primary/5 space-y-4">
                    <p className="text-sm font-semibold text-primary">New Product Setup</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <ToyPicker
                        products={filteredProducts}
                        categories={toyCategories}
                        value={slot.newToyId}
                        onSelect={(id, name) => updateSlot(slot.id, { newToyId: id, newToyName: name })}
                        label="Assign Toy"
                        placeholder="Search toy..."
                        showCategoryFilter={false}
                      />
                      <div className="space-y-2">
                        <Label>Toy Capacity</Label>
                        <Input type="number" min="0" value={slot.newToyCapacity || ""} onChange={(e) => updateSlot(slot.id, { newToyCapacity: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Units Refilled</Label>
                        <Input type="number" min="0" value={slot.newUnitsRefilled || ""} onChange={(e) => updateSlot(slot.id, { newUnitsRefilled: parseInt(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Price/Unit ($)</Label>
                        <Input type="number" min="0" step="0.01" value={slot.newPricePerUnit || ""} onChange={(e) => updateSlot(slot.id, { newPricePerUnit: parseFloat(e.target.value) || 0 })} className="bg-card" />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Stock</Label>
                        <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.newCurrentStock}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        {(() => {
                          const pct = slot.newToyCapacity > 0 ? Math.round((slot.newCurrentStock / slot.newToyCapacity) * 100) : 0;
                          const colorClass = pct <= 25 ? "bg-red-500" : pct <= 50 ? "bg-yellow-500" : pct <= 75 ? "bg-blue-500" : "bg-green-500";
                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{slot.newCurrentStock} / {slot.newToyCapacity}</span>
                                <span className="font-semibold">{pct}%</span>
                              </div>
                              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                                <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Swap Photo Upload */}
                  {renderSwapPhotoUpload(slot)}
                </>
              ) : (
                /* Normal audit view (no swap) */
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Last Stock</Label>
                      <div className="p-2 bg-muted rounded-md text-foreground font-medium">{slot.lastStock}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Units Sold</Label>
                      <Input type="number" min="0" value={slot.unitsSold || ""} onChange={(e) => updateSlot(slot.id, { unitsSold: parseInt(e.target.value) || 0 })} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>Units Refilled</Label>
                      <Input type="number" min="0" value={slot.unitsRefilled || ""} onChange={(e) => updateSlot(slot.id, { unitsRefilled: parseInt(e.target.value) || 0 })} className="bg-card" />
                      {renderRestockSuggestion(slot)}
                    </div>
                    <div className="space-y-2">
                      <Label>Units Removed</Label>
                      <Input type="number" min="0" value={slot.unitsRemoved || ""} onChange={(e) => updateSlot(slot.id, { unitsRemoved: parseInt(e.target.value) || 0 })} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>False Coins</Label>
                      <Input type="number" min="0" value={slot.falseCoins || ""} onChange={(e) => updateSlot(slot.id, { falseCoins: parseInt(e.target.value) || 0 })} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>Audited Count (Physical)</Label>
                      <Input type="number" min="0" placeholder="Enter count" value={slot.auditedCount ?? ""} onChange={(e) => updateSlot(slot.id, { auditedCount: e.target.value ? parseInt(e.target.value) : null })} className="bg-card" />
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
                      <div className="p-2 bg-muted rounded-md text-foreground font-medium">${fmt2(slot.pricePerUnit)}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Jam Status</Label>
                      <Select value={slot.jamStatus} onValueChange={(value) => updateSlot(slot.id, { jamStatus: value })}>
                        <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {jamStatusOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity</Label>
                      {renderCapacityIndicator(slot)}
                    </div>
                  </div>
                </>
              )}

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

  const getGradeIcon = (grade: string) => {
    if (grade === "above") return <TrendingUp className="w-8 h-8 text-green-500" />;
    if (grade === "below") return <TrendingDown className="w-8 h-8 text-red-500" />;
    return <Minus className="w-8 h-8 text-yellow-500" />;
  };

  const getGradeColor = (grade: string) => {
    if (grade === "above") return "text-green-600 dark:text-green-400";
    if (grade === "below") return "text-red-600 dark:text-red-400";
    return "text-yellow-600 dark:text-yellow-400";
  };

  const getGradeLabel = (grade: string) => {
    if (grade === "above") return "Above Average";
    if (grade === "below") return "Below Average";
    return "Average";
  };

  return (
    <AppLayout
      title="New Visit Report"
      subtitle="Record a field service visit"
      actions={
        <div className="flex items-center gap-2">
          <VisitDraftsDropdown onLoadDraft={handleLoadDraft} />
          <Button variant="outline" onClick={() => navigate("/visits")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Visits
          </Button>
        </div>
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
                  {[...spots]
                    .sort((a, b) => {
                      // First sort by name (numeric)
                      const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true });
                      if (nameCompare !== 0) return nameCompare;
                      // Then by days since last visit (descending — longest ago first)
                      const aDays = a.daysSinceLastVisit ?? Infinity;
                      const bDays = b.daysSinceLastVisit ?? Infinity;
                      return bDays - aDays;
                    })
                    .map((spot) => (
                    <SelectItem 
                      key={spot.id} 
                      value={spot.id}
                      disabled={!spot.hasSetup}
                      className={cn(!spot.hasSetup && "opacity-50")}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span>{spot.name} {spot.description ? `- ${spot.description}` : ""}</span>
                        {spot.hasSetup ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                            <CheckCircle className="w-3 h-3 mr-0.5" /> Operational
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-destructive/20 text-destructive border-0">
                            No Setup
                          </Badge>
                        )}
                        {spot.daysSinceLastVisit !== null && spot.hasSetup && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 text-muted-foreground">
                            <Clock className="w-3 h-3 mr-0.5" /> {spot.daysSinceLastVisit}d ago
                          </Badge>
                        )}
                        {spot.daysSinceLastVisit === null && spot.hasSetup && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-0 text-muted-foreground">
                            Never visited
                          </Badge>
                        )}
                      </div>
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
              <Label>Product Category</Label>
              <Select value={toyCategoryFilter} onValueChange={(val) => {
                setToyCategoryFilter(val);
                try { localStorage.setItem(CATEGORY_CACHE_KEY, val); } catch {}
              }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {toyCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
                {referenceDate && (
                  <p className="text-xs text-muted-foreground">
                    {referenceDate.label}: {format(referenceDate.date, "PPP")}
                  </p>
                )}
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
                {observationPhotoUrl ? (
                  <div className="relative w-32 h-32">
                    <img src={observationPhotoUrl} alt="Observation" className="w-full h-full object-cover rounded-md border" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => { setObservationPhotoFile(null); setObservationPhotoUrl(null); }}
                    >×</Button>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="observation-photo-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setObservationPhotoFile(file); setObservationPhotoUrl(URL.createObjectURL(file)); }
                      }}
                    />
                    <Button variant="outline" className="gap-2" onClick={() => document.getElementById('observation-photo-upload')?.click()}>
                      <ImagePlus className="w-4 h-4" />
                      Upload Image
                    </Button>
                  </>
                )}
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
              {visitPhotoUrl ? (
                <div className="relative w-32 h-32">
                  <img src={visitPhotoUrl} alt="Visit" className="w-full h-full object-cover rounded-md border" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => { setVisitPhotoFile(null); setVisitPhotoUrl(null); }}
                  >×</Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    id="visit-photo-camera"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setVisitPhotoFile(file); setVisitPhotoUrl(URL.createObjectURL(file)); }
                    }}
                  />
                  <Button variant="outline" className="gap-2" onClick={() => document.getElementById('visit-photo-camera')?.click()}>
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="visit-photo-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setVisitPhotoFile(file); setVisitPhotoUrl(URL.createObjectURL(file)); }
                    }}
                  />
                  <Button variant="outline" className="gap-2" onClick={() => document.getElementById('visit-photo-upload')?.click()}>
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                </div>
              )}
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

        {/* Swap Photo Warning */}
        {hasMissingSwapPhotos && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Please upload a photo for each product swap before submitting.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitVisitReport.isPending || hasMissingSwapPhotos}
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

      {/* Performance Grade Modal (Feature 7) */}
      <Dialog open={showPerformanceGrade} onOpenChange={setShowPerformanceGrade}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Visit Report Submitted
            </DialogTitle>
            <DialogDescription>
              Here's a summary of this visit's performance.
            </DialogDescription>
          </DialogHeader>
          
          {performanceGrade && (
            <div className="space-y-4 py-2">
              {/* Grade */}
              <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
                {getGradeIcon(performanceGrade.grade)}
                <div>
                  <p className={cn("text-xl font-bold", getGradeColor(performanceGrade.grade))}>
                    {getGradeLabel(performanceGrade.grade)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    vs. ${fmt2(performanceGrade.avgCash)} avg
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-md text-center">
                  <p className="text-lg font-bold text-foreground">${fmt2(performanceGrade.totalCash)}</p>
                  <p className="text-xs text-muted-foreground">Cash Collected</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md text-center">
                  <p className="text-lg font-bold text-foreground">{performanceGrade.slotsServiced}</p>
                  <p className="text-xs text-muted-foreground">Slots Serviced</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md text-center">
                  <p className="text-lg font-bold text-foreground">{performanceGrade.issuesFlagged}</p>
                  <p className="text-xs text-muted-foreground">Issues Flagged</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md text-center">
                  <p className="text-lg font-bold text-foreground">{performanceGrade.ticketsCreated}</p>
                  <p className="text-xs text-muted-foreground">Tickets Created</p>
                </div>
              </div>

              {/* Warnings */}
              {performanceGrade.warnings.length > 0 && (
                <div className="space-y-1">
                  {performanceGrade.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => {
              setShowPerformanceGrade(false);
              navigate("/visits");
            }} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
