-- Drizzle migration UP: Task Notification Levels (L1..L4)
-- Migration: 2026-02-14 19:30:00 UTC

CREATE TABLE IF NOT EXISTS task_notification_global_policy (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  level_default integer NOT NULL DEFAULT 1,
  repeat_interval_minutes integer NOT NULL DEFAULT 5,
  max_retries integer NOT NULL DEFAULT 3,
  escalation_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start varchar(5),
  quiet_hours_end varchar(5),
  channels_json jsonb NOT NULL DEFAULT '{"inApp":true,"webPush":false,"mobilePush":false,"parentEscalation":false}'::jsonb,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_notification_child_policy (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id varchar NOT NULL UNIQUE REFERENCES children(id) ON DELETE CASCADE,
  level integer NOT NULL,
  repeat_interval_minutes integer NOT NULL,
  max_retries integer NOT NULL,
  escalation_enabled boolean NOT NULL,
  quiet_hours_start varchar(5),
  quiet_hours_end varchar(5),
  channels_json jsonb NOT NULL,
  is_override boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS child_push_subscriptions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id varchar NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  platform varchar(20) NOT NULL,
  endpoint text,
  token text,
  p256dh text,
  auth text,
  device_id text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_push_subscriptions_child_active
ON child_push_subscriptions(child_id, is_active);

CREATE TABLE IF NOT EXISTS task_notification_delivery_attempts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id varchar REFERENCES tasks(id) ON DELETE SET NULL,
  child_id varchar NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  channel varchar(20) NOT NULL,
  attempt_no integer NOT NULL DEFAULT 1,
  status varchar(20) NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamp,
  next_retry_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_notification_attempts_task_child_time
ON task_notification_delivery_attempts(task_id, child_id, created_at);

CREATE INDEX IF NOT EXISTS idx_task_notification_attempts_status_retry
ON task_notification_delivery_attempts(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_outbox_status_available_created
ON outbox_events(status, available_at, created_at);

INSERT INTO task_notification_global_policy (
  level_default,
  repeat_interval_minutes,
  max_retries,
  escalation_enabled,
  channels_json
)
SELECT 1, 5, 3, false, '{"inApp":true,"webPush":false,"mobilePush":false,"parentEscalation":false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM task_notification_global_policy);
