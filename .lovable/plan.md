

# Plan: Multi-Feature Update -- Detail Pages, List Views, Bug Fixes, and SKU Logic

This plan covers 8 distinct changes across the application. Due to the scope, each is described as a discrete task.

---

## 1. Location Form: Add Contract Start/End Date Fields

**Problem**: The location creation form is missing contract date fields, even though the `locations` table already has `contract_start_date`, `contract_end_date`, and `contract_term` columns.

**Changes**:
- **`src/pages/Locations.tsx`**: Add two date pickers (Contract Start Date, Contract End Date) and a Contract Term dropdown (`indefinite`, `fixed`, etc.) to the "Create New Location" dialog. Wire them into the `createLocation` mutation.

---

## 2. Spots Analytics: Divide Rent by Number of Spots + Rename Column

**Problem**: Each spot shows the full location rent instead of dividing it among sibling spots. Column says "Net Profit" but should say "Sales - Rent".

**Changes**:
- **`src/hooks/useSpotAnalytics.tsx`**: 
  - Count how many spots belong to each location.
  - Divide `location.rent_amount` by that count to get per-spot rent.
  - Rename the `netProfit` field to `salesMinusRent` (or keep the field but fix the label).

- **`src/components/spots/SpotLeaderboard.tsx`**: Rename column header from "Net Profit" to "Sales - Rent". Update any references.

- **`src/components/spots/TopPerformerCard.tsx`**: Update label from "Net Profit" to "Sales - Rent".

- **`src/components/spots/SpotAlerts.tsx`**: Update any "Net Profit" labels.

---

## 3. Suppliers: List View + Detail Page

**Problem**: Suppliers currently uses a card grid. Needs a table/list view and a detail page for editing.

**Changes**:
- **`src/pages/Suppliers.tsx`**: Replace card grid with a table (name, country, email, phone, lead time). Each row is clickable and navigates to `/suppliers/:id`.

- **New file `src/pages/SupplierDetail.tsx`**: 
  - Fetches single supplier by ID from URL params.
  - View/Edit mode (same pattern as UserProfile/CompanyProfile).
  - Editable fields: name, contact email, phone, country, lead time, tax ID.
  - Delete button with confirmation.
  - Back button to `/suppliers`.

- **`src/App.tsx`**: Add route `/suppliers/:id` pointing to `SupplierDetail`.

---

## 4. Purchases: List View + Detail Page + SKU Logic + Product Link Fixes

This is the largest section. Broken into sub-parts:

### 4a. Purchase List Page (`src/pages/Purchases.tsx`)
- Replace card grid with a filterable table/list view.
- Columns: PO Number, Supplier, Type, Status, Items, Total, Date.
- Filter by status (dropdown), search by PO number or supplier.
- Each row clickable, navigates to `/purchases/:id`.

### 4b. Purchase Detail Page (new `src/pages/PurchaseDetail.tsx`)
- Fetches purchase by ID with all related data (items, global fees, line fees, supplier).
- Shows order info header (PO number, supplier, type, status, dates, currency, tax rate).
- Status button to advance status: draft -> pending -> in_transit -> received (or cancel). Disabled once received.
- Line items section with all items, quantities, costs, fees. Editable until status = "received".
- Global fees section, editable until received.
- Ability to add/remove line items and fees until received.
- Cost summary with landed cost breakdown.
- Uses existing `usePurchases` hook, extended with single-purchase fetch and update mutations.

### 4c. SKU Auto-Generation Logic
- When creating a new item on a purchase line, the SKU is auto-generated using the format: `{CategoryCode}-{SubcategoryCode}-{SequentialID}`.
- Category code: First 2-3 chars uppercase of category name (e.g., "Maquinas Vending" -> "MV"). Use first letter of each word, max 3 chars.
- Subcategory code: Same logic (e.g., "Juguetes Capsulas" -> "JC").
- Sequential ID: Count of existing `item_details` rows + 1, zero-padded to 6 digits.
- SKU field is read-only (not editable by user).
- Applied in `src/pages/NewPurchase.tsx` and `src/pages/PurchaseDetail.tsx`.

### 4d. Product Link Behavior Fixes (`src/pages/NewPurchase.tsx` and `PurchaseDetail.tsx`)
- When a product is selected in "Link to Product", auto-fill the item name and make it read-only.
- Add a clear/remove button (X icon) next to the product select to unlink and allow creating a new item.
- If product is linked, item name comes from the product and cannot be edited.
- If product is unlinked, item name becomes editable again.

### 4e. Hook Updates (`src/hooks/usePurchases.tsx`)
- Add `usePurchaseDetail(id)` query to fetch a single purchase with all nested data.
- Add `updatePurchaseMutation` for editing purchase details.
- Add `addLineItemMutation`, `removeLineItemMutation`, `updateLineItemMutation`.
- Add `addGlobalFeeMutation`, `removeGlobalFeeMutation`, `updateGlobalFeeMutation`.

