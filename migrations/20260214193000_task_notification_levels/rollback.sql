-- Drizzle migration DOWN: Task Notification Levels (L1..L4)
-- Migration: 2026-02-14 19:30:00 UTC

DROP INDEX IF EXISTS idx_outbox_status_available_created;
DROP INDEX IF EXISTS idx_task_notification_attempts_status_retry;
DROP INDEX IF EXISTS idx_task_notification_attempts_task_child_time;
DROP TABLE IF EXISTS task_notification_delivery_attempts;
DROP INDEX IF EXISTS idx_child_push_subscriptions_child_active;
DROP TABLE IF EXISTS child_push_subscriptions;
DROP TABLE IF EXISTS task_notification_child_policy;
DROP TABLE IF EXISTS task_notification_global_policy;
