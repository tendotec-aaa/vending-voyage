import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArrowLeft, 
  Camera, 
  Upload,
  Save, 
  CalendarIcon,
  AlertTriangle,
  ImagePlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Visit types
const visitTypes = [
  { id: "installation", name: "Installation" },
  { id: "routine_service", name: "Routine Service" },
  { id: "inventory_audit", name: "Inventory Audit" },
  { id: "maintenance", name: "Maintenance" },
  { id: "emergency", name: "Emergency" },
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

// Mock toys data (to be replaced with real data)
const toys = [
  { id: "TOY-001", name: "Plush Bear Collection" },
  { id: "TOY-002", name: "Capsule Figures Series A" },
  { id: "TOY-003", name: "Keychain Buddies" },
  { id: "TOY-004", name: "Mini Vehicles Pack" },
  { id: "TOY-005", name: "Bouncy Balls Premium" },
];

interface SlotEntry {
  id: string;
  machineSerialNo: string;
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
  // Installation specific
  toyCapacity: number;
}

export default function NewVisitReport() {
  const navigate = useNavigate();
  
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
    queryKey: ['location-spots', selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) return [];
      const { data, error } = await supabase
        .from('location_spots')
        .select('*, setups(*)')
        .eq('location_id', selectedLocation)
        .order('spot_number');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLocation,
  });

  // Fetch machines for selected spot's setup
  const selectedSpotData = spots.find(s => s.id === selectedSpot);
  const setupId = selectedSpotData?.setup_id;

  const { data: machines = [] } = useQuery({
    queryKey: ['machines', setupId],
    queryFn: async () => {
      if (!setupId) return [];
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('setup_id', setupId)
        .order('serial_number');
      if (error) throw error;
      return data;
    },
    enabled: !!setupId,
  });

  // Generate slots based on machines (mock: 2 slots per machine)
  useMemo(() => {
    if (machines.length > 0 && selectedSpot && visitType) {
      const slotsPerMachine = 2; // This would come from machine configuration
      const generatedSlots: SlotEntry[] = [];
      
      machines.forEach((machine, machineIndex) => {
        for (let slotNum = 1; slotNum <= slotsPerMachine; slotNum++) {
          generatedSlots.push({
            id: `${machine.id}-slot-${slotNum}`,
            machineSerialNo: machine.serial_number,
            slotNumber: slotNum,
            toyName: toys[machineIndex % toys.length]?.name || "Unassigned",
            toyId: toys[machineIndex % toys.length]?.id || "",
            replaceAllToys: false,
            lastStock: 45, // Would come from last visit
            unitsSold: 0,
            unitsRefilled: 0,
            unitsRemoved: 0,
            falseCoins: 0,
            auditedCount: null,
            currentStock: 45,
            pricePerUnit: 1,
            jamStatus: "no_jam",
            capacity: 95,
            reportIssue: false,
            issueDescription: "",
            severity: "",
            toyCapacity: 0,
          });
        }
      });
      
      setSlots(generatedSlots);
    } else if (!selectedSpot || !visitType) {
      setSlots([]);
    }
  }, [machines, selectedSpot, visitType]);

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
      
      return updated;
    }));
  };

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
    
    toast.success("Visit report submitted successfully!");
    navigate("/visits");
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved successfully!");
  };

  const getCapacityDisplay = (slot: SlotEntry) => {
    const percentage = Math.round((slot.currentStock / slot.capacity) * 100);
    return `${slot.capacity} / ${percentage}% full`;
  };

  const renderSlotCard = (slot: SlotEntry, index: number) => {
    const isInstallation = visitType === 'installation';
    const isAudit = visitType === 'inventory_audit';
    
    return (
      <Card key={slot.id} className="p-4 bg-background border-border">
        <div className="space-y-4">
          {/* Header Info */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="text-sm text-muted-foreground">Machine Serial No.</p>
              <p className="font-semibold text-foreground">{slot.machineSerialNo}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Slot #{slot.slotNumber}</p>
              <p className="font-medium text-foreground">
                {isInstallation ? "Assign Toy:" : "Toy Name:"} {slot.toyName}
              </p>
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
                    const toy = toys.find(t => t.id === value);
                    updateSlot(slot.id, { toyId: value, toyName: toy?.name || "" });
                  }}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Select toy" />
                  </SelectTrigger>
                  <SelectContent>
                    {toys.map((toy) => (
                      <SelectItem key={toy.id} value={toy.id}>
                        {toy.name}
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
                <div className="p-2 bg-muted rounded-md text-foreground font-medium">
                  {getCapacityDisplay(slot)}
                </div>
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
                    ${slot.pricePerUnit.toFixed(2)}
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
              
              <div className="mt-2">
                <Label>Capacity</Label>
                <div className="p-2 bg-muted rounded-md text-foreground font-medium w-fit">
                  {getCapacityDisplay(slot)}
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
                    ${slot.pricePerUnit.toFixed(2)}
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
                  <div className="p-2 bg-muted rounded-md text-foreground font-medium">
                    {getCapacityDisplay(slot)}
                  </div>
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
                      Spot {spot.spot_number} {spot.setups ? `- ${spot.setups.name}` : "(Empty)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
            <div className="space-y-2">
              <Label>Total Cash Collected</Label>
              <div className="p-3 bg-muted rounded-md text-foreground font-semibold text-lg">
                ${totals.totalCashCollected.toFixed(2)}
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
                <p>No machines found in this setup.</p>
                <p className="text-sm">Please ensure machines are assigned to this spot's setup.</p>
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
        <div className="flex justify-end gap-4 pb-6">
          <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            Submit Report
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