**Routing**:
- **`src/App.tsx`**: Add `/purchases/:id` route pointing to `PurchaseDetail`.

---

## 5. Users: Detail Page (Admin Only)

**Problem**: No way to view a user's full profile info from the admin Users page.

**Changes**:
- **New file `src/pages/UserDetail.tsx`**:
  - Admin-only page (wrapped in `AdminOnly` or `RequireRole`).
  - Fetches user profile by ID from URL params.
  - Shows all user info in read-only cards: personal info, employment, driver's license, emergency contact.
  - Role badge, active status.
  - Admin can edit role and toggle active status inline.
  - Back button to `/users`.

- **`src/pages/Users.tsx`**: Make each row clickable, navigate to `/users/:id`.

- **`src/App.tsx`**: Add route `/users/:id` pointing to `UserDetail`, wrapped in `ProtectedRoute`.

---

## 6. Machines: Fix Model Select (Empty List Bug)

**Problem**: The "Select a model" dropdown is blank because it filters `item_details` by `selectedCategoryId`, but the category may not be pre-selected or may not have items.

**Root Cause**: The `selectedCategoryId` defaults to empty string. Even when "Machines" category is found, the query only runs when `selectedCategoryId` is truthy. The `handleDialogOpen` sets it, but the initial `machinesCategory` lookup depends on categories being loaded.

**Changes**:
- **`src/pages/Machines.tsx`**: 
  - Use a `useEffect` to set `selectedCategoryId` when `machinesCategory` loads (instead of only on dialog open).
  - If no category exists yet, show all items as fallback models.
  - Ensure the models query re-fetches when category ID changes.

---

## 7. Location Detail Page (Admin Editable)

**Changes**:
- **New file `src/pages/LocationDetail.tsx`**:
  - Fetches location by ID with its spots.
  - View/edit mode for admin users.
  - Editable fields: name, address, contact info, negotiation type, rent, commission, contract dates, total spots.
  - Shows list of spots belonging to this location with their assigned setups.
  - Back button to `/locations`.

- **`src/pages/Locations.tsx`**: Make location cards clickable, navigate to `/locations/:id`.

- **`src/App.tsx`**: Add route `/locations/:id`.

---

## 8. Spot Detail Page (Admin Editable)

**Changes**:
- **New file `src/pages/SpotDetail.tsx`**:
  - Fetches spot by ID with its location, setups, machines, and visit history.
  - View/edit mode for admin users.
  - Editable fields: name, description, status.
  - Shows assigned setup, machines, recent visits, stock levels.
  - Per-spot rent calculation (location rent / number of sibling spots).
  - Back button.

- **`src/components/spots/SpotLeaderboard.tsx`**: Update row click to navigate to `/spots/:id` instead of `/locations`.

- **`src/App.tsx`**: Add route `/spots/:id`.

---

## Files Summary

### New Files (8)
| File | Purpose |
|------|---------|
| `src/pages/SupplierDetail.tsx` | Supplier detail/edit page |
| `src/pages/PurchaseDetail.tsx` | Purchase order detail/edit page |
| `src/pages/UserDetail.tsx` | Admin-only user detail view |
| `src/pages/LocationDetail.tsx` | Location detail/edit page |
| `src/pages/SpotDetail.tsx` | Spot detail/edit page |
| `src/hooks/usePurchaseDetail.tsx` | Hook for single purchase CRUD |
| `src/hooks/useLocationDetail.tsx` | Hook for single location fetch/update |
| `src/lib/skuGenerator.ts` | SKU generation utility function |

### Modified Files (11)
| File | Changes |
|------|---------|
| `src/App.tsx` | Add 5 new routes |
| `src/pages/Suppliers.tsx` | Card grid -> table list view |
| `src/pages/Purchases.tsx` | Card grid -> filterable table list view |
| `src/pages/NewPurchase.tsx` | SKU auto-gen, product link fixes |
| `src/pages/Users.tsx` | Clickable rows to user detail |
| `src/pages/Locations.tsx` | Add contract date fields, clickable cards |
| `src/pages/Machines.tsx` | Fix model select empty state |
| `src/hooks/useSpotAnalytics.tsx` | Divide rent by spot count |
| `src/hooks/usePurchases.tsx` | Add single purchase query + mutations |
| `src/components/spots/SpotLeaderboard.tsx` | Rename "Net Profit" -> "Sales - Rent", link to spot detail |
| `src/components/spots/TopPerformerCard.tsx` | Rename label |

---

## Implementation Order

1. SKU generator utility (`src/lib/skuGenerator.ts`)
2. Fix Machines model select bug
3. Location form: add contract date fields
4. Spots analytics: rent division + column rename
5. Suppliers list view + detail page
6. Purchases list view + detail page (largest piece)
7. Users detail page
8. Location detail page
9. Spot detail page
10. Route registration in `App.tsx` (all at once)

