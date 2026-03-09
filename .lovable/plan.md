## Admin UI for Item Types & Workflow Logic

### Overview

Add a new "Item Types" tab to the existing `/admin/security` page that provides full CRUD operations for item types with interactive workflow flag toggles.

---

### Implementation

**File: `src/hooks/useItemTypes.tsx**`

Extend the existing hook with:

- `updateItemType` mutation: Update name and/or any flag field (`is_routable`, `is_sellable`, `is_asset`, `is_supply`)
- `updateItemTypeFlag` mutation: Specifically for inline toggle updates (single flag change)

**File: `src/pages/AdminSecurity.tsx**`

Add a third tab alongside "Roles & Permissions" and "User Assignments":

1. **New Tab: "Item Types"** with `Package` icon
2. **ItemTypesTab Component:**
  - Uses `useItemTypes` hook to fetch all item types
  - Displays a Shadcn `Table` with columns:
    - **Name**: Text display (editable via edit dialog)
    - **Routable**: `Switch` component (inline mutation)
    - **Sellable**: `Switch` component (inline mutation)
    - **Asset**: `Switch` component (inline mutation)
    - **Supply**: `Switch` component (inline mutation)
    - **Actions**: Edit and Delete buttons
3. **Create Item Type Dialog:**
  - Name input (required)
  - Four `Switch` toggles for initial flag states
  - "Create" button triggers `createItemType` mutation (extended to accept flags)
4. **Edit Dialog:**
  - Pre-populated with current name and flags
  - "Save" triggers `updateItemType` mutation
5. **Delete Flow:**
  - `AlertDialog` confirmation
  - Before deletion: Call `checkLinkedItems(id)` to verify no items use this type
  - If items exist: Show destructive toast "Cannot delete: X items are currently using this type"
  - If clear: Proceed with `deleteItemType` mutation

---

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Security & Roles                                            │
│ Manage roles, permissions, and user access                  │
├─────────────────────────────────────────────────────────────┤
│ [Roles & Permissions] [User Assignments] [Item Types]       │
├─────────────────────────────────────────────────────────────┤
│ Item Types                     [+ Create Item Type]         │
│ Configure workflow behavior for inventory categories        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name        │ Routable │ Sellable │ Asset │ Supply │Act │ │
│ ├─────────────┼──────────┼──────────┼───────┼────────┼────┤ │
│ │ Merchandise │   [✓]    │   [✓]    │  [ ]  │  [ ]   │ ⚙🗑│ │
│ │ Machine     │   [ ]    │   [ ]    │  [✓]  │  [ ]   │ ⚙🗑│ │
│ │ Spare Part  │   [ ]    │   [ ]    │  [ ]  │  [✓]   │ ⚙🗑│ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### Files Modified


| File                          | Changes                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| `src/hooks/useItemTypes.tsx`  | Add `updateItemTypeFlag` mutation, extend `createItemType` to accept flags |
| `src/pages/AdminSecurity.tsx` | Add `ItemTypesTab` component, new tab trigger                              |


---

### Technical Details

**Flag toggle mutation pattern:**

```typescript
const updateItemTypeFlag = useMutation({
  mutationFn: async ({ id, flag, value }: { id: string; flag: string; value: boolean }) => {
    const { error } = await supabase
      .from("item_types")
      .update({ [flag]: value })
      .eq("id", id);
    if (error) throw error;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["item_types"] }),
});
```

**Delete safety check:**

```typescript
const handleDelete = async (id: string) => {
  const linkedItems = await checkLinkedItems(id);
  if (linkedItems.length > 0) {
    toast({ 
      title: "Cannot delete", 
      description: `${linkedItems.length} items are currently using this type.`,
      variant: "destructive" 
    });
    return;
  }
  await deleteItemType(id);
};
```