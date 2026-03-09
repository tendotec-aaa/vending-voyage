import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useItemTypes, type ItemType, type ItemTypeFlag } from '@/hooks/useItemTypes';

const FLAG_COLUMNS: { key: ItemTypeFlag; label: string }[] = [
  { key: 'is_routable', label: 'Routable' },
  { key: 'is_sellable', label: 'Sellable' },
  { key: 'is_asset', label: 'Asset' },
  { key: 'is_supply', label: 'Supply' },
  { key: 'is_component', label: 'Component' },
];

export function ItemTypesTab() {
  const { toast } = useToast();
  const {
    itemTypes,
    isLoading,
    createItemType,
    updateItemType,
    updateItemTypeFlag,
    deleteItemType,
    checkLinkedItems,
  } = useItemTypes();

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemType | null>(null);
  const [newName, setNewName] = useState('');
  const [newFlags, setNewFlags] = useState({ is_routable: false, is_sellable: false, is_asset: false, is_supply: false, is_component: false });
  const [editName, setEditName] = useState('');
  const [editFlags, setEditFlags] = useState({ is_routable: false, is_sellable: false, is_asset: false, is_supply: false, is_component: false });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createItemType({ name: newName.trim(), ...newFlags });
      setNewName('');
      setNewFlags({ is_routable: false, is_sellable: false, is_asset: false, is_supply: false });
      setCreateOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: ItemType) => {
    setEditItem(item);
    setEditName(item.name);
    setEditFlags({ is_routable: item.is_routable, is_sellable: item.is_sellable, is_asset: item.is_asset, is_supply: item.is_supply });
  };

  const handleEdit = async () => {
    if (!editItem || !editName.trim()) return;
    setSaving(true);
    try {
      await updateItemType({ id: editItem.id, name: editName.trim(), ...editFlags });
      setEditItem(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const linked = await checkLinkedItems(id);
    if (linked.length > 0) {
      toast({
        title: 'Cannot delete',
        description: `${linked.length} items are currently using this type.`,
        variant: 'destructive',
      });
      return;
    }
    await deleteItemType(id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Item Types</CardTitle>
          <CardDescription>Configure workflow behavior for inventory categories</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" /> Create Item Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Item Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Accessory" />
              </div>
              {FLAG_COLUMNS.map((f) => (
                <div key={f.key} className="flex items-center justify-between">
                  <Label>{f.label}</Label>
                  <Switch
                    checked={newFlags[f.key]}
                    onCheckedChange={(v) => setNewFlags((prev) => ({ ...prev, [f.key]: v }))}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!newName.trim() || saving}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {FLAG_COLUMNS.map((f) => (
                    <TableHead key={f.key} className="text-center">{f.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    {FLAG_COLUMNS.map((f) => (
                      <TableCell key={f.key} className="text-center">
                        <Switch
                          checked={item[f.key]}
                          onCheckedChange={(v) => updateItemTypeFlag({ id: item.id, flag: f.key, value: v })}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this item type. Items using it will need reassignment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            {FLAG_COLUMNS.map((f) => (
              <div key={f.key} className="flex items-center justify-between">
                <Label>{f.label}</Label>
                <Switch
                  checked={editFlags[f.key]}
                  onCheckedChange={(v) => setEditFlags((prev) => ({ ...prev, [f.key]: v }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleEdit} disabled={!editName.trim() || saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
