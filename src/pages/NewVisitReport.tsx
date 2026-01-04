import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Camera, 
  Plus, 
  Trash2, 
  Save, 
  QrCode,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const machines = [
  { id: "VM-001", location: "Westfield Mall - Food Court" },
  { id: "VM-012", location: "University Library" },
  { id: "VM-023", location: "Central Station - Platform 3" },
  { id: "VM-045", location: "Tech Park Building A" },
  { id: "VM-089", location: "Airport Terminal 2" },
];

const products = [
  { id: "TOY-001", name: "Plush Bear Collection", price: 3.00 },
  { id: "TOY-002", name: "Capsule Figures Series A", price: 2.50 },
  { id: "TOY-003", name: "Keychain Buddies", price: 1.50 },
  { id: "TOY-004", name: "Mini Vehicles Pack", price: 4.00 },
  { id: "TOY-005", name: "Bouncy Balls Premium", price: 1.00 },
];

interface SlotEntry {
  id: string;
  product: string;
  previousCount: number;
  currentCount: number;
  refilled: number;
}

export default function NewVisitReport() {
  const navigate = useNavigate();
  const [selectedMachine, setSelectedMachine] = useState("");
  const [meterReading, setMeterReading] = useState("");
  const [cashCollected, setCashCollected] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [issueReported, setIssueReported] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [fixedOnSite, setFixedOnSite] = useState<boolean | null>(null);
  
  const [slots, setSlots] = useState<SlotEntry[]>([
    { id: "1", product: "", previousCount: 0, currentCount: 0, refilled: 0 },
  ]);

  const addSlot = () => {
    setSlots([
      ...slots,
      { id: Date.now().toString(), product: "", previousCount: 0, currentCount: 0, refilled: 0 },
    ]);
  };

  const removeSlot = (id: string) => {
    if (slots.length > 1) {
      setSlots(slots.filter((slot) => slot.id !== id));
    }
  };

  const updateSlot = (id: string, field: keyof SlotEntry, value: string | number) => {
    setSlots(
      slots.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot))
    );
  };

  const calculateTotals = () => {
    const totalSold = slots.reduce((sum, slot) => {
      const sold = slot.previousCount - slot.currentCount + slot.refilled;
      return sum + Math.max(0, sold);
    }, 0);
    
    const totalRefilled = slots.reduce((sum, slot) => sum + slot.refilled, 0);
    
    return { totalSold, totalRefilled };
  };

  const handleSubmit = () => {
    if (!selectedMachine) {
      toast.error("Please select a machine");
      return;
    }
    
    toast.success("Visit report submitted successfully!");
    navigate("/visits");
  };

  const { totalSold, totalRefilled } = calculateTotals();

  return (
    <AppLayout
      title="New Visit Report"
      subtitle="Record a field service visit"
      actions={
        <Button variant="outline" onClick={() => navigate("/visits")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Visits
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Machine Selection */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Machine Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine">Select Machine</Label>
              <div className="flex gap-2">
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Choose a machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.id} - {machine.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="shrink-0">
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meter">Meter Reading</Label>
              <Input
                id="meter"
                type="number"
                placeholder="Enter current meter reading"
                value={meterReading}
                onChange={(e) => setMeterReading(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
        </Card>

        {/* Slot Inventory */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Slot Inventory</h3>
            <Button variant="outline" size="sm" onClick={addSlot} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Slot
            </Button>
          </div>
          
          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div key={slot.id} className="p-4 rounded-lg bg-background border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Slot {index + 1}</span>
                  {slots.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeSlot(slot.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={slot.product}
                      onValueChange={(value) => updateSlot(slot.id, "product", value)}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Previous Count</Label>
                    <Input
                      type="number"
                      min="0"
                      value={slot.previousCount || ""}
                      onChange={(e) =>
                        updateSlot(slot.id, "previousCount", parseInt(e.target.value) || 0)
                      }
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Count</Label>
                    <Input
                      type="number"
                      min="0"
                      value={slot.currentCount || ""}
                      onChange={(e) =>
                        updateSlot(slot.id, "currentCount", parseInt(e.target.value) || 0)
                      }
                      className="bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Refilled</Label>
                    <Input
                      type="number"
                      min="0"
                      value={slot.refilled || ""}
                      onChange={(e) =>
                        updateSlot(slot.id, "refilled", parseInt(e.target.value) || 0)
                      }
                      className="bg-card"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Summary</span>
              <div className="flex gap-6 text-sm">
                <span className="text-foreground">
                  <strong>{totalSold}</strong> units sold
                </span>
                <span className="text-foreground">
                  <strong>{totalRefilled}</strong> units refilled
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Cash Collection */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Cash Collection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cash">Cash Collected ($)</Label>
              <Input
                id="cash"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cashCollected}
                onChange={(e) => setCashCollected(e.target.value)}
                className="bg-background text-lg font-semibold"
              />
            </div>
          </div>
        </Card>

        {/* Photo Evidence */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Photo Evidence</h3>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">Click to capture or upload machine photo</p>
            <p className="text-xs text-muted-foreground">Required for visit verification</p>
          </div>
        </Card>

        {/* Issue Reporting */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Issue Reporting</h3>
            <Button
              variant={issueReported ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIssueReported(!issueReported)}
              className="gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              {issueReported ? "Issue Reported" : "Report Issue"}
            </Button>
          </div>

          {issueReported && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Issue Description</Label>
                <Textarea
                  placeholder="Describe the issue..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Fixed on site?</Label>
                <div className="flex gap-3">
                  <Button
                    variant={fixedOnSite === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFixedOnSite(true)}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Yes, Fixed
                  </Button>
                  <Button
                    variant={fixedOnSite === false ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setFixedOnSite(false)}
                    className="gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    No, Needs Follow-up
                  </Button>
                </div>
                {fixedOnSite === false && (
                  <p className="text-sm text-destructive mt-2">
                    ⚠️ A high-priority maintenance ticket will be created
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Notes */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Additional Notes</h3>
          <Textarea
            placeholder="Any additional observations or comments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background"
            rows={4}
          />
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4 pb-6">
          <Button variant="outline" onClick={() => navigate("/visits")}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Save className="w-4 h-4" />
            Submit Report
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
