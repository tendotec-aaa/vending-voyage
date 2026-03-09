

## Global i18n Refactor — Replace All Hardcoded Strings

### Scope
~35+ files with hardcoded English strings need migration to `t()` calls. The i18n infrastructure is already working (`i18n/index.ts` with `lng: 'es'`). This plan covers every page and component with UI text.

### Approach
Add `useTranslation` + `t()` to every file with hardcoded strings. Create new translation keys organized by page/feature namespace. Both `en.json` and `es.json` updated in parallel.

### Translation Dictionary Additions

New namespaces to add (beyond existing `sidebar`, `common`, `dashboard`, `quickActions`, `operatorDashboard`, `settings`, `profitability`, `reconciliation`, `months`, `warehouse`):

| Namespace | Coverage |
|-----------|----------|
| `visits` | Visits list page, filters, table headers, reverse dialog, status badges |
| `visitReport` | NewVisitReport form — all labels, placeholders, validation toasts, visit types, jam statuses, severity options, performance grade modal, swap phases, observations, sign-off |
| `routes` | Routes list page, create dialog, delete confirm |
| `maintenance` | Maintenance page — title, badges, work orders, empty state |
| `locations` | Locations page — title, create dialog, all form fields, spot assignment |
| `spots` | Spots analytics page — filters, date ranges, tabs |
| `suppliers` | Suppliers page — title, add button, table headers |
| `purchases` | Purchases page — title, filters, table headers, status labels |
| `sales` | Sales page — title, table headers |
| `machines` | Machines page — title, create dialog, filters, table headers |
| `inventory` | Inventory page labels |
| `auth` | Login/Signup pages |
| `warehouseDialogs` | CreateWarehouseDialog, AddWarehouseItemDialog, UnloadVehicleDialog |

### Key Guayaquil Terminology

| English | Spanish |
|---------|---------|
| Visit Report | Reporte de Visita |
| Slot Inventory | Inventario de Ranuras |
| Units Sold | Unidades Vendidas |
| Units Refilled | Unidades Rellenadas |
| Units Removed | Unidades Retiradas |
| False Coins | Monedas Falsas |
| Jam Status | Estado de Atasco |
| Current Stock | Stock Actual |
| Last Stock | Stock Anterior |
| Capacity | Capacidad |
| Toy | Juguete |
| Assign Toy | Asignar Juguete |
| Replace all toys | Reemplazar todos los juguetes |
| Swap Evidence Photo | Foto de Evidencia de Cambio |
| Report Issue | Reportar Problema |
| Severity | Gravedad |
| Observations | Observaciones |
| Photo & Sign Off | Foto y Firma |
| Submit Report | Enviar Reporte |
| Save Draft | Guardar Borrador |
| Work Order | Orden de Trabajo |
| Surplus | Excedente |
| Shortage | Faltante |
| Closing Out | Cerrando |
| New Product Setup | Configuración de Nuevo Producto |
| Performance Grade | Calificación de Desempeño |
| Above Average | Por Encima del Promedio |
| Below Average | Por Debajo del Promedio |
| Cash Collected | Efectivo Recaudado |
| Slots Serviced | Ranuras Atendidas |
| Issues Flagged | Problemas Reportados |
| Tickets Created | Tickets Creados |
| Low Stock | Stock Bajo |
| In Stock | En Stock |
| All Warehouses | Todas las Bodegas |
| All Categories | Todas las Categorías |
| Create Warehouse | Crear Bodega |
| New Warehouse | Nueva Bodega |
| Is Transitional Vehicle? | ¿Es Vehículo de Tránsito? |
| Routine Service | Servicio Rutinario |
| Installation | Instalación |
| Inventory Audit | Auditoría de Inventario |
| Maintenance | Mantenimiento |
| Emergency | Emergencia |
| No Jam | Sin Atasco |
| With Coins | Con Monedas |
| Without Coins | Sin Monedas |
| By Coin (+1) | Por Moneda (+1) |

### Files to Modify

