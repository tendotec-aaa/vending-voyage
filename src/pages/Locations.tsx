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
import { Plus, Search, Filter, MoreVertical, MapPin, Phone, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const locations = [
  {
    id: "LOC-001",
    name: "Westfield Mall",
    address: "123 Shopping Ave, City Center",
    contact: "John Manager",
    phone: "(555) 123-4567",
    machines: 3,
    monthlyRent: "$450",
    contractEnd: "2024-12-31",
    status: "active",
  },
  {
    id: "LOC-002",
    name: "Central Station",
    address: "456 Transit Blvd, Downtown",
    contact: "Sarah Director",
    phone: "(555) 234-5678",
    machines: 2,
    monthlyRent: "$600",
    contractEnd: "2024-06-30",
    status: "active",
  },
  {
    id: "LOC-003",
    name: "Tech Park",
    address: "789 Innovation Dr, Tech District",
    contact: "Mike Admin",
    phone: "(555) 345-6789",
    machines: 4,
    monthlyRent: "$350",
    contractEnd: "2024-03-15",
    status: "expiring",
  },
  {
    id: "LOC-004",
    name: "University Campus",
    address: "101 College Rd, Education Zone",
    contact: "Emily Dean",
    phone: "(555) 456-7890",
    machines: 5,
    monthlyRent: "$500",
    contractEnd: "2025-08-31",
    status: "active",
  },
  {
    id: "LOC-005",
    name: "Airport Terminal 2",
    address: "Airport Way, Gate Area",
    contact: "Airport Ops",
    phone: "(555) 567-8901",
    machines: 2,
    monthlyRent: "$1,200",
    contractEnd: "2024-09-30",
    status: "active",
  },
  {
    id: "LOC-006",
    name: "Community Center",
    address: "202 Civic Plaza, Suburbs",
    contact: "Local Admin",
    phone: "(555) 678-9012",
    machines: 1,
    monthlyRent: "$200",
    contractEnd: "2023-12-31",
    status: "expired",
  },
];

const statusConfig = {
  active: { label: "Active", variant: "default" as const },
  expiring: { label: "Expiring Soon", variant: "secondary" as const },
  expired: { label: "Expired", variant: "destructive" as const },
};

export default function LocationsPage() {
  return (
    <AppLayout
      title="Locations"
      subtitle="Manage venue partnerships and machine placements"
      actions={
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Total Locations</p>
          <p className="text-2xl font-bold text-foreground">24</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Active Contracts</p>
          <p className="text-2xl font-bold text-foreground">21</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Monthly Rent Total</p>
          <p className="text-2xl font-bold text-foreground">$8,450</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Expiring (60 days)</p>
          <p className="text-2xl font-bold text-amber-600">3</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 bg-card border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search locations..." 
              className="pl-10 bg-background"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Locations Table */}
      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Location</TableHead>
              <TableHead className="text-muted-foreground">Contact</TableHead>
              <TableHead className="text-muted-foreground text-center">Machines</TableHead>
              <TableHead className="text-muted-foreground text-right">Monthly Rent</TableHead>
              <TableHead className="text-muted-foreground">Contract End</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id} className="border-border hover:bg-muted/50">
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{location.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {location.address}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="text-foreground">{location.contact}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {location.phone}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium text-foreground">{location.machines}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{location.monthlyRent}</TableCell>
                <TableCell className="text-muted-foreground">{location.contractEnd}</TableCell>
                <TableCell>
                  <Badge variant={statusConfig[location.status as keyof typeof statusConfig].variant}>
                    {statusConfig[location.status as keyof typeof statusConfig].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Location</DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="w-4 h-4 mr-2" />
                        Contact Venue
                      </DropdownMenuItem>
                      <DropdownMenuItem>Renew Contract</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">End Contract</DropdownMenuItem>
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
