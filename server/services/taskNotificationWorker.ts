import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { storage } from "../storage";
import {
  outboxEvents,
  taskNotificationGlobalPolicy,
  taskNotificationChildPolicy,
  taskNotificationDeliveryAttempts,
  childPushSubscriptions,
  parentChild,
  parentPushSubscriptions,
  parentNotificationPreferences,
} from "../../shared/schema";
import { createNotification } from "../notifications";
import { isWebPushReady, sendWebPushNotification } from "./webPushService";
import { isMobilePushReady, sendMobilePushNotification } from "./mobilePushService";
import { NOTIFICATION_PRIORITIES, NOTIFICATION_STYLES, NOTIFICATION_TYPES } from "../../shared/notificationTypes";

const db = storage.db;

const ENABLED = process.env["TASK_NOTIFICATION_WORKER_ENABLED"] !== "false";
const INTERVAL_MS = Number(process.env["TASK_NOTIFICATION_WORKER_INTERVAL_MS"] || "7000");
const BATCH_SIZE = Number(process.env["TASK_NOTIFICATION_WORKER_BATCH_SIZE"] || "20");
const ADVISORY_LOCK_KEY = BigInt(928372);

type OutboxPayload = {
  taskId?: string;
  childId?: string;
  parentId?: string;
  title?: string | null;
  source?: string;
  parentIds?: string[];
  subscriptionIds?: string[];
  message?: string;
  type?: string;
  url?: string;
};

