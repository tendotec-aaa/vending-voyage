import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    country: "",
    lead_time_days: 0,
    tax_id: "",
  });

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        contact_email: supplier.contact_email || "",
        contact_phone: supplier.contact_phone || "",
        country: supplier.country || "",
        lead_time_days: supplier.lead_time_days || 0,
        tax_id: supplier.tax_id || "",
      });
    }
  }, [supplier]);

  const updateSupplier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: form.name.trim(),
          contact_email: form.contact_email.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          country: form.country.trim() || null,
          lead_time_days: form.lead_time_days,
          tax_id: form.tax_id.trim() || null,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier", id] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsEditing(false);
      toast({ title: "Supplier updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating supplier", description: error.message, variant: "destructive" });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier deleted" });
      navigate("/suppliers");
    },
    onError: (error) => {
      toast({ title: "Error deleting supplier", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-muted-foreground">Loading supplier...</div>
      </AppLayout>
    );
  }

  if (!supplier) {
    return (
      <AppLayout>
        <div className="text-muted-foreground">Supplier not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
              <p className="text-muted-foreground">Supplier Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => { setIsEditing(false); setForm({ name: supplier.name || "", contact_email: supplier.contact_email || "", contact_phone: supplier.contact_phone || "", country: supplier.country || "", lead_time_days: supplier.lead_time_days || 0, tax_id: supplier.tax_id || "" }); }}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button onClick={() => updateSupplier.mutate()} disabled={!form.name.trim() || updateSupplier.isPending}>
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteSupplier.mutate()}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                {isEditing ? (
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                ) : (
                  <p className="text-foreground">{supplier.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                {isEditing ? (
                  <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                ) : (
                  <p className="text-foreground">{supplier.contact_email || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                {isEditing ? (
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                ) : (
                  <p className="text-foreground">{supplier.contact_phone || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                {isEditing ? (
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                ) : (
                  <p className="text-foreground">{supplier.country || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                {isEditing ? (
                  <Input type="number" min={0} value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })} />
                ) : (
                  <p className="text-foreground">{supplier.lead_time_days || 0} days</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tax ID</Label>
                {isEditing ? (
                  <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
                ) : (
                  <p className="text-foreground">{supplier.tax_id || "—"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
