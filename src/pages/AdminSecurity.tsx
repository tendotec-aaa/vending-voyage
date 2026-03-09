import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Users, Lock } from 'lucide-react';
import { PERMISSION_CATEGORIES, PERMISSION_LABELS, ALL_PERMISSION_KEYS, type PermissionKey } from '@/hooks/usePermissions';

// ============ Hooks ============

function useAppRoles() {
  return useQuery({
    queryKey: ['app-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_roles').select('*').order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId);
      if (error) throw error;
      return data;
    },
    enabled: !!roleId,
  });
}

function useUserAssignments() {
  return useQuery({
    queryKey: ['user-assignments-all'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from('user_profiles')
        .select('id, first_names, last_names, email');
      if (pErr) throw pErr;

      const { data: assignments, error: aErr } = await supabase
        .from('user_assignments')
        .select('*');
      if (aErr) throw aErr;

      const { data: locations, error: lErr } = await supabase
        .from('locations')
        .select('id, name');
      if (lErr) throw lErr;

      return { profiles: profiles || [], assignments: assignments || [], locations: locations || [] };
    },
  });
}

// ============ Components ============

function RolesPermissionsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: roles, isLoading: rolesLoading } = useAppRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const { data: permissions, isLoading: permsLoading } = useRolePermissions(selectedRoleId);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Auto-select first role
  const activeRoleId = selectedRoleId || (roles?.[0]?.id ?? null);

  const createRole = useMutation({
    mutationFn: async () => {
      const { data: role, error } = await supabase
        .from('app_roles')
        .insert({ name: newRoleName, description: newRoleDesc || null })
        .select()
        .single();
      if (error) throw error;

      // Seed all permission keys as disabled
      const rows = ALL_PERMISSION_KEYS.map((key) => ({
        role_id: role.id,
        permission_key: key,
        is_enabled: false,
      }));
      const { error: permErr } = await supabase.from('role_permissions').insert(rows);
      if (permErr) throw permErr;
      return role;
    },
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ['app-roles'] });
      setSelectedRoleId(role.id);
      setNewRoleName('');
      setNewRoleDesc('');
      setDialogOpen(false);
      toast({ title: 'Role created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('app_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-assignments-all'] });
      setSelectedRoleId(null);
      toast({ title: 'Role deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const togglePermission = useMutation({
    mutationFn: async ({ permId, enabled }: { permId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('role_permissions')
        .update({ is_enabled: enabled })
        .eq('id', permId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', activeRoleId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const permMap = new Map(permissions?.map((p) => [p.permission_key, p]) || []);

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Role list sidebar */}
      <div className="w-full lg:w-64 shrink-0 space-y-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. Accountant" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} placeholder="Optional description" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createRole.mutate()} disabled={!newRoleName.trim() || createRole.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {rolesLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : (
          roles?.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                activeRoleId === role.id
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent/50'
              }`}
            >
              <div className="font-medium text-sm">{role.name}</div>
              {role.description && <div className="text-xs text-muted-foreground mt-0.5 truncate">{role.description}</div>}
            </button>
          ))
        )}
      </div>

      {/* Permissions grid */}
      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {roles?.find((r) => r.id === activeRoleId)?.name || 'Select a Role'}
            </CardTitle>
            <CardDescription>Toggle capabilities for this role</CardDescription>
          </div>
          {activeRoleId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Role?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove this role and unassign all users from it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteRole.mutate(activeRoleId)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {permsLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : (
            Object.entries(PERMISSION_CATEGORIES).map(([catKey, cat]) => (
              <div key={catKey}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {cat.label}
                </h3>
                <div className="space-y-2">
                  {cat.keys.map((permKey) => {
                    const perm = permMap.get(permKey);
                    return (
                      <div
                        key={permKey}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">{PERMISSION_LABELS[permKey]}</div>
                          <div className="text-xs text-muted-foreground font-mono">{permKey}</div>
                        </div>
                        <Switch
                          checked={perm?.is_enabled ?? false}
                          onCheckedChange={(checked) => {
                            if (perm) togglePermission.mutate({ permId: perm.id, enabled: checked });
                          }}
                          disabled={!perm}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserAssignmentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: roles } = useAppRoles();
  const { data, isLoading } = useUserAssignments();

  const upsertAssignment = useMutation({
    mutationFn: async (params: { userId: string; roleId: string; scopeType: string; scopeId: string | null }) => {
      const { error } = await supabase
        .from('user_assignments')
        .upsert(
          {
            user_id: params.userId,
            role_id: params.roleId,
            scope_type: params.scopeType as any,
            scope_id: params.scopeId,
          },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-assignments-all'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast({ title: 'Assignment updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const getAssignment = (userId: string) => data?.assignments.find((a) => a.user_id === userId);

  const handleRoleChange = (userId: string, roleId: string) => {
    const existing = getAssignment(userId);
    upsertAssignment.mutate({
      userId,
      roleId,
      scopeType: existing?.scope_type || 'global',
      scopeId: existing?.scope_id || null,
    });
  };

  const handleScopeChange = (userId: string, scopeType: string) => {
    const existing = getAssignment(userId);
    if (!existing) return;
    upsertAssignment.mutate({
      userId,
      roleId: existing.role_id,
      scopeType,
      scopeId: scopeType === 'location' ? existing.scope_id : null,
    });
  };

  const handleLocationChange = (userId: string, locationId: string) => {
    const existing = getAssignment(userId);
    if (!existing) return;
    upsertAssignment.mutate({
      userId,
      roleId: existing.role_id,
      scopeType: existing.scope_type,
      scopeId: locationId,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">User Assignments</CardTitle>
        <CardDescription>Assign roles and scopes to each user</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.profiles.map((profile) => {
                  const assignment = getAssignment(profile.id);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {[profile.first_names, profile.last_names].filter(Boolean).join(' ') || 'Unnamed'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{profile.email}</TableCell>
                      <TableCell>
                        <Select
                          value={assignment?.role_id || ''}
                          onValueChange={(val) => handleRoleChange(profile.id, val)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles?.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={assignment?.scope_type || 'global'}
                          onValueChange={(val) => handleScopeChange(profile.id, val)}
                          disabled={!assignment}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="global">Global</SelectItem>
                            <SelectItem value="location">Location</SelectItem>
                            <SelectItem value="personal">Personal</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {assignment?.scope_type === 'location' ? (
                          <Select
                            value={assignment.scope_id || ''}
                            onValueChange={(val) => handleLocationChange(profile.id, val)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {data.locations.map((l) => (
                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-xs">N/A</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Main Page ============

export default function AdminSecurity() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Security & Roles</h1>
            <p className="text-sm text-muted-foreground">Manage roles, permissions, and user access</p>
          </div>
        </div>

        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="roles" className="gap-2">
              <Lock className="w-4 h-4" /> Roles & Permissions
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" /> User Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <RolesPermissionsTab />
          </TabsContent>

          <TabsContent value="users">
            <UserAssignmentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
