import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AssemblyComponent {
  item_detail_id: string;
  quantity_per_unit: number;
  unit_cost: number;
}

export interface CreateAssemblyData {
  // Output item
  item_detail_id?: string; // existing item
  item_name?: string; // new item
  category_id?: string;
  subcategory_id?: string;
  item_type_id?: string;
  // Assembly details
  output_quantity: number;
  labor_cost_per_unit: number;
  warehouse_id: string;
  notes?: string;
  components: AssemblyComponent[];
}

export function useAssemblies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAssemblyMutation = useMutation({
    mutationFn: async (data: CreateAssemblyData) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // 1. Create or link output item
      let outputItemDetailId = data.item_detail_id;
      if (!outputItemDetailId && data.item_name) {
        const sku = Date.now().toString(36).toUpperCase();
        const insertData: Record<string, any> = {
          name: data.item_name,
          sku,
          type: "merchandise" as const,
        };
        if (data.category_id) insertData.category_id = data.category_id;
        if (data.subcategory_id) insertData.subcategory_id = data.subcategory_id;
        if (data.item_type_id) insertData.item_type_id = data.item_type_id;

        const { data: newItem, error } = await supabase
          .from("item_details")
          .insert(insertData as any)
          .select()
          .single();
        if (error) throw error;
        outputItemDetailId = newItem.id;
      }

      if (!outputItemDetailId) throw new Error("Output item is required");

      // 2. Calculate costs
      const totalComponentCost = data.components.reduce(
        (sum, c) => sum + c.quantity_per_unit * data.output_quantity * c.unit_cost,
        0
      );
      const totalLaborCost = data.labor_cost_per_unit * data.output_quantity;
      const finalUnitCost =
        data.output_quantity > 0
          ? (totalComponentCost + totalLaborCost) / data.output_quantity
          : 0;

      // 3. Create assembly record
      const assemblyNumber = `ASM-${Date.now()}`;
      const { data: assembly, error: asmError } = await supabase
        .from("assemblies" as any)
        .insert({
          assembly_number: assemblyNumber,
          output_item_detail_id: outputItemDetailId,
          output_quantity: data.output_quantity,
          labor_cost_per_unit: data.labor_cost_per_unit,
          total_labor_cost: totalLaborCost,
          total_component_cost: totalComponentCost,
          final_unit_cost: Math.round(finalUnitCost * 1000) / 1000,
          status: "completed",
          notes: data.notes || null,
          warehouse_id: data.warehouse_id,
          created_by: userId || null,
        } as any)
        .select()
        .single();
      if (asmError) throw asmError;

      // 4. Insert assembly components
      const componentRows = data.components.map((c) => ({
        assembly_id: (assembly as any).id,
        item_detail_id: c.item_detail_id,
        quantity_per_unit: c.quantity_per_unit,
        total_quantity: c.quantity_per_unit * data.output_quantity,
        unit_cost: c.unit_cost,
        total_cost: c.quantity_per_unit * data.output_quantity * c.unit_cost,
      }));

      const { error: compError } = await supabase
        .from("assembly_components" as any)
        .insert(componentRows as any);
      if (compError) throw compError;

      // 5. Deplete component inventory from warehouse (FIFO)
      for (const comp of data.components) {
        const totalNeeded = comp.quantity_per_unit * data.output_quantity;

        // Reduce warehouse inventory
        const { data: invRow } = await supabase
          .from("inventory")
          .select("id, quantity_on_hand")
          .eq("item_detail_id", comp.item_detail_id)
          .eq("warehouse_id", data.warehouse_id)
          .single();

        if (invRow) {
          const newQty = Math.max(0, (invRow.quantity_on_hand || 0) - totalNeeded);
          await supabase
            .from("inventory")
            .update({ quantity_on_hand: newQty, last_updated: new Date().toISOString() })
            .eq("id", invRow.id);
        }

        // Deplete FIFO batches from purchase_items
        let remaining = totalNeeded;
        const { data: batches } = await supabase
          .from("purchase_items")
          .select("id, quantity_remaining")
          .eq("item_detail_id", comp.item_detail_id)
          .eq("active_item", true)
          .gt("quantity_remaining", 0)
          .order("arrival_order", { ascending: true });

        for (const batch of batches || []) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, batch.quantity_remaining || 0);
          const newRemaining = (batch.quantity_remaining || 0) - deduct;
          await supabase
            .from("purchase_items")
            .update({
              quantity_remaining: newRemaining,
              active_item: newRemaining > 0,
            } as any)
            .eq("id", batch.id);
          remaining -= deduct;
        }

        // Ledger entry for consumption
        const { data: balData } = await supabase
          .from("inventory")
          .select("quantity_on_hand")
          .eq("item_detail_id", comp.item_detail_id)
          .eq("warehouse_id", data.warehouse_id)
          .single();

        await supabase.from("inventory_ledger").insert({
          item_detail_id: comp.item_detail_id,
          warehouse_id: data.warehouse_id,
          quantity: -totalNeeded,
          running_balance: balData?.quantity_on_hand || 0,
          movement_type: "assembly_consumption",
          reference_id: (assembly as any).id,
          reference_type: "assembly",
          performed_by: userId || null,
          notes: `Consumed for assembly ${assemblyNumber}`,
        });
      }

      // 6. Add output item to warehouse inventory
      const { data: existingInv } = await supabase
        .from("inventory")
        .select("id, quantity_on_hand")
        .eq("item_detail_id", outputItemDetailId)
        .eq("warehouse_id", data.warehouse_id)
        .maybeSingle();

      if (existingInv) {
        const newQty = (existingInv.quantity_on_hand || 0) + data.output_quantity;
        await supabase
          .from("inventory")
          .update({ quantity_on_hand: newQty, last_updated: new Date().toISOString() })
          .eq("id", existingInv.id);
      } else {
        await supabase.from("inventory").insert({
          item_detail_id: outputItemDetailId,
          warehouse_id: data.warehouse_id,
          quantity_on_hand: data.output_quantity,
        });
      }

      // Ledger entry for production
      const { data: outputBal } = await supabase
        .from("inventory")
        .select("quantity_on_hand")
        .eq("item_detail_id", outputItemDetailId)
        .eq("warehouse_id", data.warehouse_id)
        .single();

      await supabase.from("inventory_ledger").insert({
        item_detail_id: outputItemDetailId,
        warehouse_id: data.warehouse_id,
        quantity: data.output_quantity,
        running_balance: outputBal?.quantity_on_hand || 0,
        movement_type: "assembly_production",
        reference_id: (assembly as any).id,
        reference_type: "assembly",
        performed_by: userId || null,
        notes: `Produced from assembly ${assemblyNumber}`,
      });

      // 7. Update item_details.cost_price
      await supabase
        .from("item_details")
        .update({ cost_price: Math.round(finalUnitCost * 1000) / 1000 } as any)
        .eq("id", outputItemDetailId);

      // 8. Create a purchase_items record for FIFO costing of assembled output
      // This ensures inventory cost, unit cost, and total received are tracked
      const { data: maxArrival } = await supabase
        .from("purchase_items")
        .select("arrival_order")
        .eq("item_detail_id", outputItemDetailId)
        .order("arrival_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextArrivalOrder = ((maxArrival as any)?.arrival_order || 0) + 1;

      await supabase.from("purchase_items").insert({
        item_detail_id: outputItemDetailId,
        purchase_id: null,
        quantity_ordered: data.output_quantity,
        quantity_received: data.output_quantity,
        quantity_remaining: data.output_quantity,
        unit_cost: Math.round(finalUnitCost * 1000) / 1000,
        final_unit_cost: Math.round(finalUnitCost * 1000) / 1000,
        landed_unit_cost: Math.round(finalUnitCost * 1000) / 1000,
        active_item: true,
        arrival_order: nextArrivalOrder,
      });

      return assembly;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["item-details"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast({ title: "Assembly completed", description: "Items have been assembled and inventory updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Assembly failed: ${error.message}`, variant: "destructive" });
    },
  });

  return {
    createAssembly: createAssemblyMutation.mutateAsync,
    isCreating: createAssemblyMutation.isPending,
  };
}
