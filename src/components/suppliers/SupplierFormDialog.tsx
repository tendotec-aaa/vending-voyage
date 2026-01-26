import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Supplier, CreateSupplierData } from "@/hooks/useSuppliers";
import { useEffect } from "react";

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(100),
  contact_phone: z.string().max(50).optional().or(z.literal("")),
  contact_email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  lead_time_days: z.coerce.number().min(0).optional().or(z.literal("")),
  tax_id: z.string().max(50).optional().or(z.literal("")),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSupplierData) => void;
  supplier?: Supplier | null;
  isLoading?: boolean;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  onSubmit,
  supplier,
  isLoading,
}: SupplierFormDialogProps) {
  const isEditing = !!supplier;

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contact_phone: "",
      contact_email: "",
      country: "",
      lead_time_days: "",
      tax_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          name: supplier.name,
          contact_phone: supplier.contact_phone || "",
          contact_email: supplier.contact_email || "",
          country: supplier.country || "",
          lead_time_days: supplier.lead_time_days || "",
          tax_id: supplier.tax_id || "",
        });
      } else {
        form.reset({
          name: "",
          contact_phone: "",
          contact_email: "",
          country: "",
          lead_time_days: "",
          tax_id: "",
        });
      }
    }
  }, [open, supplier, form]);

  const handleSubmit = (values: SupplierFormValues) => {
    const data: CreateSupplierData = {
      name: values.name,
      contact_phone: values.contact_phone || null,
      contact_email: values.contact_email || null,
      country: values.country || null,
      lead_time_days: values.lead_time_days ? Number(values.lead_time_days) : null,
      tax_id: values.tax_id || null,
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the supplier's information below."
              : "Enter the supplier's information below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 8900" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@supplier.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lead_time_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Tax identification number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEditing ? "Update Supplier" : "Add Supplier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
