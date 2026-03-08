

## Transitional Warehouses (Vehicles) & Unload Workflow

No database migrations needed. The `is_transitional` column and `unload_vehicle` RPC already exist.

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/warehouse/UnloadVehicleDialog.tsx` | Modal with destination bodega dropdown, calls `unload_vehicle` RPC |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/warehouse/CreateWarehouseDialog.tsx` | Add `is_transitional` Switch toggle; pass value through `onCreate` |
| `src/hooks/useWarehouseInventory.tsx` | Update `Warehouse` interface to include `is_transitional`; update `createWarehouse` mutation to accept `is_transitional`; add `unloadVehicle` mutation calling `supabase.rpc('unload_vehicle', ...)` that invalidates `warehouse-inventory` and `inventory_ledger` caches |
| `src/pages/Warehouse.tsx` | Split warehouse selector into 3 groups: standard bodegas, transitional vehicles (with `Truck` icon), system warehouses; render `UnloadVehicleDialog` button when selected warehouse `is_transitional === true` |
| `src/pages/NewVisitReport.tsx` | Replace auto-selecting first warehouse as `sourceWarehouseId` with two dropdowns: "Refill Source" (non-transitional, non-system) and "Return Vehicle" (transitional only, required when visit involves collection/swap); send `returnWarehouseId` in payload |
| `supabase/functions/submit-visit-report/index.ts` | Accept `returnWarehouseId` in `VisitPayload`; route all removal/swap-out warehouse ledger entries to `returnWarehouseId` instead of `sourceWarehouseId`; refill entries still use `sourceWarehouseId` |

### Implementation Details

**1. CreateWarehouseDialog** — Add `is_transitional` boolean state (default `false`), render a `Switch` + `Label` ("Is Transitional Vehicle?") between the description field and the button row. Pass it through `onCreate`.

**2. useWarehouseInventory** — Expand `Warehouse` type with `is_transitional: boolean`. Fetch it in the warehouses query (`is_transitional`). Update `createWarehouse` mutation to insert `is_transitional`. Add `unloadVehicleMutation`:
```
supabase.rpc('unload_vehicle', { 
  p_vehicle_id, p_destination_warehouse_id, p_user_id 
})
```
On success: invalidate `warehouse-inventory`, toast success.

**3. UnloadVehicleDialog** — Props: `vehicleId`, `vehicleName`, `warehouses` (filtered to non-transitional, non-system), `onUnload` callback, `isUnloading`. Modal with a `Select` dropdown for destination bodega. Submit calls `onUnload(destinationId)`.

**4. Warehouse Page** — Partition `userWarehouses` into `standardWarehouses` (`!is_transitional`) and `vehicleWarehouses` (`is_transitional`). Render vehicle buttons with a `Truck` icon. When a transitional warehouse is selected, show `UnloadVehicleDialog` button in the actions area.

**5. Visit Report Form** — Split warehouse query into two: one for `is_transitional = false, is_system = false` (refill source bodegas) and one for `is_transitional = true` (return vehicles). Add "Return Vehicle" dropdown in the form header section, required when `visitType` involves collection/swap (all types except `installation`). Send `returnWarehouseId` in the payload alongside `sourceWarehouseId`.

**6. Edge Function** — Add `returnWarehouseId` to `VisitPayload` interface. In Step 5 (normal flow), change the removal warehouse ledger entry (line ~596-609) to use `returnWarehouseId` instead of `sourceWarehouseId`. In swap flow, change the swap-out return to warehouse (line ~420-433) to use `returnWarehouseId`. Refill entries continue using `sourceWarehouseId`. Fall back to `sourceWarehouseId` if `returnWarehouseId` is null for backward compatibility.

