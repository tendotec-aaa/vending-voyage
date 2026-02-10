

# Fix: Grant Table Permissions for All Public Tables

## Problem

The error "permission denied for table locations" is caused by missing **GRANT** statements. Every table in the `public` schema has RLS policies configured, but none of them have the underlying PostgreSQL **table-level privileges** granted to the `anon` and `authenticated` roles.

RLS policies control *which rows* a user can see/modify, but the database role must first have permission to access the table at all via GRANT.

## Affected Tables

Every table in the project is affected. No authenticated user can INSERT, UPDATE, or DELETE on any table:

- `locations`, `spots`, `setups`
- `machines`, `machine_slots`
- `inventory`, `item_details`
- `purchases`, `purchase_items`, `purchase_line_fees`, `purchase_global_fees`
- `warehouses`
- `maintenance_tickets`
- `spot_visits`, `visit_line_items`
- `categories`, `subcategories`
- `suppliers`
- `company_info`
- `user_profiles`, `user_roles`
- `receiving_notes`, `receiving_allocations`

## Fix

A single database migration that grants `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges on all public tables to both the `anon` and `authenticated` roles. The existing RLS policies will continue to enforce row-level access control (e.g., admin-only writes on `company_info`, own-profile access on `user_profiles`).

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
```

This is a standard Supabase pattern -- the GRANT allows the role to "reach" the table, and RLS policies then filter what they can actually do.

## Technical Details

- **No code changes required** -- only a single SQL migration
- **No security risk** -- RLS is already enabled on all tables with appropriate policies
- **One statement** fixes all current and prevents this issue for existing tables

