import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useTeamManagement, type UserRole } from "@/hooks/useTeamManagement";
import { 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Pencil, 
  UserX, 
  UserCheck,
  Loader2,
  Shield,
  Truck,
  Warehouse
} from "lucide-react";

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: "Admin", color: "bg-destructive text-destructive-foreground", icon: Shield },
  route_operator: { label: "Route Operator", color: "bg-primary text-primary-foreground", icon: Truck },
  warehouse_manager: { label: "Warehouse Mgr", color: "bg-secondary text-secondary-foreground", icon: Warehouse },
};

export default function UsersPage() {
  const { teamMembers, isLoading, updateUserRole, toggleUserActive } = useTeamManagement();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("route_operator");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: "", firstName: "", lastName: "", role: "route_operator" as UserRole });

  // Filter team members
  const filteredMembers = teamMembers.filter((member) => {
    const fullName = `${member.first_names || ""} ${member.last_names || ""}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchQuery.toLowerCase()) ||
      (member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const memberRole = member.user_role?.role;
    const matchesRole = roleFilter === "all" || memberRole === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (userId: string, role: UserRole) => {
    updateUserRole.mutate({ userId, role });
    setEditingUser(null);
  };

  const handleToggleActive = (userId: string, currentActive: boolean) => {
    toggleUserActive.mutate({ userId, active: !currentActive });
  };

  const getDisplayName = (member: typeof teamMembers[0]) => {
    if (member.first_names || member.last_names) {
      return `${member.first_names || ""} ${member.last_names || ""}`.trim();
    }
    return member.email?.split("@")[0] || "Unknown";
  };

  return (
    <AppLayout
      title="Team Management"
      subtitle="Manage access, roles, and status for your vending operation."
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="route_operator">Route Operators</SelectItem>
            <SelectItem value="warehouse_manager">Warehouse Managers</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Team Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Team Members Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || roleFilter !== "all" 
                ? "No members match your filters."
                : "Invite team members to get started."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const role = member.user_role?.role;
                const config = role ? roleConfig[role] : null;
                const RoleIcon = config?.icon || Shield;

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {getDisplayName(member)}
                      {!member.profile_completed && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      {editingUser === member.id ? (
                        <Select
                          value={selectedRole}
                          onValueChange={(value) => setSelectedRole(value as UserRole)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="route_operator">Route Operator</SelectItem>
                            <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : role && config ? (
                        <Badge className={config.color}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Role</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.active ? (
                        <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingUser === member.id ? (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleRoleChange(member.id, selectedRole)}
                            disabled={updateUserRole.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUser(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingUser(member.id);
                                setSelectedRole(role || "route_operator");
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(member.id, member.active ?? false)}
                            >
                              {member.active ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your vending operation team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@company.com"
                value={inviteData.email}
                onChange={(e) => setInviteData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-firstname">First Name</Label>
                <Input
                  id="invite-firstname"
                  placeholder="John"
                  value={inviteData.firstName}
                  onChange={(e) => setInviteData((prev) => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-lastname">Last Name</Label>
                <Input
                  id="invite-lastname"
                  placeholder="Doe"
                  value={inviteData.lastName}
                  onChange={(e) => setInviteData((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select 
                value={inviteData.role} 
                onValueChange={(value) => setInviteData((prev) => ({ ...prev, role: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="route_operator">Route Operator</SelectItem>
                  <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // For now, just close - invitation requires edge function
              setInviteDialogOpen(false);
            }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
