import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Building2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSuppliers, Supplier, CreateSupplierData } from "@/hooks/useSuppliers";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";

export default function Suppliers() {
  const navigate = useNavigate();
  const { suppliers, isLoading, createSupplier, deleteSupplier } = useSuppliers();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.contact_email?.toLowerCase().includes(query) ||
        s.country?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  const handleCreate = (data: CreateSupplierData) => {
    createSupplier.mutate(data, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
            <p className="text-muted-foreground">Manage your suppliers and their contact information</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search suppliers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">{searchQuery ? "No suppliers found" : "No suppliers yet"}</h3>
            <p className="text-muted-foreground mb-4">{searchQuery ? "Try adjusting your search query" : "Add your first supplier to get started"}</p>
            {!searchQuery && (
              <Button onClick={() => setIsFormOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Supplier</Button>
            )}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">{supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{supplier.country || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{supplier.contact_email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{supplier.contact_phone || "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{supplier.lead_time_days || 0}d</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <SupplierFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} onSubmit={handleCreate} isLoading={createSupplier.isPending} />
    </AppLayout>
  );
}