function toMinute(hhmm: string | null): number | null {
  if (!hhmm || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isNowInQuietHours(start: string | null, end: string | null): boolean {
  const startM = toMinute(start);
  const endM = toMinute(end);
  if (startM === null || endM === null) return false;

  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();

  if (startM === endM) return false;
  if (startM < endM) return nowM >= startM && nowM < endM;
  return nowM >= startM || nowM < endM;
}

async function tryAcquireLock(): Promise<boolean> {
  const result = await db.execute(sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) as locked;`);
  const row: any = Array.isArray(result) ? result[0] : (result as any).rows?.[0];
  return !!(row?.locked || row?.pg_try_advisory_lock);
}

async function releaseLock() {
  await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY});`);
}

function mapLevelToStylePriority(level: number) {
  if (level >= 4) return { style: NOTIFICATION_STYLES.FULLSCREEN, priority: NOTIFICATION_PRIORITIES.BLOCKING };
  if (level === 3) return { style: NOTIFICATION_STYLES.MODAL, priority: NOTIFICATION_PRIORITIES.URGENT };
  if (level === 2) return { style: NOTIFICATION_STYLES.BANNER, priority: NOTIFICATION_PRIORITIES.WARNING };
  return { style: NOTIFICATION_STYLES.TOAST, priority: NOTIFICATION_PRIORITIES.NORMAL };
}

async function resolveEffectivePolicy(childId: string) {
  const [globalPolicy] = await db.select().from(taskNotificationGlobalPolicy);
  const [childPolicy] = await db
    .select()
    .from(taskNotificationChildPolicy)
    .where(eq(taskNotificationChildPolicy.childId, childId));

  const defaults = {
    level: Math.max(globalPolicy?.levelDefault ?? 1, 4),
    repeatIntervalMinutes: Math.min(globalPolicy?.repeatIntervalMinutes ?? 5, 1),
    maxRetries: Math.max(globalPolicy?.maxRetries ?? 3, 6),
    escalationEnabled: true,
    channelsJson: (globalPolicy?.channelsJson as any) || {
      inApp: true,
      webPush: true,
      mobilePush: true,
      parentEscalation: true,
    },
  };

  if (!childPolicy) return defaults;

  const childChannels = (childPolicy.channelsJson as any) || {};

  return {
    level: Math.max(childPolicy.level, 4),
    repeatIntervalMinutes: Math.min(childPolicy.repeatIntervalMinutes, 1),
    maxRetries: Math.max(childPolicy.maxRetries, 6),
    escalationEnabled: true,
    channelsJson: {
      ...childChannels,
      inApp: true,
      webPush: true,
      mobilePush: true,
      parentEscalation: true,
    },
  };
}

async function recordAttempt(input: {
  taskId: string | null;
  childId: string;
  channel: string;
  attemptNo: number;
  status: "pending" | "sent" | "failed" | "acknowledged";
  error?: string | null;
  nextRetryAt?: Date | null;
}) {
  await db.insert(taskNotificationDeliveryAttempts).values({
    taskId: input.taskId,
    childId: input.childId,
    channel: input.channel,
    attemptNo: input.attemptNo,
    status: input.status,
    error: input.error || null,
    sentAt: input.status === "sent" ? new Date() : null,
    nextRetryAt: input.nextRetryAt || null,
  });
}

async function sendParentEscalation(childId: string, taskId: string | null, title?: string | null) {
  const links = await db
    .select({ parentId: parentChild.parentId })
    .from(parentChild)
    .where(eq(parentChild.childId, childId));

  for (const link of links) {
    await createNotification({
      parentId: link.parentId,
      type: NOTIFICATION_TYPES.TASK_NOTIFICATION_ESCALATION,
      title: "تصعيد إشعار مهمة",
      message: `تم تصعيد إشعار مهمة للطفل${title ? `: ${title}` : ""}`,
      relatedId: taskId,
      metadata: { childId, taskId, title: title || null },
    });
  }
}

async function handleTaskAssignedNotify(eventRow: typeof outboxEvents.$inferSelect) {
  const payload = (eventRow.payloadJson || {}) as OutboxPayload;
  const childId = payload.childId;
  const taskId = payload.taskId || null;

  if (!childId) {
    throw new Error("MISSING_CHILD_ID");
  }

  const policy = await resolveEffectivePolicy(childId);
  const { style, priority } = mapLevelToStylePriority(policy.level);
  const channels = policy.channelsJson || { inApp: true, webPush: false, mobilePush: false, parentEscalation: false };

  let attemptNo = eventRow.retryCount + 1;

  if (channels.inApp) {
    await createNotification({
      childId,
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: "مهمة جديدة!",
      message: `لديك مهمة جديدة${payload.title ? `: ${payload.title}` : ""}`,
      style,
      priority,
      soundAlert: policy.level >= 3,
      vibration: policy.level >= 3,
      relatedId: taskId,
      metadata: {
        taskId,
        source: payload.source || null,
        notifyLevel: policy.level,
      },
    });

    await recordAttempt({
      taskId,
      childId,
      channel: "in_app",
      attemptNo,
      status: "sent",
    });

    attemptNo += 1;
  }

  if (policy.level >= 4 && (channels.webPush || channels.mobilePush)) {
    let hasAnyPushSuccess = false;

    if (channels.webPush) {
      const webSubs = await db
        .select({
          id: childPushSubscriptions.id,
          endpoint: childPushSubscriptions.endpoint,
          p256dh: childPushSubscriptions.p256dh,
          auth: childPushSubscriptions.auth,
        })
        .from(childPushSubscriptions)
        .where(
          and(
            eq(childPushSubscriptions.childId, childId),
            eq(childPushSubscriptions.isActive, true),
            eq(childPushSubscriptions.platform, "web")
          )
        );

      if (!isWebPushReady()) {
        await recordAttempt({
          taskId,
          childId,
          channel: "web_push",
          attemptNo,
          status: "failed",
          error: "WEB_PUSH_VAPID_NOT_CONFIGURED",
        });
      } else if (webSubs.length === 0) {
        await recordAttempt({
          taskId,
          childId,
          channel: "web_push",
          attemptNo,
          status: "failed",
          error: "NO_ACTIVE_WEB_PUSH_SUBSCRIPTIONS",
        });
      } else {
        for (const sub of webSubs) {
          if (!sub.endpoint || !sub.p256dh || !sub.auth) {
            await recordAttempt({
              taskId,
              childId,
              channel: "web_push",
              attemptNo,
              status: "failed",
              error: "INVALID_WEB_PUSH_SUBSCRIPTION",
            });
            continue;
          }

          try {
            await sendWebPushNotification(
              {
                endpoint: sub.endpoint,
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
              {
                title: "مهمة جديدة!",
                body: `لديك مهمة جديدة${payload.title ? `: ${payload.title}` : ""}`,
                taskId,
                childId,
                level: policy.level,
                url: "/child-tasks",
              }
            );

            hasAnyPushSuccess = true;
            await recordAttempt({
              taskId,
              childId,
              channel: "web_push",
              attemptNo,
              status: "sent",
            });
          } catch (error: any) {
            const statusCode = error?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await db
                .update(childPushSubscriptions)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(childPushSubscriptions.id, sub.id));
            }

            await recordAttempt({
              taskId,
              childId,
              channel: "web_push",
              attemptNo,
              status: "failed",
              error: error?.message || "WEB_PUSH_SEND_FAILED",
            });
          }
        }
      }
      attemptNo += 1;
    }

    if (channels.mobilePush) {
      const mobileSubs = await db
        .select({
          id: childPushSubscriptions.id,
          token: childPushSubscriptions.token,
          platform: childPushSubscriptions.platform,
        })
        .from(childPushSubscriptions)
        .where(
          and(
            eq(childPushSubscriptions.childId, childId),
            eq(childPushSubscriptions.isActive, true)
          )
        );

      const mobileTokens = mobileSubs.filter(
        (row: { id: string; token: string | null; platform: string }) =>
          (row.platform === "android" || row.platform === "ios") && !!row.token
      );

      if (!isMobilePushReady()) {
        await recordAttempt({
          taskId,
          childId,
          channel: "mobile_push",
          attemptNo,
          status: "failed",
          error: "MOBILE_PUSH_FCM_NOT_CONFIGURED",
        });
      } else if (mobileTokens.length === 0) {
        await recordAttempt({
          taskId,
          childId,
          channel: "mobile_push",
          attemptNo,
          status: "failed",
          error: "NO_ACTIVE_MOBILE_PUSH_TOKENS",
        });
      } else {
        for (const sub of mobileTokens) {
          try {
            await sendMobilePushNotification(sub.token as string, {
              title: "مهمة جديدة!",
              body: `لديك مهمة جديدة${payload.title ? `: ${payload.title}` : ""}`,
              data: {
                taskId: taskId || "",
                childId,
                level: String(policy.level),
                url: "/child-tasks",
              },
            });

            hasAnyPushSuccess = true;
            await recordAttempt({
              taskId,
              childId,
              channel: "mobile_push",
              attemptNo,
              status: "sent",
            });
          } catch (error: any) {
            const errorMessage = error?.message || "MOBILE_PUSH_SEND_FAILED";

            if (
              errorMessage.includes("NotRegistered") ||
              errorMessage.includes("InvalidRegistration")
            ) {
              await db
                .update(childPushSubscriptions)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(childPushSubscriptions.id, sub.id));
            }

            await recordAttempt({
              taskId,
              childId,
              channel: "mobile_push",
              attemptNo,
              status: "failed",
              error: errorMessage,
            });
          }
        }
      }

      attemptNo += 1;
    }

    if (!hasAnyPushSuccess && (policy.escalationEnabled || channels.parentEscalation)) {
      await sendParentEscalation(childId, taskId, payload.title);
    }
  }
}

