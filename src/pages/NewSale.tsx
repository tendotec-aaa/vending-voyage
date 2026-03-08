import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSales, useStockCheck, type SaleLineInput } from "@/hooks/useSales";
import { useAuth } from "@/hooks/useAuth";
import { fmt2 } from "@/lib/formatters";

interface LineItem {
  item_detail_id: string;
  quantity: number;
  unit_price: number;
}

export default function NewSale() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { warehouses, items, createSale, isCreating } = useSales();

  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState(0);
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ item_detail_id: "", quantity: 1, unit_price: 0 }]);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const lineItemIds = useMemo(() => lines.map((l) => l.item_detail_id).filter(Boolean), [lines]);
  const { data: stockData } = useStockCheck(warehouseId || null, lineItemIds);

  const addLine = () => setLines([...lines, { item_detail_id: "", quantity: 1, unit_price: 0 }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    setLines(updated);
  };

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0),
    [lines]
  );
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const validateAndSubmit = async () => {
    const validLines = lines.filter((l) => l.item_detail_id && l.quantity > 0);
    if (validLines.length === 0 || !warehouseId) return;

    // Check stock levels
    const warnings: string[] = [];
    for (const line of validLines) {
      const stock = stockData?.find((s) => s.item_detail_id === line.item_detail_id);
      const available = stock?.quantity_on_hand ?? 0;
      if (line.quantity > available) {
        const item = items.find((i) => i.id === line.item_detail_id);
        warnings.push(`${item?.name || "Unknown"}: requesting ${line.quantity}, system shows ${available}`);
      }
    }

    if (warnings.length > 0) {
      setStockWarnings(warnings);
      setShowStockWarning(true);
      return;
    }

    await submitSale(validLines);
  };

  const submitSale = async (validLines?: LineItem[]) => {
    const finalLines = validLines || lines.filter((l) => l.item_detail_id && l.quantity > 0);
    const saleItems: SaleLineInput[] = finalLines.map((l) => ({
      item_detail_id: l.item_detail_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      total_price: l.quantity * l.unit_price,
    }));

    const saleId = await createSale({
      sale_date: saleDate,
      buyer_name: buyerName || null,
      buyer_contact: buyerContact || null,
      warehouse_id: warehouseId,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: notes || null,
      currency,
      paid,
      created_by: user?.id || "",
      items: saleItems,
    });

    if (saleId) {
      navigate(`/sales/${saleId}`);
    }
  };

  const canSubmit = warehouseId && lines.some((l) => l.item_detail_id && l.quantity > 0) && !isCreating;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">New Sale</h1>
            <p className="text-muted-foreground mt-1">Create a warehouse sales order</p>
          </div>
        </div>

        {/* Header info */}
        <Card>
          <CardHeader>
            <CardTitle>Sale Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sale Date</Label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Source Warehouse *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buyer Name</Label>
              <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="space-y-2">
              <Label>Buyer Contact</Label>
              <Input value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} placeholder="Phone or email" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input type="number" min={0} step={0.01} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={paid} onCheckedChange={setPaid} />
              <Label>Paid</Label>
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select value={line.item_detail_id} onValueChange={(v) => updateLine(idx, "item_detail_id", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-28"
                        value={line.unit_price}
                        onChange={(e) => updateLine(idx, "unit_price", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      ${fmt2(line.quantity * line.unit_price)}
                    </TableCell>
                    <TableCell>
                      {lines.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">${fmt2(subtotal)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex gap-8">
                  <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                  <span className="font-medium text-foreground">${fmt2(taxAmount)}</span>
                </div>
              )}
              <div className="flex gap-8 text-lg font-bold border-t border-border pt-2 mt-1">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">${fmt2(totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-6">
            <Label>Notes</Label>
            <Textarea className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/sales")}>Cancel</Button>
          <Button disabled={!canSubmit} onClick={validateAndSubmit}>
            {isCreating ? "Creating..." : "Create Sale"}
          </Button>
        </div>
      </div>

      {/* Stock warning dialog */}
      <AlertDialog open={showStockWarning} onOpenChange={setShowStockWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Insufficient Stock Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>The system shows insufficient stock for the following items:</p>
              <ul className="list-disc pl-5 space-y-1">
                {stockWarnings.map((w, i) => (
                  <li key={i} className="text-sm">{w}</li>
                ))}
              </ul>
              <p className="font-medium pt-2">Are you sure you have the physical units?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitSale()}>
              Yes, proceed with sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
