import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, MoreVertical, MapPin, Wrench } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import type { Database } from "@/integrations/supabase/types";

type Machine = Database["public"]["Tables"]["machines"]["Row"];
type MachineStatus = Database["public"]["Enums"]["machine_status"];

interface ItemDetailBasic {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  subcategory_id: string | null;
}

const statusConfig: Record<MachineStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  in_warehouse: { label: "In Warehouse", variant: "secondary" },
  deployed: { label: "Deployed", variant: "default" },
  maintenance: { label: "Maintenance", variant: "destructive" },
  retired: { label: "Retired", variant: "outline" },
};

export default function MachinesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Form state for bulk registration
  const [serialGeneration, setSerialGeneration] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [numberOfUnits, setNumberOfUnits] = useState("1");
  const [numberOfSlots, setNumberOfSlots] = useState("1");
  const [cashKey, setCashKey] = useState("");
  const [toyKey, setToyKey] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories();

  // Find "Machines" category for preselection
  const machinesCategory = categories.find(c => c.name.toLowerCase() === "machines");

  // Fetch machines from database
  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("serial_number");
      if (error) throw error;
      return data;
    },
  });

  // Fetch item_details filtered by category (for models)
  const { data: models = [] } = useQuery({
    queryKey: ["item-details-by-category", selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const { data, error } = await supabase
        .from("item_details")
        .select("id, name, sku, category_id, subcategory_id")
        .eq("category_id", selectedCategoryId)
        .order("name");
      if (error) throw error;
      return (data || []) as ItemDetailBasic[];
    },
    enabled: !!selectedCategoryId,
  });

  // Fetch all machine models for display purposes
  const { data: allModels = [] } = useQuery({
    queryKey: ["all-item-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_details")
        .select("id, name, sku, category_id, subcategory_id")
        .order("name");
      if (error) throw error;
      return (data || []) as ItemDetailBasic[];
    },
  });

  // Fetch setups for location display
  const { data: setups = [] } = useQuery({
    queryKey: ["setups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setups")
        .select("id, name, spot_id");
      if (error) throw error;
      return data;
    },
  });

  // Bulk create machines mutation
  const createMachines = useMutation({
    mutationFn: async () => {
      const units = parseInt(numberOfUnits) || 1;
      const slots = parseInt(numberOfSlots) || 1;
      const createdMachines: Machine[] = [];

      for (let i = 1; i <= units; i++) {
        // Generate serial number with padded number
        const paddedNumber = i.toString().padStart(2, '0');
        const generatedSerial = `${serialGeneration.trim()}-${paddedNumber}`;

        const machineData: Database["public"]["Tables"]["machines"]["Insert"] = {
          serial_number: generatedSerial,
          serial_generation: serialGeneration.trim(),
          model_id: selectedModelId || null,
          number_of_slots: slots,
          cash_key: cashKey.trim() || null,
          toy_key: toyKey.trim() || null,
          status: 'in_warehouse',
        };
        
        const { data: machine, error } = await supabase
          .from("machines")
          .insert(machineData)
          .select()
          .single();
        
        if (error) throw error;
        
        if (machine) {
          createdMachines.push(machine);
          
          // Create machine slots for this machine
          if (slots > 0) {
            const slotsToCreate = Array.from({ length: slots }, (_, j) => ({
              machine_id: machine.id,
              slot_number: j + 1,
            }));
            
            const { error: slotsError } = await supabase
              .from("machine_slots")
              .insert(slotsToCreate);
            
            if (slotsError) {
              console.error("Error creating machine slots:", slotsError);
            }
          }
        }
      }
      
      return createdMachines;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsCreateOpen(false);
      resetForm();
      toast({ 
        title: "Machines registered successfully",
        description: `Created ${data.length} machine(s) with serial numbers starting from ${serialGeneration}-01`
      });
    },
    onError: (error) => {
      toast({ title: "Error registering machines", description: error.message, variant: "destructive" });
    },
  });

  // Update machine status
  const updateMachineStatus = useMutation({
    mutationFn: async ({ machineId, status }: { machineId: string; status: MachineStatus }) => {
      const { error } = await supabase
        .from("machines")
        .update({ status })
        .eq("id", machineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast({ title: "Machine status updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating machine", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSerialGeneration("");
    setSelectedCategoryId(machinesCategory?.id || "");
    setSelectedModelId("");
    setNumberOfUnits("1");
    setNumberOfSlots("1");
    setCashKey("");
    setToyKey("");
  };

  // Handle dialog open - preselect "Machines" category
  const handleDialogOpen = (open: boolean) => {
    setIsCreateOpen(open);
    if (open && machinesCategory) {
      setSelectedCategoryId(machinesCategory.id);
    }
  };

  const filteredMachines = machines.filter(
    (machine) =>
      machine.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getModelName = (modelId: string | null) => {
    if (!modelId) return "N/A";
    return allModels.find((m) => m.id === modelId)?.name || "Unknown";
  };

  const getSetupName = (setupId: string | null) => {
    if (!setupId) return "Warehouse";
    return setups.find((s) => s.id === setupId)?.name || "Unknown Setup";
  };

  // Preview generated serial numbers
  const previewSerials = () => {
    const units = parseInt(numberOfUnits) || 0;
    if (!serialGeneration.trim() || units === 0) return [];
    return Array.from({ length: Math.min(units, 5) }, (_, i) => 
      `${serialGeneration.trim()}-${(i + 1).toString().padStart(2, '0')}`
    );
  };

  return (
    <AppLayout
      title="Machines"
      subtitle="Manage your vending machine fleet"
      actions={
        <Dialog open={isCreateOpen} onOpenChange={handleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Register Machines
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Register Machines</DialogTitle>
              <DialogDescription>
                Bulk register machines from a purchase order. Serial numbers will be auto-generated.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_generation">Serial Generation *</Label>
                  <Input
                    id="serial_generation"
                    placeholder="e.g., AA"
                    value={serialGeneration}
                    onChange={(e) => setSerialGeneration(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_units">Number of Units *</Label>
                  <Input
                    id="number_of_units"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={numberOfUnits}
                    onChange={(e) => setNumberOfUnits(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategoryId} onValueChange={(val) => {
                  setSelectedCategoryId(val);
                  setSelectedModelId(""); // Reset model when category changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select 
                  value={selectedModelId} 
                  onValueChange={setSelectedModelId}
                  disabled={!selectedCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCategoryId ? "Select a model" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="number_of_slots">Number of Slots (per machine)</Label>
                <Input
                  id="number_of_slots"
                  type="number"
                  min="1"
                  value={numberOfSlots}
                  onChange={(e) => setNumberOfSlots(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cash_key">Cash Key</Label>
                  <Input
                    id="cash_key"
                    placeholder="Optional"
                    value={cashKey}
                    onChange={(e) => setCashKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toy_key">Toy Key</Label>
                  <Input
                    id="toy_key"
                    placeholder="Optional"
                    value={toyKey}
                    onChange={(e) => setToyKey(e.target.value)}
                  />
                </div>
              </div>

              {/* Serial number preview */}
              {serialGeneration && parseInt(numberOfUnits) > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <Label className="text-xs text-muted-foreground">Serial Numbers Preview</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewSerials().map((serial) => (
                      <Badge key={serial} variant="secondary">{serial}</Badge>
                    ))}
                    {parseInt(numberOfUnits) > 5 && (
                      <Badge variant="outline">+{parseInt(numberOfUnits) - 5} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={() => createMachines.mutate()}
                disabled={!serialGeneration.trim() || !numberOfUnits || parseInt(numberOfUnits) < 1 || createMachines.isPending}
              >
                {createMachines.isPending ? "Registering..." : `Register ${numberOfUnits || 0} Machine(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Filters */}
      <Card className="p-4 mb-6 bg-card border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by serial number..." 
              className="pl-10 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Machines Table */}
      <Card className="bg-card border-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading machines...</div>
        ) : filteredMachines.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No machines match your search" : "No machines found. Register your first machines!"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Serial Number</TableHead>
                <TableHead className="text-muted-foreground">Model</TableHead>
                <TableHead className="text-muted-foreground">Setup/Location</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Slots</TableHead>
                <TableHead className="text-muted-foreground w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine) => (
                <TableRow key={machine.id} className="border-border hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{machine.serial_number}</TableCell>
                  <TableCell className="text-foreground">{getModelName(machine.model_id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{getSetupName(machine.setup_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[machine.status || 'in_warehouse'].variant}>
                      {statusConfig[machine.status || 'in_warehouse'].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{machine.number_of_slots || 1}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Machine</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateMachineStatus.mutate({ 
                            machineId: machine.id, 
                            status: 'maintenance' 
                          })}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Set to Maintenance
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => updateMachineStatus.mutate({ 
                            machineId: machine.id, 
                            status: 'retired' 
                          })}
                        >
                          Retire Machine
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
