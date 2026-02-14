import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MoreVertical, Wrench } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Machine = Database["public"]["Tables"]["machines"]["Row"];
type MachineStatus = Database["public"]["Enums"]["machine_status"];

interface ItemDetailBasic {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  subcategory_id: string | null;
}

export default function MachinesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignment, setFilterAssignment] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
  const machinesCategory = categories.find(c => c.name.toLowerCase() === "machines");

  useEffect(() => {
    if (machinesCategory && !selectedCategoryId) setSelectedCategoryId(machinesCategory.id);
  }, [machinesCategory, selectedCategoryId]);

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("*").order("serial_number");
      if (error) throw error;
      return data;
    },
  });

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

  const { data: allModels = [] } = useQuery({
    queryKey: ["all-item-details"],
    queryFn: async () => {
      const { data, error } = await supabase.from("item_details").select("id, name, sku, category_id, subcategory_id").order("name");
      if (error) throw error;
      return (data || []) as ItemDetailBasic[];
    },
  });

  const { data: setups = [] } = useQuery({
    queryKey: ["setups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setups").select("id, name, spot_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: spots = [] } = useQuery({
    queryKey: ["spots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("spots").select("id, name, location_id");
      if (error) throw error;
      return data;
    },
  });

  const createMachines = useMutation({
    mutationFn: async () => {
      const units = parseInt(numberOfUnits) || 1;
      const slots = parseInt(numberOfSlots) || 1;
      const createdMachines: Machine[] = [];
      for (let i = 1; i <= units; i++) {
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
        const { data: machine, error } = await supabase.from("machines").insert(machineData).select().single();
        if (error) throw error;
        if (machine) {
          createdMachines.push(machine);
          if (slots > 0) {
            const slotsToCreate = Array.from({ length: slots }, (_, j) => ({
              machine_id: machine.id, slot_number: j + 1,
            }));
            const { error: slotsError } = await supabase.from("machine_slots").insert(slotsToCreate);
            if (slotsError) console.error("Error creating machine slots:", slotsError);
          }
        }
      }
      return createdMachines;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: "Machines registered successfully", description: `Created ${data.length} machine(s)` });
    },
    onError: (error) => {
      toast({ title: "Error registering machines", description: error.message, variant: "destructive" });
    },
  });

  const updateMachineStatus = useMutation({
    mutationFn: async ({ machineId, status }: { machineId: string; status: MachineStatus }) => {
      const { error } = await supabase.from("machines").update({ status }).eq("id", machineId);
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

  const handleDialogOpen = (open: boolean) => {
    setIsCreateOpen(open);
    if (open && machinesCategory) setSelectedCategoryId(machinesCategory.id);
  };

  const getModelName = (modelId: string | null) => {
    if (!modelId) return "N/A";
    return allModels.find((m) => m.id === modelId)?.name || "Unknown";
  };

  const previewSerials = () => {
    const units = parseInt(numberOfUnits) || 0;
    if (!serialGeneration.trim() || units === 0) return [];
    return Array.from({ length: Math.min(units, 5) }, (_, i) =>
      `${serialGeneration.trim()}-${(i + 1).toString().padStart(2, '0')}`
    );
  };

  // Sorting priority & badge logic
  const sortedMachines = useMemo(() => {
    const filtered = machines.filter((m) => {
      const matchesSearch = m.serial_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || m.status === filterStatus;
      let matchesAssignment = filterAssignment === "all";
      if (filterAssignment === "assigned") matchesAssignment = !!m.setup_id;
      if (filterAssignment === "unassigned") matchesAssignment = !m.setup_id && m.status !== "retired";
      if (filterAssignment === "retired") matchesAssignment = m.status === "retired";
      return matchesSearch && matchesStatus && matchesAssignment;
    });

    const getPriority = (m: Machine) => {
      if (m.status === "retired") return 4;
      const setup = setups.find((s) => s.id === m.setup_id);
      if (!m.setup_id) return 1;
      if (setup && !setup.spot_id) return 2;
      return 3;
    };

    return [...filtered].sort((a, b) => getPriority(a) - getPriority(b));
  }, [machines, searchQuery, filterStatus, filterAssignment, setups]);

  const getAssignmentBadge = (machine: Machine) => {
    if (machine.status === "retired") return { label: "Retired", variant: "outline" as const, link: null };
    if (machine.setup_id) return { label: "Assigned", variant: "default" as const, link: "/setups" };
    return { label: "Unassigned", variant: "secondary" as const, link: null };
  };

  const getLocationBadge = (machine: Machine) => {
    if (machine.status === "retired") return { label: "Discarded", variant: "outline" as const, link: null };
    const setup = setups.find((s) => s.id === machine.setup_id);
    if (setup?.spot_id) {
      const spot = spots.find((s) => s.id === setup.spot_id);
      return { label: "Deployed", variant: "default" as const, link: spot ? `/spots/${spot.id}` : null };
    }
    return { label: "In Warehouse", variant: "secondary" as const, link: "/warehouse" };
  };

  return (
    <AppLayout
      title="Machines"
      subtitle="Manage your vending machine fleet"
      actions={
        <Dialog open={isCreateOpen} onOpenChange={handleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Register Machines</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Register Machines</DialogTitle>
              <DialogDescription>Bulk register machines. Serial numbers will be auto-generated.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_generation">Serial Generation *</Label>
                  <Input id="serial_generation" placeholder="e.g., AA" value={serialGeneration} onChange={(e) => setSerialGeneration(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_units">Number of Units *</Label>
                  <Input id="number_of_units" type="number" min="1" placeholder="10" value={numberOfUnits} onChange={(e) => setNumberOfUnits(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategoryId} onValueChange={(val) => { setSelectedCategoryId(val); setSelectedModelId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Item Name</Label>
                <Select value={selectedModelId} onValueChange={setSelectedModelId} disabled={!selectedCategoryId}>
                  <SelectTrigger><SelectValue placeholder={selectedCategoryId ? "Select an item" : "Select category first"} /></SelectTrigger>
                  <SelectContent>
                    {models.length === 0 && selectedCategoryId ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No items found in this category. Create items first via a Purchase Order.</div>
                    ) : (
                      models.map((model) => (<SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_slots">Number of Slots (per machine)</Label>
                <Input id="number_of_slots" type="number" min="1" value={numberOfSlots} onChange={(e) => setNumberOfSlots(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cash_key">Cash Key</Label>
                  <Input id="cash_key" placeholder="Optional" value={cashKey} onChange={(e) => setCashKey(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toy_key">Toy Key</Label>
                  <Input id="toy_key" placeholder="Optional" value={toyKey} onChange={(e) => setToyKey(e.target.value)} />
                </div>
              </div>
              {serialGeneration && parseInt(numberOfUnits) > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <Label className="text-xs text-muted-foreground">Serial Numbers Preview</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewSerials().map((serial) => (<Badge key={serial} variant="secondary">{serial}</Badge>))}
                    {parseInt(numberOfUnits) > 5 && (<Badge variant="outline">+{parseInt(numberOfUnits) - 5} more</Badge>)}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={() => createMachines.mutate()} disabled={!serialGeneration.trim() || !numberOfUnits || parseInt(numberOfUnits) < 1 || createMachines.isPending}>
                {createMachines.isPending ? "Registering..." : `Register ${numberOfUnits || 0} Machine(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Card className="p-4 mb-6 bg-card border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by serial number..." className="pl-10 bg-background" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={filterAssignment} onValueChange={setFilterAssignment}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Assignment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignment</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_warehouse">In Warehouse</SelectItem>
              <SelectItem value="deployed">Deployed</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="bg-card border-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading machines...</div>
        ) : sortedMachines.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No machines match your search" : "No machines found. Register your first machines!"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Serial Number</TableHead>
                <TableHead className="text-muted-foreground">Item Name</TableHead>
                <TableHead className="text-muted-foreground">Slots</TableHead>
                <TableHead className="text-muted-foreground">Assignment</TableHead>
                <TableHead className="text-muted-foreground">Location</TableHead>
                <TableHead className="text-muted-foreground">Start Work</TableHead>
                <TableHead className="text-muted-foreground w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMachines.map((machine) => {
                const assignBadge = getAssignmentBadge(machine);
                const locBadge = getLocationBadge(machine);
                return (
                  <TableRow
                    key={machine.id}
                    className="border-border hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/machines/${machine.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">{machine.serial_number}</TableCell>
                    <TableCell className="text-foreground">{getModelName(machine.model_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{machine.number_of_slots || 1}</TableCell>
                    <TableCell>
                      <Badge
                        variant={assignBadge.variant}
                        className={assignBadge.link ? "cursor-pointer" : ""}
                        onClick={(e) => {
                          if (assignBadge.link) { e.stopPropagation(); navigate(assignBadge.link); }
                        }}
                      >
                        {assignBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={locBadge.variant}
                        className={locBadge.link ? "cursor-pointer" : ""}
                        onClick={(e) => {
                          if (locBadge.link) { e.stopPropagation(); navigate(locBadge.link); }
                        }}
                      >
                        {locBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {machine.created_at ? format(new Date(machine.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/machines/${machine.id}`); }}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateMachineStatus.mutate({ machineId: machine.id, status: 'maintenance' }); }}>
                            <Wrench className="w-4 h-4 mr-2" /> Set to Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); updateMachineStatus.mutate({ machineId: machine.id, status: 'retired' }); }}>
                            Retire Machine
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
}
