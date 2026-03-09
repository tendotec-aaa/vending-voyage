import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Loader2, Users } from 'lucide-react';

const AdminOperators = () => {
  const navigate = useNavigate();

  const { data: operators, isLoading } = useQuery({
    queryKey: ['admin-operators'],
    queryFn: async () => {
      // Get all users with route_operator role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'route_operator');

      if (rolesError || !roles?.length) return [];

      const userIds = roles.map(r => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_names, last_names, email, active')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching operator profiles:', profilesError);
        return [];
      }

      return profiles ?? [];
    },
  });

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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium text-foreground">
                    {[op.first_names, op.last_names].filter(Boolean).join(' ') || 'Unnamed'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{op.email ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={op.active ? 'default' : 'secondary'}>
                      {op.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dashboard?as_user=${op.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Dashboard
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AppLayout>
  );
};

export default AdminOperators;