async function handleAdminParentWebPushNotify(eventRow: typeof outboxEvents.$inferSelect) {
  const payload = (eventRow.payloadJson || {}) as OutboxPayload;
  const messageType = payload.type || "broadcast";

  if (!isWebPushReady()) {
    await db
      .update(outboxEvents)
      .set({ status: "failed", lastError: "WEB_PUSH_VAPID_NOT_CONFIGURED" })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  let subscriptions: Array<{
    id: string;
    parentId: string;
    endpoint: string | null;
    p256dh: string | null;
    auth: string | null;
  }> = [];

  if (Array.isArray(payload.subscriptionIds) && payload.subscriptionIds.length > 0) {
    subscriptions = await db
      .select({
        id: parentPushSubscriptions.id,
        parentId: parentPushSubscriptions.parentId,
        endpoint: parentPushSubscriptions.endpoint,
        p256dh: parentPushSubscriptions.p256dh,
        auth: parentPushSubscriptions.auth,
      })
      .from(parentPushSubscriptions)
      .where(
        and(
          inArray(parentPushSubscriptions.id, payload.subscriptionIds),
          eq(parentPushSubscriptions.platform, "web"),
          eq(parentPushSubscriptions.isActive, true)
        )
      );
  } else {
    const parentIds = Array.isArray(payload.parentIds) ? payload.parentIds : [];
    if (parentIds.length === 0) {
      await db
        .update(outboxEvents)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(outboxEvents.id, eventRow.id));
      return;
    }

    const prefsRows = await db
      .select({
        parentId: parentNotificationPreferences.parentId,
        webPushEnabled: parentNotificationPreferences.webPushEnabled,
        mutedTypes: parentNotificationPreferences.mutedTypes,
        quietHoursStart: parentNotificationPreferences.quietHoursStart,
        quietHoursEnd: parentNotificationPreferences.quietHoursEnd,
      })
      .from(parentNotificationPreferences)
      .where(inArray(parentNotificationPreferences.parentId, parentIds));

    const prefsMap = new Map<string, {
      webPushEnabled: boolean;
      mutedTypes: string[];
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
    }>();

    for (const row of prefsRows) {
      prefsMap.set(row.parentId, {
        webPushEnabled: row.webPushEnabled,
        mutedTypes: Array.isArray(row.mutedTypes) ? (row.mutedTypes as string[]) : [],
        quietHoursStart: row.quietHoursStart ?? null,
        quietHoursEnd: row.quietHoursEnd ?? null,
      });
    }

    const eligibleParentIds = parentIds.filter((parentId) => {
      const pref = prefsMap.get(parentId);
      if (!pref) return true;
      if (!pref.webPushEnabled) return false;
      if (pref.mutedTypes.includes(messageType)) return false;
      if (isNowInQuietHours(pref.quietHoursStart, pref.quietHoursEnd)) return false;
      return true;
    });

    if (eligibleParentIds.length === 0) {
      await db
        .update(outboxEvents)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(outboxEvents.id, eventRow.id));
      return;
    }

    subscriptions = await db
      .select({
        id: parentPushSubscriptions.id,
        parentId: parentPushSubscriptions.parentId,
        endpoint: parentPushSubscriptions.endpoint,
        p256dh: parentPushSubscriptions.p256dh,
        auth: parentPushSubscriptions.auth,
      })
      .from(parentPushSubscriptions)
      .where(
        and(
          inArray(parentPushSubscriptions.parentId, eligibleParentIds),
          eq(parentPushSubscriptions.platform, "web"),
          eq(parentPushSubscriptions.isActive, true)
        )
      );
  }

  if (subscriptions.length === 0) {
    await db
      .update(outboxEvents)
      .set({ status: "sent", sentAt: new Date(), lastError: null })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  const retrySubscriptionIds: string[] = [];

  for (const sub of subscriptions) {
    if (!sub.endpoint || !sub.p256dh || !sub.auth) {
      continue;
    }

    try {
      await sendWebPushNotification(
        {
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
        {
          title: payload.title || "إشعار جديد",
          body: payload.message || "لديك تحديث جديد",
          type: messageType,
          url: payload.url || "/notifications",
        }
      );
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await db
          .update(parentPushSubscriptions)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(parentPushSubscriptions.id, sub.id));
      } else {
        retrySubscriptionIds.push(sub.id);
      }
    }
  }

  if (retrySubscriptionIds.length === 0) {
    await db
      .update(outboxEvents)
      .set({ status: "sent", sentAt: new Date(), lastError: null })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  const retryCount = (eventRow.retryCount || 0) + 1;
  const nextRetryAt = new Date(Date.now() + Math.min(retryCount, 10) * 60 * 1000);

  await db
    .update(outboxEvents)
    .set({
      status: retryCount >= 8 ? "failed" : "pending",
      retryCount,
      lastError: "ADMIN_WEB_PUSH_PARTIAL_FAILURE",
      availableAt: nextRetryAt,
      payloadJson: {
        ...payload,
        subscriptionIds: retrySubscriptionIds,
      },
    })
    .where(eq(outboxEvents.id, eventRow.id));
}

