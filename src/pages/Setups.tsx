import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Layers, Truck, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Setup = Database["public"]["Tables"]["setups"]["Row"];
type Machine = Database["public"]["Tables"]["machines"]["Row"];
type SetupType = Database["public"]["Enums"]["setup_type"];

const setupTypeLabels: Record<SetupType, string> = {
  single: "Single",
  double: "Double", 
  triple: "Triple",
  quad: "Quad",
  custom: "Custom",
};

const setupTypeMachineCount: Record<SetupType, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
  custom: 0,
};

function getPositionLabel(type: SetupType, position: number, total: number): string {
  if (total === 1) return "";
  if (type === "triple") return ["Left", "Center", "Right"][position - 1] || `Position ${position}`;
  return `Position ${position}`;
}

export default function Setups() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");
  const [newSetupType, setNewSetupType] = useState<SetupType>("single");
  const [customMachineCount, setCustomMachineCount] = useState("2");
  const [selectedMachines, setSelectedMachines] = useState<Record<number, string>>({});
  const [selectedSetup, setSelectedSetup] = useState<Setup | null>(null);
  const [isManageMachinesOpen, setIsManageMachinesOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const machineCount = newSetupType === "custom"
    ? parseInt(customMachineCount) || 0
    : setupTypeMachineCount[newSetupType];

  const { data: setups = [], isLoading: setupsLoading } = useQuery({
    queryKey: ["setups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: machines = [] } = useQuery({
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

  const availableMachines = useMemo(() => {
    const selectedIds = new Set(Object.values(selectedMachines));
    return machines.filter(
      (m) => (m.setup_id === null && m.status === "in_warehouse") || selectedIds.has(m.id)
    );
  }, [machines, selectedMachines]);

  const createSetup = useMutation({
    mutationFn: async () => {
      // 1. Create the setup
      const { data: setup, error } = await supabase
        .from("setups")
        .insert({ name: newSetupName.trim(), type: newSetupType })
        .select()
        .single();
      if (error) throw error;

      // 2. Assign machines with positions
      const machineAssignments = Object.entries(selectedMachines)
        .filter(([_, machineId]) => machineId)
        .map(([posStr, machineId]) => ({
          machineId,
          position: parseInt(posStr),
        }));

      for (const { machineId, position } of machineAssignments) {
        const { error: assignError } = await supabase
          .from("machines")
          .update({
            setup_id: setup.id,
            position_on_setup: position,
            status: "deployed" as const,
          })
          .eq("id", machineId);
        if (assignError) console.error("Error assigning machine:", assignError);
      }

      return setup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsCreateOpen(false);
      resetCreateForm();
      toast({ title: "Setup created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating setup", description: error.message, variant: "destructive" });
    },
  });

  const deleteSetup = useMutation({
    mutationFn: async (setupId: string) => {
      // Unassign machines first
      await supabase
        .from("machines")
        .update({ setup_id: null, position_on_setup: null, status: "in_warehouse" as const })
        .eq("setup_id", setupId);
      const { error } = await supabase.from("setups").delete().eq("id", setupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast({ title: "Setup deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting setup", description: error.message, variant: "destructive" });
    },
  });

  const addMachineToSetup = useMutation({
    mutationFn: async ({ machineId, setupId }: { machineId: string; setupId: string }) => {
      const currentMachines = machines.filter((m) => m.setup_id === setupId);
      const maxPosition = currentMachines.reduce((max, m) => Math.max(max, m.position_on_setup || 0), 0);
      const { error } = await supabase
        .from("machines")
        .update({ setup_id: setupId, position_on_setup: maxPosition + 1, status: "deployed" as const })
        .eq("id", machineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast({ title: "Machine added to setup" });
    },
    onError: (error) => {
      toast({ title: "Error adding machine", description: error.message, variant: "destructive" });
    },
  });

  const removeMachineFromSetup = useMutation({
    mutationFn: async (machineId: string) => {
      const { error } = await supabase
        .from("machines")
        .update({ setup_id: null, position_on_setup: null, status: "in_warehouse" as const })
        .eq("id", machineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast({ title: "Machine removed from setup" });
    },
    onError: (error) => {
      toast({ title: "Error removing machine", description: error.message, variant: "destructive" });
    },
  });

  const resetCreateForm = () => {
    setNewSetupName("");
    setNewSetupType("single");
    setCustomMachineCount("2");
    setSelectedMachines({});
  };

  const handleSetupTypeChange = (type: SetupType) => {
    setNewSetupType(type);
    setSelectedMachines({});
  };

  const handleMachineSelect = (position: number, machineId: string) => {
    setSelectedMachines((prev) => {
      const next = { ...prev };
      if (machineId === "none") {
        delete next[position];
      } else {
        next[position] = machineId;
      }
      return next;
    });
  };

  const filteredSetups = setups.filter((setup) =>
    setup.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMachinesForSetup = (setupId: string) =>
    machines
      .filter((m) => m.setup_id === setupId)
      .sort((a, b) => (a.position_on_setup || 0) - (b.position_on_setup || 0));

  const getAvailableMachinesForManage = () =>
    machines.filter((m) => m.setup_id === null && m.status === "in_warehouse");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Setups</h1>
            <p className="text-muted-foreground">Group machines into setups for deployment to spots</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetCreateForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Setup</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Setup</DialogTitle>
                <DialogDescription>Create a setup and assign machines with positions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="e.g., Mall Plaza Setup" value={newSetupName} onChange={(e) => setNewSetupName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Setup Type</Label>
                  <Select value={newSetupType} onValueChange={(v) => handleSetupTypeChange(v as SetupType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(setupTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newSetupType === "custom" && (
                  <div className="space-y-2">
                    <Label>Number of Machines</Label>
                    <Input type="number" min="1" max="10" value={customMachineCount} onChange={(e) => { setCustomMachineCount(e.target.value); setSelectedMachines({}); }} />
                  </div>
                )}

                {machineCount > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Assign Machines</Label>
                    {Array.from({ length: machineCount }, (_, i) => {
                      const position = i + 1;
                      const label = getPositionLabel(newSetupType, position, machineCount);
                      const selectedId = selectedMachines[position] || "";
                      // Available = in_warehouse + not selected by another position
                      const otherSelected = new Set(
                        Object.entries(selectedMachines)
                          .filter(([p]) => parseInt(p) !== position)
                          .map(([_, id]) => id)
                      );
                      const options = machines.filter(
                        (m) =>
                          (m.setup_id === null && m.status === "in_warehouse") || m.id === selectedId
                      ).filter((m) => !otherSelected.has(m.id));

                      return (
                        <div key={position} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {label || `Machine ${position}`}
                          </Label>
                          <Select value={selectedId || "none"} onValueChange={(v) => handleMachineSelect(position, v)}>
                            <SelectTrigger><SelectValue placeholder="Select a machine" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— None —</SelectItem>
                              {options.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.serial_number}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                    {machines.filter((m) => m.setup_id === null && m.status === "in_warehouse").length === 0 && (
                      <p className="text-sm text-muted-foreground">No machines available in warehouse. Register machines first.</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}>Cancel</Button>
                <Button onClick={() => createSetup.mutate()} disabled={!newSetupName.trim() || createSetup.isPending}>
                  Create Setup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search setups..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {setupsLoading ? (
          <div className="text-muted-foreground">Loading setups...</div>
        ) : filteredSetups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No setups found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>Create your first setup</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSetups.map((setup) => {
              const setupMachines = getMachinesForSetup(setup.id);
              const setupType = setup.type || "single";
              return (
                <Card key={setup.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{setup.name || "Unnamed Setup"}</CardTitle>
                        <CardDescription className="mt-1">Type: {setupTypeLabels[setupType]}</CardDescription>
                      </div>
                      <Badge variant="secondary">{setupMachines.length} machines</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {setupMachines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No machines assigned</p>
                      ) : (
                        setupMachines.map((machine) => {
                          const posLabel = getPositionLabel(setupType, machine.position_on_setup || 0, setupMachines.length);
                          return (
                            <div key={machine.id} className="flex items-center justify-between rounded-md border p-2">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{machine.serial_number}</span>
                                {posLabel && <Badge variant="outline" className="text-xs">{posLabel}</Badge>}
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMachineFromSetup.mutate(machine.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedSetup(setup); setIsManageMachinesOpen(true); }}>
                        Manage Machines
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteSetup.mutate(setup.id)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Manage Machines Dialog */}
        <Dialog open={isManageMachinesOpen} onOpenChange={setIsManageMachinesOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Machines - {selectedSetup?.name}</DialogTitle>
              <DialogDescription>Add or remove machines from this setup.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              <div>
                <h4 className="text-sm font-medium mb-2">Current Machines</h4>
                {selectedSetup && getMachinesForSetup(selectedSetup.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No machines in this setup</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSetup && getMachinesForSetup(selectedSetup.id).map((machine) => {
                      const setupType = selectedSetup.type || "single";
                      const total = getMachinesForSetup(selectedSetup.id).length;
                      const posLabel = getPositionLabel(setupType, machine.position_on_setup || 0, total);
                      return (
                        <div key={machine.id} className="flex items-center justify-between rounded-md border p-2">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{machine.serial_number}</span>
                            {posLabel && <span className="text-xs text-muted-foreground">({posLabel})</span>}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => removeMachineFromSetup.mutate(machine.id)}>Remove</Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Available Machines (In Warehouse)</h4>
                {getAvailableMachinesForManage().length === 0 ? (
                  <p className="text-sm text-muted-foreground">No machines available in warehouse</p>
                ) : (
                  <div className="space-y-2">
                    {getAvailableMachinesForManage().map((machine) => (
                      <div key={machine.id} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{machine.serial_number}</span>
                        </div>
                        <Button variant="default" size="sm" onClick={() => selectedSetup && addMachineToSetup.mutate({ machineId: machine.id, setupId: selectedSetup.id })}>
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsManageMachinesOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
