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
import { Plus, Search, Filter, Eye, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const visits = [
  {
    id: "VR-2024-001",
    date: "2024-01-10",
    machine: "VM-001",
    location: "Westfield Mall - Food Court",
    driver: "John Smith",
    status: "completed",
    revenue: "$127.50",
    unitsRefilled: 45,
  },
  {
    id: "VR-2024-002",
    date: "2024-01-10",
    machine: "VM-023",
    location: "Central Station - Platform 3",
    driver: "Sarah Johnson",
    status: "completed",
    revenue: "$89.25",
    unitsRefilled: 32,
  },
  {
    id: "VR-2024-003",
    date: "2024-01-10",
    machine: "VM-045",
    location: "Tech Park Building A",
    driver: "Mike Davis",
    status: "in_progress",
    revenue: "$156.00",
    unitsRefilled: 28,
  },
  {
    id: "VR-2024-004",
    date: "2024-01-09",
    machine: "VM-012",
    location: "University Library",
    driver: "Emily Chen",
    status: "completed",
    revenue: "$67.75",
    unitsRefilled: 22,
  },
  {
    id: "VR-2024-005",
    date: "2024-01-09",
    machine: "VM-089",
    location: "Airport Terminal 2",
    driver: "John Smith",
    status: "pending_review",
    revenue: "$234.00",
    unitsRefilled: 56,
  },
];

const statusConfig = {
  completed: { label: "Completed", variant: "default" as const },
  in_progress: { label: "In Progress", variant: "secondary" as const },
  pending_review: { label: "Pending Review", variant: "outline" as const },
};

export default function VisitsPage() {
  const navigate = useNavigate();

  return (
    <AppLayout
      title="Visit Reports"
      subtitle="Track and manage field service visits"
      actions={
        <Button className="gap-2" onClick={() => navigate("/visits/new")}>
          <Plus className="w-4 h-4" />
          New Visit Report
        </Button>
      }
    >
      {/* Filters */}
      <Card className="p-4 mb-6 bg-card border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search visits..." 
              className="pl-10 bg-background"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Visits Table */}
      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Report ID</TableHead>
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">Machine</TableHead>
              <TableHead className="text-muted-foreground">Location</TableHead>
              <TableHead className="text-muted-foreground">Driver</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground text-right">Revenue</TableHead>
              <TableHead className="text-muted-foreground text-right">Refilled</TableHead>
              <TableHead className="text-muted-foreground w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => (
              <TableRow key={visit.id} className="border-border hover:bg-muted/50">
                <TableCell className="font-medium text-primary">{visit.id}</TableCell>
                <TableCell className="text-muted-foreground">{visit.date}</TableCell>
                <TableCell className="font-medium text-foreground">{visit.machine}</TableCell>
                <TableCell className="text-foreground truncate max-w-[180px]">{visit.location}</TableCell>
                <TableCell className="text-foreground">{visit.driver}</TableCell>
                <TableCell>
                  <Badge variant={statusConfig[visit.status as keyof typeof statusConfig].variant}>
                    {statusConfig[visit.status as keyof typeof statusConfig].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-foreground">{visit.revenue}</TableCell>
                <TableCell className="text-right text-muted-foreground">{visit.unitsRefilled} units</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AppLayout>
  );
}
