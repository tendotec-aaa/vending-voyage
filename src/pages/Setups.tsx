import { useState } from "react";
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

export default function Setups() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");
  const [newSetupType, setNewSetupType] = useState<SetupType>("single");
  const [selectedSetup, setSelectedSetup] = useState<Setup | null>(null);
  const [isManageMachinesOpen, setIsManageMachinesOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch setups - using correct columns from database
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

  // Fetch all machines - using correct columns
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

  // Create setup mutation - uses correct database columns
  const createSetup = useMutation({
    mutationFn: async () => {
      const setupData: Database["public"]["Tables"]["setups"]["Insert"] = {
        name: newSetupName.trim(),
        type: newSetupType,
      };
      
      const { error } = await supabase.from("setups").insert(setupData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      setIsCreateOpen(false);
      setNewSetupName("");
      setNewSetupType("single");
      toast({ title: "Setup created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating setup", description: error.message, variant: "destructive" });
    },
  });

  // Delete setup mutation
  const deleteSetup = useMutation({
    mutationFn: async (setupId: string) => {
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

  // Add machine to setup - uses setup_id and position_on_setup
  const addMachineToSetup = useMutation({
    mutationFn: async ({ machineId, setupId }: { machineId: string; setupId: string }) => {
      // Get current max position for this setup
      const currentMachines = machines.filter(m => m.setup_id === setupId);
      const maxPosition = currentMachines.reduce((max, m) => Math.max(max, m.position_on_setup || 0), 0);
      
      const { error } = await supabase
        .from("machines")
        .update({ 
          setup_id: setupId,
          position_on_setup: maxPosition + 1,
          status: 'deployed' as const
        })
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

  // Remove machine from setup
  const removeMachineFromSetup = useMutation({
    mutationFn: async (machineId: string) => {
      const { error } = await supabase
        .from("machines")
        .update({ 
          setup_id: null,
          position_on_setup: null,
          status: 'in_warehouse' as const
        })
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

  const filteredSetups = setups.filter(
    (setup) =>
      setup.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMachinesForSetup = (setupId: string) =>
    machines.filter((m) => m.setup_id === setupId).sort((a, b) => (a.position_on_setup || 0) - (b.position_on_setup || 0));

  const getAvailableMachines = () =>
    machines.filter((m) => m.setup_id === null && m.status === 'in_warehouse');

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Setups</h1>
            <p className="text-muted-foreground">Group machines into setups for deployment to spots</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Setup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Setup</DialogTitle>
                <DialogDescription>
                  Create a setup to group multiple machines together for deployment.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Mall Plaza Setup"
                    value={newSetupName}
                    onChange={(e) => setNewSetupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Setup Type</Label>
                  <Select value={newSetupType} onValueChange={(v) => setNewSetupType(v as SetupType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(setupTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Indicates the number of machines typically in this setup
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createSetup.mutate()}
                  disabled={!newSetupName.trim() || createSetup.isPending}
                >
                  Create Setup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search setups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Setups Grid */}
        {setupsLoading ? (
          <div className="text-muted-foreground">Loading setups...</div>
        ) : filteredSetups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No setups found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create your first setup
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSetups.map((setup) => {
              const setupMachines = getMachinesForSetup(setup.id);
              return (
                <Card key={setup.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{setup.name || "Unnamed Setup"}</CardTitle>
                        <CardDescription className="mt-1">
                          Type: {setupTypeLabels[setup.type || "single"]}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{setupMachines.length} machines</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Machines in this setup */}
                    <div className="space-y-2">
                      {setupMachines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No machines assigned</p>
                      ) : (
                        setupMachines.slice(0, 3).map((machine) => (
                          <div
                            key={machine.id}
                            className="flex items-center justify-between rounded-md border p-2"
                          >
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{machine.serial_number}</span>
                              {machine.position_on_setup && (
                                <Badge variant="outline" className="text-xs">
                                  Pos {machine.position_on_setup}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeMachineFromSetup.mutate(machine.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      )}
                      {setupMachines.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{setupMachines.length - 3} more machines
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedSetup(setup);
                          setIsManageMachinesOpen(true);
                        }}
                      >
                        Manage Machines
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSetup.mutate(setup.id)}
                      >
                        Delete
                      </Button>
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
              <DialogDescription>
                Add or remove machines from this setup. Machines must be in warehouse to be added.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              {/* Current machines */}
              <div>
                <h4 className="text-sm font-medium mb-2">Current Machines</h4>
                {selectedSetup && getMachinesForSetup(selectedSetup.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No machines in this setup</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSetup &&
                      getMachinesForSetup(selectedSetup.id).map((machine) => (
                        <div
                          key={machine.id}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">{machine.serial_number}</span>
                              {machine.position_on_setup && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Position {machine.position_on_setup})
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMachineFromSetup.mutate(machine.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Available machines */}
              <div>
                <h4 className="text-sm font-medium mb-2">Available Machines (In Warehouse)</h4>
                {getAvailableMachines().length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No machines available in warehouse
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getAvailableMachines().map((machine) => (
                      <div
                        key={machine.id}
                        className="flex items-center justify-between rounded-md border p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium">{machine.serial_number}</span>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            selectedSetup &&
                            addMachineToSetup.mutate({
                              machineId: machine.id,
                              setupId: selectedSetup.id,
                            })
                          }
                        >
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
