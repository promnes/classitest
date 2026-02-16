export const NOTIFICATION_TYPES = {
  POINTS_EARNED: "points_earned",
  REWARD_UNLOCKED: "reward_unlocked",
  PRODUCT_ASSIGNED: "product_assigned",
  TASK_REMINDER: "task_reminder",
  TASK_ASSIGNED: "task",
  TASK_ASSIGNED_ALT: "task_assigned",
  TASK_COMPLETED: "task_completed",
  ACHIEVEMENT: "achievement",
  DAILY_CHALLENGE: "daily_challenge",
  GOAL_PROGRESS: "goal_progress",
  INFO: "info",
  GIFT_UNLOCKED: "gift_unlocked",
  GIFT_ACTIVATED: "gift_activated",
  CHILD_LINKED: "child_linked",
  CHILD_LOGOUT: "child_logout",
  CHILD_ACTIVITY: "child_activity",
  LOW_POINTS_WARNING: "low_points_warning",
  LOGIN_REJECTED: "login_rejected",
  LOGIN_CODE_REQUEST: "login_code_request",
  TASK_NOTIFICATION_ESCALATION: "task_notification_escalation",
  DEPOSIT_REQUEST: "deposit_request",
  DEPOSIT_APPROVED: "deposit_approved",
  DEPOSIT_REJECTED: "deposit_rejected",
  PURCHASE_REQUEST: "purchase_request",
  PURCHASE_PAID: "purchase_paid",
  PURCHASE_APPROVED: "purchase_approved",
  PURCHASE_REJECTED: "purchase_rejected",
  SHIPMENT_REQUESTED: "shipment_requested",
  SHIPPING_UPDATE: "shipping_update",
  POINTS_ADJUSTMENT: "points_adjustment",
  SECURITY_ALERT: "security_alert",
  NEW_REFERRAL: "new_referral",
  REFERRAL_REWARD: "referral_reward",
  REWARD: "reward",
  ORDER_PLACED: "order_placed",
  ORDER_CONFIRMED: "order_confirmed",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
  ORDER_REJECTED: "order_rejected",
  WITHDRAWAL_APPROVED: "withdrawal_approved",
  WITHDRAWAL_REJECTED: "withdrawal_rejected",
  BROADCAST: "broadcast",
  SYSTEM_ALERT: "system_alert",
  NEW_REGISTRATION: "new_registration",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_STYLES = {
  TOAST: "toast",
  MODAL: "modal",
  BANNER: "banner",
  FULLSCREEN: "fullscreen",
} as const;

export type NotificationStyle = (typeof NOTIFICATION_STYLES)[keyof typeof NOTIFICATION_STYLES];

export const NOTIFICATION_PRIORITIES = {
  NORMAL: "normal",
  WARNING: "warning",
  URGENT: "urgent",
  BLOCKING: "blocking",
} as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[keyof typeof NOTIFICATION_PRIORITIES];
