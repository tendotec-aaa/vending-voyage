

## Smart Notification Hub with Role-Targeting Distribution Engine

### 1. Database Migration

**Enum + Table:**
```sql
CREATE TYPE public.notification_type AS ENUM ('alert', 'operation', 'system');

CREATE TABLE public.system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  link_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
```

Note: `user_id` is NOT NULL here. The fan-out functions always create per-user rows, so we never need nullable user_id or role_id columns. This simplifies RLS to a single clean policy.

**RLS Policies:**
- SELECT: `user_id = auth.uid()`
- UPDATE: `user_id = auth.uid()` (mark read)
- INSERT: `has_role(auth.uid(), 'admin')` (only admins/functions insert)
- DELETE: `has_role(auth.uid(), 'admin')`

**Fan-Out Function 1 — `create_role_notification`:**
```sql
CREATE OR REPLACE FUNCTION public.create_role_notification(
  p_role_name text,
  p_title text,
  p_message text,
  p_type notification_type DEFAULT 'system',
  p_link_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO system_notifications (user_id, title, message, type, link_url)
  SELECT DISTINCT ua.user_id, p_title, p_message, p_type, p_link_url
  FROM user_assignments ua
  JOIN app_roles ar ON ar.id = ua.role_id
  WHERE ar.name = p_role_name
  UNION
  -- Auto-include all admins
  SELECT ur.user_id, p_title, p_message, p_type, p_link_url
  FROM user_roles ur
  WHERE ur.role = 'admin';
END;
$$;
```

Uses `UNION` (not `UNION ALL`) to deduplicate when an admin also holds the target role.

**Fan-Out Function 2 — `create_user_notification`:**
```sql
CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type notification_type DEFAULT 'system',
  p_link_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO system_notifications (user_id, title, message, type, link_url)
  VALUES (p_user_id, p_title, p_message, p_type, p_link_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
```

Both functions are `SECURITY DEFINER` so they bypass RLS for inserts, callable from edge functions or client-side RPCs by admins.

### 2. New Files

| File | Purpose |
|------|---------|
| `src/hooks/useNotifications.tsx` | Query notifications, unread count, `markAsRead`, `markAllAsRead` |
| `src/pages/Notifications.tsx` | Full page with Tabs (All/Alerts/Operations/System), date grouping, mark-read actions, deep-linking |
| `src/components/notifications/NotificationBell.tsx` | Bell icon + red unread badge + Popover with 5 recent unread + "View All" link |

### 3. Hook: `useNotifications`

- Fetch from `system_notifications` ordered by `created_at desc`, limit 100
- `unreadCount`: count where `is_read = false`
- `markAsRead(id)`: update `is_read = true`
- `markAllAsRead()`: update all unread to `is_read = true`
- Invalidate `['notifications']` query key on mutations

### 4. Notifications Page (`/notifications`)

- Shadcn Tabs: All | Alerts | Operations | System
- Date grouping: Today, Yesterday, Older (using `date-fns`)
- Each item: icon by type (`TriangleAlert`, `CheckCircle`, `Info`), unread = `bg-muted/50` + bold title
- Click navigates to `link_url` (if present) and marks as read
- "Mark All as Read" button in header

### 5. NotificationBell Component

- Replaces static `<Bell>` in `AppLayout.tsx` header
- Red badge showing unread count (hidden when 0)
- Popover: 5 most recent unread, each clickable
- "View All" link to `/notifications`

### 6. Modified Files

| File | Change |
|------|--------|
| `src/components/layout/AppLayout.tsx` | Replace static Bell button with `<NotificationBell />` |
| `src/App.tsx` | Add `/notifications` route inside `<ProtectedRoute>` |

