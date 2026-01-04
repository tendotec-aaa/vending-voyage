import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Search, Filter, MoreVertical, MapPin, Wrench } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const machines = [
  {
    id: "VM-001",
    model: "CraneMax 3000",
    location: "Westfield Mall - Food Court",
    status: "operational",
    lastService: "2024-01-08",
    revenue: "$2,450",
  },
  {
    id: "VM-012",
    model: "ToyGrab Pro",
    location: "University Library",
    status: "low_stock",
    lastService: "2024-01-05",
    revenue: "$1,890",
  },
  {
    id: "VM-023",
    model: "CraneMax 3000",
    location: "Central Station - Platform 3",
    status: "operational",
    lastService: "2024-01-10",
    revenue: "$3,120",
  },
  {
    id: "VM-045",
    model: "MiniClaw 100",
    location: "Tech Park Building A",
    status: "needs_service",
    lastService: "2023-12-28",
    revenue: "$980",
  },
  {
    id: "VM-089",
    model: "CraneMax 3000",
    location: "Airport Terminal 2",
    status: "operational",
    lastService: "2024-01-09",
    revenue: "$5,670",
  },
  {
    id: "VM-102",
    model: "ToyGrab Pro",
    location: "Shopping Center North",
    status: "offline",
    lastService: "2024-01-02",
    revenue: "$1,230",
  },
];

const statusConfig = {
  operational: { label: "Operational", variant: "default" as const },
  low_stock: { label: "Low Stock", variant: "secondary" as const },
  needs_service: { label: "Needs Service", variant: "destructive" as const },
  offline: { label: "Offline", variant: "outline" as const },
};

export default function MachinesPage() {
  return (
    <AppLayout
      title="Machines"
      subtitle="Manage your vending machine fleet"
      actions={
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Machine
        </Button>
      }
    >
      {/* Filters */}
      <Card className="p-4 mb-6 bg-card border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, model, or location..." 
              className="pl-10 bg-background"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Machines Table */}
      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Machine ID</TableHead>
              <TableHead className="text-muted-foreground">Model</TableHead>
              <TableHead className="text-muted-foreground">Location</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Last Service</TableHead>
              <TableHead className="text-muted-foreground text-right">MTD Revenue</TableHead>
              <TableHead className="text-muted-foreground w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => (
              <TableRow key={machine.id} className="border-border hover:bg-muted/50">
                <TableCell className="font-medium text-foreground">{machine.id}</TableCell>
                <TableCell className="text-foreground">{machine.model}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{machine.location}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusConfig[machine.status as keyof typeof statusConfig].variant}>
                    {statusConfig[machine.status as keyof typeof statusConfig].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{machine.lastService}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{machine.revenue}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Machine</DropdownMenuItem>
                      <DropdownMenuItem>
                        <Wrench className="w-4 h-4 mr-2" />
                        Schedule Service
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
