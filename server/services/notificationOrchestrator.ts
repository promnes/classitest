import { notifications, notificationSettings, parents } from "../../shared/schema";
import { storage } from "../storage";
import type { NotificationPriority, NotificationStyle, NotificationType } from "../../shared/notificationTypes";
import { notificationBus } from "./notificationBus";
import { sendNotificationEmail } from "../mailer";
import { eq } from "drizzle-orm";

const db = storage.db;

type RecipientType = "child" | "parent";

type NotificationChannel = "in_app" | "email";

type OrchestratorInput = {
  recipientType: RecipientType;
  recipientId: string;
  type: NotificationType;
  title?: string | null;
  message: string;
  style?: NotificationStyle;
  priority?: NotificationPriority;
  soundAlert?: boolean;
  vibration?: boolean;
  relatedId?: string | null;
  ctaAction?: string | null;
  ctaTarget?: string | null;
  metadata?: Record<string, any> | null;
  groupKey?: string | null;
  ttlMinutes?: number;
  channels?: NotificationChannel[];
};

class NotificationOrchestrator {
  private async canSendEmailChannel(): Promise<boolean> {
    const rows = await db.select().from(notificationSettings).limit(1);
    return rows[0]?.enableEmail === true;
  }

  private async deliverEmailIfRequested(input: OrchestratorInput) {
    const channels = input.channels || ["in_app"];
    if (!channels.includes("email")) return;
    if (input.recipientType !== "parent") return;

    const emailEnabled = await this.canSendEmailChannel();
    if (!emailEnabled) return;

    const parentRows = await db
      .select({ email: parents.email })
      .from(parents)
      .where(eq(parents.id, input.recipientId))
      .limit(1);

    const parentEmail = parentRows[0]?.email;
    if (!parentEmail) return;

    await sendNotificationEmail(parentEmail, input.title || "إشعار جديد", input.message);
  }

  async send(input: OrchestratorInput) {
    const expiresAt =
      typeof input.ttlMinutes === "number" && input.ttlMinutes > 0
        ? new Date(Date.now() + input.ttlMinutes * 60 * 1000)
        : null;

    const channels = input.channels || ["in_app"];

    const metadata = {
      ...(input.metadata || {}),
      groupKey: input.groupKey || null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      channels,
      channel: channels[0] || "in_app",
    };

    const result = await db
      .insert(notifications)
      .values({
        parentId: input.recipientType === "parent" ? input.recipientId : null,
        childId: input.recipientType === "child" ? input.recipientId : null,
        type: input.type,
        title: input.title ?? null,
        message: input.message,
        style: input.style ?? "toast",
        priority: input.priority ?? "normal",
        soundAlert: input.soundAlert ?? false,
        vibration: input.vibration ?? false,
        relatedId: input.relatedId ?? null,
        ctaAction: input.ctaAction ?? null,
        ctaTarget: input.ctaTarget ?? null,
        metadata,
      })
      .returning();

    const created = result[0];

    if (created && input.recipientType === "child" && created.childId) {
      notificationBus.publishToChild(created.childId, created as Record<string, any>);
    }

    try {
      await this.deliverEmailIfRequested(input);
    } catch (error: any) {
      console.error("notification email delivery failed:", error?.message || error);
    }

    return created;
  }
}

export const notificationOrchestrator = new NotificationOrchestrator();
