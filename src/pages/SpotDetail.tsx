import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Textarea } from "@/components/ui/textarea";

export default function SpotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "active" as "active" | "inactive" });

  const { data: spot, isLoading } = useQuery({
    queryKey: ["spot", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spots")
        .select("*, locations(id, name, rent_amount, total_spots)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: siblingCount = 1 } = useQuery({
    queryKey: ["sibling-count", spot?.location_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("spots")
        .select("id", { count: "exact", head: true })
        .eq("location_id", spot!.location_id!);
      if (error) throw error;
      return count || 1;
    },
    enabled: !!spot?.location_id,
  });

  const { data: setups = [] } = useQuery({
    queryKey: ["spot-setups", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("setups").select("id, name, type").eq("spot_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: recentVisits = [] } = useQuery({
    queryKey: ["spot-recent-visits", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spot_visits")
        .select("id, visit_date, total_cash_collected, status")
        .eq("spot_id", id!)
        .order("visit_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (spot) setForm({ name: spot.name, description: spot.description || "", status: spot.status || "active" });
  }, [spot]);

  const updateSpot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("spots").update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spot", id] });
      queryClient.invalidateQueries({ queryKey: ["spots"] });
      setIsEditing(false);
      toast({ title: "Spot updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <AppLayout><div className="text-muted-foreground">Loading...</div></AppLayout>;
  if (!spot) return <AppLayout><div className="text-muted-foreground">Spot not found</div></AppLayout>;

  const location = spot.locations as any;
  const rentPerSpot = location?.rent_amount && siblingCount > 0 ? (location.rent_amount / siblingCount) : 0;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{spot.name}</h1>
              <p className="text-muted-foreground cursor-pointer hover:underline" onClick={() => location && navigate(`/locations/${location.id}`)}>
                {location?.name || "Unassigned"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                  <Button onClick={() => updateSpot.mutate()} disabled={!form.name.trim() || updateSpot.isPending}>
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
              )}
            </div>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Spot Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                {isEditing ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /> : <p className="text-foreground">{spot.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                {isEditing ? (
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <Badge variant={spot.status === "active" ? "default" : "secondary"}>{spot.status}</Badge>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                {isEditing ? <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /> : <p className="text-foreground">{spot.description || "—"}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rent Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Location Total Rent</p>
                <p className="text-lg font-semibold text-foreground">${location?.rent_amount || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Spots at Location</p>
                <p className="text-lg font-semibold text-foreground">{siblingCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rent per Spot</p>
                <p className="text-lg font-semibold text-foreground">${rentPerSpot.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Setups ({setups.length})</CardTitle></CardHeader>
          <CardContent>
            {setups.length === 0 ? (
              <p className="text-muted-foreground">No setups assigned.</p>
            ) : (
              <div className="space-y-2">
                {setups.map((setup) => (
                  <div key={setup.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium text-foreground">{setup.name || "Unnamed Setup"}</span>
                    <Badge variant="secondary">{setup.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Visits</CardTitle></CardHeader>
          <CardContent>
            {recentVisits.length === 0 ? (
              <p className="text-muted-foreground">No visits recorded.</p>
            ) : (
              <div className="space-y-2">
                {recentVisits.map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-foreground">{visit.visit_date ? new Date(visit.visit_date).toLocaleDateString() : "—"}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">${visit.total_cash_collected || 0}</span>
                      <Badge variant={visit.status === "completed" ? "default" : "destructive"}>{visit.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
