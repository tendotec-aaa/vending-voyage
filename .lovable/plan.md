

## Assembly Workflow & Operator Warehouse Restrictions

### Current State
- The Warehouse page already has role-based button visibility, but operators still see `AddWarehouseItemDialog` (line 103)
- A full `NewAssembly` page exists at `/warehouse/assembly/new` but is only accessible to admins (`canManageFull`)
- The `useAssemblies` hook handles the full assembly logic (inventory depletion, FIFO, ledger entries)
- i18n is set up with `es.json` and `en.json`

### Changes

#### 1. Remove "Add Item" button for non-admins
In `Warehouse.tsx`, remove lines 102-104 where operators get `AddWarehouseItemDialog`. Only admins (and accountants with appropriate access) should create inventory from nothing.

#### 2. Add "Assemble" button for all roles
Add an "Ensamblar Mercadería" button visible to admin, operators, and warehouse managers that navigates to `/warehouse/assembly/new`. The existing `NewAssembly` page already has the full workflow (select finished good, select components, enter quantity, validate stock, submit).

Current code only shows "New Assembly" for `canManageFull` (admin only). Change this so the assembly button is available to all non-accountant roles.

#### 3. Simplify assembly page for non-admin roles
For operators/warehouse managers, hide the "New Item" toggle and category/subcategory/item-type creation — they should only "Link Existing" products. The "New Item" creation path stays admin-only.

#### 4. i18n translations
Add translation keys for the assembly workflow:

**es.json additions:**
```json
"warehouse": {
  "title": "Gestión de Bodega",
  "assemble": "Ensamblar Mercadería",
  "newAssembly": "Orden de Ensamble",
  "assemblyComplete": "Ensamblaje completado"
}
```

**en.json additions:**
```json
"warehouse": {
  "title": "Warehouse Management",
  "assemble": "Assemble Items",
  "newAssembly": "New Assembly",
  "assemblyComplete": "Assembly completed"
}
```

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Warehouse.tsx` | Remove operator `AddWarehouseItemDialog`, add "Ensamblar" button for non-accountant roles |
| `src/pages/NewAssembly.tsx` | Hide "New Item" toggle for non-admin roles (force "Link Existing"), add `useTranslation` |
| `src/i18n/es.json` | Add warehouse/assembly translation keys |
| `src/i18n/en.json` | Add warehouse/assembly translation keys |

