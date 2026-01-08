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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Layers, Truck, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Setup = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type Machine = {
  id: string;
  serial_number: string;
  model: string | null;
  status: string | null;
  setup_id: string | null;
};

export default function Setups() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");
  const [newSetupDescription, setNewSetupDescription] = useState("");
  const [selectedSetup, setSelectedSetup] = useState<Setup | null>(null);
  const [isManageMachinesOpen, setIsManageMachinesOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch setups
  const { data: setups = [], isLoading: setupsLoading } = useQuery({
    queryKey: ["setups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Setup[];
    },
  });

  // Fetch all machines
  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("serial_number");
      if (error) throw error;
      return data as Machine[];
    },
  });

  // Create setup mutation
  const createSetup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("setups").insert({
        name: newSetupName.trim(),
        description: newSetupDescription.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setups"] });
      setIsCreateOpen(false);
      setNewSetupName("");
      setNewSetupDescription("");
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

  // Add machine to setup
  const addMachineToSetup = useMutation({
    mutationFn: async ({ machineId, setupId }: { machineId: string; setupId: string }) => {
      const { error } = await supabase
        .from("machines")
        .update({ setup_id: setupId })
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
        .update({ setup_id: null })
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
      setup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setup.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMachinesForSetup = (setupId: string) =>
    machines.filter((m) => m.setup_id === setupId);

  const getAvailableMachines = () =>
    machines.filter((m) => m.setup_id === null);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Setups</h1>
            <p className="text-muted-foreground">Group machines into setups for easier management</p>
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
                  Create a setup to group multiple machines together.
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
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this setup..."
                    value={newSetupDescription}
                    onChange={(e) => setNewSetupDescription(e.target.value)}
                  />
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
                        <CardTitle className="text-lg">{setup.name}</CardTitle>
                        {setup.description && (
                          <CardDescription className="mt-1">{setup.description}</CardDescription>
                        )}
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
                Add or remove machines from this setup. Each machine can only belong to one setup.
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
                              {machine.model && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({machine.model})
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
                <h4 className="text-sm font-medium mb-2">Available Machines</h4>
                {getAvailableMachines().length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All machines are assigned to setups
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
                            {machine.model && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({machine.model})
                              </span>
                            )}
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
