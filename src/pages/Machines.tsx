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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
    if (machine.status === "retired") return { label: t('machines.retired'), variant: "outline" as const, link: null };
    if (machine.setup_id) return { label: t('machines.assigned'), variant: "default" as const, link: "/setups" };
    return { label: t('machines.unassigned'), variant: "secondary" as const, link: null };
  };

  const getLocationBadge = (machine: Machine) => {
    if (machine.status === "retired") return { label: t('machines.discarded'), variant: "outline" as const, link: null };
    const setup = setups.find((s) => s.id === machine.setup_id);
    if (setup?.spot_id) {
      const spot = spots.find((s) => s.id === setup.spot_id);
      return { label: t('machines.deployed'), variant: "default" as const, link: spot ? `/spots/${spot.id}` : null };
    }
    return { label: t('machines.inWarehouse'), variant: "secondary" as const, link: "/warehouse" };
  };

  return (
    <AppLayout
      title={t('machines.title')}
      subtitle={t('machines.subtitle')}
      actions={
        <Dialog open={isCreateOpen} onOpenChange={handleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> {t('machines.registerMachines')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('machines.registerTitle')}</DialogTitle>
              <DialogDescription>{t('machines.registerDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_generation">{t('machines.serialGeneration')}</Label>
                  <Input id="serial_generation" placeholder="e.g., AA" value={serialGeneration} onChange={(e) => setSerialGeneration(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_units">{t('machines.numberOfUnits')}</Label>
                  <Input id="number_of_units" type="number" min="1" placeholder="10" value={numberOfUnits} onChange={(e) => setNumberOfUnits(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t('machines.category')}</Label>
                <Select value={selectedCategoryId} onValueChange={(val) => { setSelectedCategoryId(val); setSelectedModelId(""); }}>
                  <SelectTrigger><SelectValue placeholder={t('machines.selectCategory')} /></SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">{t('machines.itemName')}</Label>
                <Select value={selectedModelId} onValueChange={setSelectedModelId} disabled={!selectedCategoryId}>
                  <SelectTrigger><SelectValue placeholder={selectedCategoryId ? t('machines.selectItem') : t('machines.selectCategoryFirst')} /></SelectTrigger>
                  <SelectContent>
                    {models.length === 0 && selectedCategoryId ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">{t('machines.noItemsInCategory')}</div>
                    ) : (
                      models.map((model) => (<SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_slots">{t('machines.numberOfSlots')}</Label>
                <Input id="number_of_slots" type="number" min="1" value={numberOfSlots} onChange={(e) => setNumberOfSlots(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cash_key">{t('machines.cashKey')}</Label>
                  <Input id="cash_key" placeholder={t('common.optional')} value={cashKey} onChange={(e) => setCashKey(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toy_key">{t('machines.toyKey')}</Label>
                  <Input id="toy_key" placeholder={t('common.optional')} value={toyKey} onChange={(e) => setToyKey(e.target.value)} />
                </div>
              </div>
              {serialGeneration && parseInt(numberOfUnits) > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <Label className="text-xs text-muted-foreground">{t('machines.serialPreview')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewSerials().map((serial) => (<Badge key={serial} variant="secondary">{serial}</Badge>))}
                    {parseInt(numberOfUnits) > 5 && (<Badge variant="outline">+{parseInt(numberOfUnits) - 5} more</Badge>)}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>{t('common.cancel')}</Button>
              <Button onClick={() => createMachines.mutate()} disabled={!serialGeneration.trim() || !numberOfUnits || parseInt(numberOfUnits) < 1 || createMachines.isPending}>
                {createMachines.isPending ? t('common.creating') : t('machines.registerCount', { count: parseInt(numberOfUnits) || 0 })}
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
            <Input placeholder={t('machines.searchBySerial')} className="pl-10 bg-background" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={filterAssignment} onValueChange={setFilterAssignment}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder={t('machines.allAssignment')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('machines.allAssignment')}</SelectItem>
              <SelectItem value="assigned">{t('machines.assigned')}</SelectItem>
              <SelectItem value="unassigned">{t('machines.unassigned')}</SelectItem>
              <SelectItem value="retired">{t('machines.retired')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder={t('machines.allStatus')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('machines.allStatus')}</SelectItem>
              <SelectItem value="in_warehouse">{t('machines.inWarehouse')}</SelectItem>
              <SelectItem value="deployed">{t('machines.deployed')}</SelectItem>
              <SelectItem value="maintenance">{t('machines.maintenanceStatus')}</SelectItem>
              <SelectItem value="retired">{t('machines.retired')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="bg-card border-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">{t('machines.loadingMachines')}</div>
        ) : sortedMachines.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? t('machines.noMatch') : t('machines.noMachines')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">{t('machines.serialNumber')}</TableHead>
                <TableHead className="text-muted-foreground">{t('machines.itemName')}</TableHead>
                <TableHead className="text-muted-foreground">{t('machines.slots')}</TableHead>
                <TableHead className="text-muted-foreground">{t('machines.assignment')}</TableHead>
                <TableHead className="text-muted-foreground">{t('machines.locationCol')}</TableHead>
                <TableHead className="text-muted-foreground">{t('machines.startWork')}</TableHead>
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/machines/${machine.id}`); }}>{t('machines.viewDetails')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateMachineStatus.mutate({ machineId: machine.id, status: 'maintenance' }); }}>
                            <Wrench className="w-4 h-4 mr-2" /> {t('machines.setMaintenance')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); updateMachineStatus.mutate({ machineId: machine.id, status: 'retired' }); }}>
                            {t('machines.retireMachine')}
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