**Priority 1 — Operator-facing (field workers use these daily):**

| File | Hardcoded strings count |
|------|------------------------|
| `src/pages/NewVisitReport.tsx` | ~100+ strings (visit types array, jam statuses, severity options, all labels, placeholders, toasts, dialogs, performance modal) |
| `src/pages/Visits.tsx` | ~30 strings (page title, table headers, filters, reverse dialog, status badges) |
| `src/components/warehouse/CreateWarehouseDialog.tsx` | ~10 strings |
| `src/components/warehouse/AddWarehouseItemDialog.tsx` | ~10 strings |
| `src/components/warehouse/UnloadVehicleDialog.tsx` | ~5 strings |

**Priority 2 — Admin pages:**

| File | Hardcoded strings count |
|------|------------------------|
| `src/pages/Routes.tsx` | ~15 strings |
| `src/pages/Maintenance.tsx` | ~15 strings |
| `src/pages/Locations.tsx` | ~40 strings |
| `src/pages/Spots.tsx` | ~15 strings |
| `src/pages/Suppliers.tsx` | ~10 strings |
| `src/pages/Purchases.tsx` | ~15 strings |
| `src/pages/Sales.tsx` | ~10 strings |
| `src/pages/Machines.tsx` | ~20 strings |
| `src/pages/Login.tsx` | ~10 strings |
| `src/pages/Signup.tsx` | ~10 strings |

**Priority 3 — Supporting components & detail pages:**

| File | Notes |
|------|-------|
| `src/components/maintenance/MaintenanceStats.tsx` | Stats labels |
| `src/components/maintenance/TicketCard.tsx` | Card labels |
| `src/components/maintenance/NewWorkOrderDialog.tsx` | Form labels |
| `src/components/spots/SpotLeaderboard.tsx` | Column headers |
| `src/components/spots/SpotAlerts.tsx` | Alert text |
| `src/components/suppliers/SupplierFormDialog.tsx` | Form labels |
| `src/components/inventory/ReceiveStockDialog.tsx` | Form labels |
| `src/components/inventory/WarehouseSaleDialog.tsx` | Form labels |
| `src/pages/RouteDetail.tsx` | Detail page labels |
| `src/pages/SpotDetail.tsx` | Detail page labels |
| `src/pages/ItemDetail.tsx` | Detail page labels |
| `src/pages/VisitDetail.tsx` | Detail page labels |
| `src/pages/Inventory.tsx` | Page labels |
| `src/pages/Analytics.tsx` | Page labels |
| `src/pages/ItemAnalytics.tsx` | Page labels |
| `src/pages/SpotHealth.tsx` | Page labels |
| `src/pages/AdminOperators.tsx` | Page labels |
| `src/pages/AdminSecurity.tsx` | Page labels |
| `src/pages/CompanyProfile.tsx` | Page labels |
| `src/pages/Users.tsx` | Page labels |
| `src/pages/UserDetail.tsx` | Page labels |
| `src/pages/Onboarding.tsx` | Page labels |
| `src/pages/NotFound.tsx` | 404 text |
| All remaining detail pages | Headers and labels |

### Implementation Strategy

Given the volume (~35+ files, ~400+ strings), implementation will proceed in batches:

1. **Batch 1**: Expand `en.json` and `es.json` with ALL new namespaces and keys
2. **Batch 2**: NewVisitReport.tsx (largest file, most operator-facing)
3. **Batch 3**: Visits.tsx, Routes.tsx, Maintenance.tsx, Warehouse dialogs
4. **Batch 4**: Locations.tsx, Spots.tsx, Machines.tsx
5. **Batch 5**: Suppliers.tsx, Purchases.tsx, Sales.tsx, Login.tsx, Signup.tsx
6. **Batch 6**: All remaining detail pages and sub-components

### Config Verification

`src/i18n/index.ts` already has `lng: 'es'` — confirmed correct. Language switcher in Settings already calls `i18n.changeLanguage()` with localStorage persistence — confirmed correct.