async function processEvent(eventRow: typeof outboxEvents.$inferSelect) {
  if (eventRow.type === "TASK_ASSIGNED_NOTIFY") {
    await handleTaskAssignedNotify(eventRow);
    await db
      .update(outboxEvents)
      .set({ status: "sent", sentAt: new Date(), lastError: null })
      .where(eq(outboxEvents.id, eventRow.id));
    return;
  }

  if (eventRow.type === "ADMIN_PARENT_WEB_PUSH_NOTIFY") {
    await handleAdminParentWebPushNotify(eventRow);
    return;
  }

  await db
    .update(outboxEvents)
    .set({ status: "sent", sentAt: new Date(), lastError: null })
    .where(eq(outboxEvents.id, eventRow.id));
}

async function processEventSafe(eventRow: typeof outboxEvents.$inferSelect) {
  try {
    await processEvent(eventRow);
  } catch (error: any) {
    const retryCount = (eventRow.retryCount || 0) + 1;
    const nextRetryAt = new Date(Date.now() + Math.min(retryCount, 10) * 60 * 1000);

    await db
      .update(outboxEvents)
      .set({
        status: retryCount >= 8 ? "failed" : "pending",
        retryCount,
        lastError: error?.message || "TASK_NOTIFY_PROCESSING_FAILED",
        availableAt: nextRetryAt,
      })
      .where(eq(outboxEvents.id, eventRow.id));
  }
}

async function runCycle() {
  const locked = await tryAcquireLock();
  if (!locked) return;

  try {
    const pendingEvents = await db
      .select()
      .from(outboxEvents)
      .where(and(eq(outboxEvents.status, "pending"), lte(outboxEvents.availableAt, new Date())))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(BATCH_SIZE);

    for (const eventRow of pendingEvents) {
      await processEventSafe(eventRow);
    }
  } finally {
    await releaseLock();
  }
}

async function runCycleSafe() {
  try {
    await runCycle();
  } catch (error) {
    console.error("task notification worker cycle error", error);
  }
}

export function startTaskNotificationWorker() {
  if (!ENABLED) return;
  runCycleSafe();
  setInterval(runCycleSafe, INTERVAL_MS).unref();
}
