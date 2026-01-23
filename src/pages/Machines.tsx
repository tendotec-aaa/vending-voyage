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
import type { Database } from "@/integrations/supabase/types";

type Machine = Database["public"]["Tables"]["machines"]["Row"];
type MachineStatus = Database["public"]["Enums"]["machine_status"];
type ItemDefinition = Database["public"]["Tables"]["item_definitions"]["Row"];

const statusConfig: Record<MachineStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  in_warehouse: { label: "In Warehouse", variant: "secondary" },
  deployed: { label: "Deployed", variant: "default" },
  maintenance: { label: "Maintenance", variant: "destructive" },
  retired: { label: "Retired", variant: "outline" },
};

export default function MachinesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSerialNumber, setNewSerialNumber] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newNumberOfSlots, setNewNumberOfSlots] = useState("1");
  const [newCashKey, setNewCashKey] = useState("");
  const [newToyKey, setNewToyKey] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch machine models (item_definitions with type 'machine_model')
  const { data: machineModels = [] } = useQuery({
    queryKey: ["machine-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_definitions")
        .select("*")
        .eq("type", "machine_model")
        .order("name");
      if (error) throw error;
      return data;
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

  // Create machine mutation
  const createMachine = useMutation({
    mutationFn: async () => {
      const machineData: Database["public"]["Tables"]["machines"]["Insert"] = {
        serial_number: newSerialNumber.trim(),
        model_id: newModelId || null,
        number_of_slots: parseInt(newNumberOfSlots) || 1,
        cash_key: newCashKey.trim() || null,
        toy_key: newToyKey.trim() || null,
        status: 'in_warehouse',
      };
      
      const { data, error } = await supabase
        .from("machines")
        .insert(machineData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Auto-create machine slots
      const slotsNum = parseInt(newNumberOfSlots) || 1;
      if (slotsNum > 0 && data) {
        const slotsToCreate = Array.from({ length: slotsNum }, (_, i) => ({
          machine_id: data.id,
          slot_number: i + 1,
        }));
        
        const { error: slotsError } = await supabase
          .from("machine_slots")
          .insert(slotsToCreate);
        
        if (slotsError) {
          console.error("Error creating machine slots:", slotsError);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: "Machine created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating machine", description: error.message, variant: "destructive" });
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
    setNewSerialNumber("");
    setNewModelId("");
    setNewNumberOfSlots("1");
    setNewCashKey("");
    setNewToyKey("");
  };

  const filteredMachines = machines.filter(
    (machine) =>
      machine.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getModelName = (modelId: string | null) => {
    if (!modelId) return "N/A";
    return machineModels.find((m) => m.id === modelId)?.name || "Unknown";
  };

  const getSetupName = (setupId: string | null) => {
    if (!setupId) return "Warehouse";
    return setups.find((s) => s.id === setupId)?.name || "Unknown Setup";
  };

  return (
    <AppLayout
      title="Machines"
      subtitle="Manage your vending machine fleet"
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Machine</DialogTitle>
              <DialogDescription>
                Register a new machine to your fleet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number *</Label>
                <Input
                  id="serial_number"
                  placeholder="e.g., VM-001"
                  value={newSerialNumber}
                  onChange={(e) => setNewSerialNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={newModelId} onValueChange={setNewModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_slots">Number of Slots</Label>
                <Input
                  id="number_of_slots"
                  type="number"
                  min="1"
                  value={newNumberOfSlots}
                  onChange={(e) => setNewNumberOfSlots(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cash_key">Cash Key</Label>
                  <Input
                    id="cash_key"
                    placeholder="Optional"
                    value={newCashKey}
                    onChange={(e) => setNewCashKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toy_key">Toy Key</Label>
                  <Input
                    id="toy_key"
                    placeholder="Optional"
                    value={newToyKey}
                    onChange={(e) => setNewToyKey(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={() => createMachine.mutate()}
                disabled={!newSerialNumber.trim() || createMachine.isPending}
              >
                Add Machine
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
            {searchQuery ? "No machines match your search" : "No machines found. Add your first machine!"}
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
