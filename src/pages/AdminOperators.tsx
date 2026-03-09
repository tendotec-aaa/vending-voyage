import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Loader2, Users, MapPin } from 'lucide-react';
import { useUserLocations } from '@/hooks/useUserLocations';
import { useToast } from '@/hooks/use-toast';

const ManageLocationsDialog = ({
  open, onOpenChange, operatorId, operatorName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  operatorId: string;
  operatorName: string;
}) => {
  const { toast } = useToast();
  const { locationIds, isAssigned, assignLocation, unassignLocation, isLoading } =
    useUserLocations(operatorId);

  const { data: locations, isLoading: locLoading } = useQuery({
    queryKey: ['all-locations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleToggle = async (locationId: string, assigned: boolean) => {
    try {
      if (assigned) {
        await unassignLocation(locationId);
      } else {
        await assignLocation(locationId);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Locations</DialogTitle>
          <DialogDescription>
            Assign locations to {operatorName}. They will only see issues and data for these locations.
          </DialogDescription>
        </DialogHeader>
        {(isLoading || locLoading) ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !locations?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No locations found.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {locations.map((loc) => {
              const assigned = isAssigned(loc.id);
              return (
                <label
                  key={loc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={assigned}
                    onCheckedChange={() => handleToggle(loc.id, assigned)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{loc.name}</p>
                    {loc.address && (
                      <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AdminOperators = () => {
  const navigate = useNavigate();
  const [selectedOp, setSelectedOp] = useState<{ id: string; name: string } | null>(null);

  const { data: operators, isLoading } = useQuery({
    queryKey: ['admin-operators'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'route_operator');

      if (rolesError || !roles?.length) return [];

      const userIds = roles.map(r => r.user_id);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_names, last_names, email, active')
        .in('id', userIds);

      if (profilesError) return [];

      // Fetch assignment counts
      const { data: assignments } = await supabase
        .from('user_location_assignments')
        .select('user_id, location_id')
        .in('user_id', userIds);

      const countMap = new Map<string, number>();
      (assignments ?? []).forEach((a: any) => {
        countMap.set(a.user_id, (countMap.get(a.user_id) || 0) + 1);
      });

      return (profiles ?? []).map(p => ({
        ...p,
        assignmentCount: countMap.get(p.id) || 0,
      }));
    },
  });

  const getOperatorName = (op: any) =>
    [op.first_names, op.last_names].filter(Boolean).join(' ') || 'Unnamed';

  return (
    <AppLayout title="Operators" subtitle="Monitor field operators and view their dashboards.">
      <Card className="bg-card border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !operators?.length ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No operators found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium text-foreground">
                    {getOperatorName(op)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{op.email ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{op.assignmentCount} assigned</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={op.active ? 'default' : 'secondary'}>
                      {op.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOp({ id: op.id, name: getOperatorName(op) })}
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Locations
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dashboard?as_user=${op.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Dashboard
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {selectedOp && (
        <ManageLocationsDialog
          open={!!selectedOp}
          onOpenChange={(v) => !v && setSelectedOp(null)}
          operatorId={selectedOp.id}
          operatorName={selectedOp.name}
        />
      )}
    </AppLayout>
  );
};

export default AdminOperators;
