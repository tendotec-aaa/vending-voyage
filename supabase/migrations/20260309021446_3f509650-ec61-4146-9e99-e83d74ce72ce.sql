
-- Enum for notification types
CREATE TYPE public.notification_type AS ENUM ('alert', 'operation', 'system');

-- Core table: per-user notification rows (fan-out model)
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

-- Index for fast user queries
CREATE INDEX idx_system_notifications_user_id ON public.system_notifications(user_id);
CREATE INDEX idx_system_notifications_user_unread ON public.system_notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: users see only their own notifications
CREATE POLICY "Users can select own notifications"
  ON public.system_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.system_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert notifications"
  ON public.system_notifications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete notifications"
  ON public.system_notifications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Fan-out function 1: send notification to all users with a given role + all admins
CREATE OR REPLACE FUNCTION public.create_role_notification(
  p_role_name text,
  p_title text,
  p_message text,
  p_type notification_type DEFAULT 'system',
  p_link_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO system_notifications (user_id, title, message, type, link_url)
  SELECT DISTINCT sub.user_id, p_title, p_message, p_type, p_link_url
  FROM (
    SELECT ua.user_id
    FROM user_assignments ua
    JOIN app_roles ar ON ar.id = ua.role_id
    WHERE ar.name = p_role_name
    UNION
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
  ) sub;
END;
$$;

-- Fan-out function 2: send notification to a specific user
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
