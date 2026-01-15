import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Eye, RotateCcw, CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const visits = [
  {
    id: "VR-2024-001",
    date: "2024-01-10",
    location: "Westfield Mall - Food Court",
    spot: "Spot 1",
    driver: "John Smith",
    revenue: "$127.50",
    refilled: 45,
    capacity: 60,
  },
  {
    id: "VR-2024-002",
    date: "2024-01-10",
    location: "Central Station",
    spot: "Spot 3",
    driver: "Sarah Johnson",
    revenue: "$89.25",
    refilled: 32,
    capacity: 50,
  },
  {
    id: "VR-2024-003",
    date: "2024-01-10",
    location: "Tech Park Building A",
    spot: "Spot 2",
    driver: "Mike Davis",
    revenue: "$156.00",
    refilled: 28,
    capacity: 40,
  },
  {
    id: "VR-2024-004",
    date: "2024-01-09",
    location: "University Library",
    spot: "Spot 1",
    driver: "Emily Chen",
    revenue: "$67.75",
    refilled: 22,
    capacity: 30,
  },
  {
    id: "VR-2024-005",
    date: "2024-01-09",
    location: "Airport Terminal 2",
    spot: "Spot 5",
    driver: "John Smith",
    revenue: "$234.00",
    refilled: 56,
    capacity: 80,
  },
];

const locations = [
  "Westfield Mall - Food Court",
  "Central Station",
  "Tech Park Building A",
  "University Library",
  "Airport Terminal 2",
];

const spots = ["Spot 1", "Spot 2", "Spot 3", "Spot 4", "Spot 5"];

export default function VisitsPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedSpot, setSelectedSpot] = useState<string>("all");

  const filteredVisits = visits.filter((visit) => {
    if (selectedLocation !== "all" && visit.location !== selectedLocation) {
      return false;
    }
    if (selectedSpot !== "all" && visit.spot !== selectedSpot) {
      return false;
    }
    if (dateRange?.from) {
      const visitDate = new Date(visit.date);
      if (visitDate < dateRange.from) return false;
      if (dateRange.to && visitDate > dateRange.to) return false;
    }
    return true;
  });

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
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[280px]",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Select date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Location Filter */}
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Spot Filter */}
          <Select value={selectedSpot} onValueChange={setSelectedSpot}>
            <SelectTrigger className="min-w-[140px]">
              <SelectValue placeholder="All Spots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Spots</SelectItem>
              {spots.map((spot) => (
                <SelectItem key={spot} value={spot}>
                  {spot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(dateRange || selectedLocation !== "all" || selectedSpot !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateRange(undefined);
                setSelectedLocation("all");
                setSelectedSpot("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {/* Visits Table */}
      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Report ID</TableHead>
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">Location</TableHead>
              <TableHead className="text-muted-foreground">Spot</TableHead>
              <TableHead className="text-muted-foreground">Driver</TableHead>
              <TableHead className="text-muted-foreground text-right">Revenue</TableHead>
              <TableHead className="text-muted-foreground text-right">Refilled</TableHead>
              <TableHead className="text-muted-foreground text-right">Capacity</TableHead>
              <TableHead className="text-muted-foreground w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.map((visit) => (
              <TableRow key={visit.id} className="border-border hover:bg-muted/50">
                <TableCell className="font-medium text-primary">{visit.id}</TableCell>
                <TableCell className="text-muted-foreground">{visit.date}</TableCell>
                <TableCell className="text-foreground truncate max-w-[180px]">{visit.location}</TableCell>
                <TableCell className="text-foreground">{visit.spot}</TableCell>
                <TableCell className="text-foreground">{visit.driver}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{visit.revenue}</TableCell>
                <TableCell className="text-right text-muted-foreground">{visit.refilled} units</TableCell>
                <TableCell className="text-right text-muted-foreground">{visit.capacity} units</TableCell>
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