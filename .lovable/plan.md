

# Plan: Company Profile Page + `company_info` Database Table

## Summary

Create a new **Company Profile** page accessible under the "Business" sidebar section (alongside Users), backed by a new `company_info` table. Only admin users can edit the company data. All authenticated users can view it.

---

## Database: `company_info` Table

A single-row table holding company-wide settings and legal information.

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | uuid (PK) | No | `gen_random_uuid()` | Primary key |
| `company_name` | text | No | - | Legal business name |
| `trade_name` | text | Yes | - | DBA / brand name (e.g., "Fun Capsules") |
| `tax_id` | text | Yes | - | Tax identification number (RUC, EIN, etc.) |
| `registration_number` | text | Yes | - | Business registration / license number |
| `country` | text | Yes | - | Country of operation |
| `state_province` | text | Yes | - | State or province |
| `city` | text | Yes | - | City |
| `address` | text | Yes | - | Full street address |
| `postal_code` | text | Yes | - | ZIP / postal code |
| `phone` | text | Yes | - | Main business phone |
| `email` | text | Yes | - | Main business email |
| `website` | text | Yes | - | Company website URL |
| `default_currency` | text | Yes | `'USD'` | Default operating currency |
| `logo_url` | text | Yes | - | Company logo (future use) |
| `notes` | text | Yes | - | Internal notes |
| `created_at` | timestamptz | No | `now()` | Record creation |
| `updated_at` | timestamptz | Yes | `now()` | Last update timestamp |

### RLS Policies

- **SELECT**: All authenticated users can read (`auth.role() = 'authenticated'`)
- **INSERT**: Admin only (`has_role(auth.uid(), 'admin')`)
- **UPDATE**: Admin only (`has_role(auth.uid(), 'admin')`)
- **DELETE**: Admin only (`has_role(auth.uid(), 'admin')`)

### Trigger

- `update_updated_at_column` trigger on UPDATE to auto-set `updated_at`

---

## Page Layout: `/company`

### Header Section
- Company name as page title
- Trade name as subtitle
- "Edit" button (visible to admins only, using `AdminOnly` component)

### Card Sections (similar pattern to UserProfile page)

**1. General Information**
- Company Name (required)
- Trade Name / DBA
- Tax ID
- Registration Number

**2. Contact Information**
- Phone
- Email
- Website

**3. Address**
- Country
- State / Province
- City
- Street Address
- Postal Code

**4. Preferences**
- Default Currency (dropdown: USD, EUR, etc.)

**5. Notes**
- Free-text internal notes field

### Behavior
- Page loads existing `company_info` row (or shows empty state with "Set Up Company" prompt)
- View mode by default; "Edit" button toggles to edit mode (admin only)
- Non-admin users see read-only view
- Uses same edit/save/cancel pattern as the UserProfile page
- If no company record exists yet, admin sees a form to create one

---

## Navigation Changes

### Sidebar: Business section

Current:
- Users -> `/users`

Updated:
- Users -> `/users`
- Company -> `/company`

### App.tsx

Add route:
```text
/company -> <CompanyProfile /> (wrapped in ProtectedRoute)
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/CompanyProfile.tsx` | Company profile page with view/edit modes |
| `src/hooks/useCompanyInfo.tsx` | Hook to fetch and update company_info |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/company` route |
| `src/components/layout/AppSidebar.tsx` | Add "Company" item to Business section |

## Migration

Single migration to:
1. Create `company_info` table with all columns
2. Enable RLS
3. Create RLS policies (read for all authenticated, write for admin only)
4. Attach `update_updated_at_column` trigger

---

## Implementation Order

1. Run database migration to create `company_info` table with RLS
2. Create `useCompanyInfo` hook (fetch single row, upsert mutation)
3. Create `CompanyProfile.tsx` page with view/edit card layout
4. Update `AppSidebar.tsx` to add Company nav item
5. Update `App.tsx` to add `/company` route

