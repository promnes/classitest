import { storage } from "./storage";
import { notifications, children, products } from "../shared/schema";
import { eq } from "drizzle-orm";

const db = storage.db;

export type NotificationStyle = "toast" | "modal" | "banner" | "fullscreen";
export type NotificationPriority = "normal" | "warning" | "urgent" | "blocking";

interface NotificationParams {
  parentId?: string | null;
  childId?: string | null;
  type: string;
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
}

export async function createNotification(params: NotificationParams) {
  const {
    parentId = null,
    childId = null,
    type,
    title = null,
    message,
    style = "toast",
    priority = "normal",
    soundAlert = false,
    vibration = false,
    relatedId = null,
    ctaAction = null,
    ctaTarget = null,
    metadata = null,
  } = params;

  try {
    const result = await db.insert(notifications).values({
      parentId,
      childId,
      type,
      title,
      message,
      style,
      priority,
      soundAlert,
      vibration,
      relatedId,
      ctaAction,
      ctaTarget,
      metadata,
    }).returning();
    return result[0];
  } catch (err) {
    console.error('createNotification error:', err);
    throw err;
  }
}

export async function notifyChildPointsEarned(childId: string, pointsEarned: number, reason: string, relatedId?: string) {
  const childData = await db.select().from(children).where(eq(children.id, childId));
  const child = childData[0];
  if (!child) return null;

  return createNotification({
    childId,
    type: "points_earned",
    title: "نقاط جديدة!",
    message: `أحسنت! لقد ربحت ${pointsEarned} نقطة من ${reason}`,
    style: "toast",
    priority: "normal",
    soundAlert: true,
    relatedId: relatedId ?? null,
    metadata: { pointsEarned, newTotal: child.points + pointsEarned },
  });
}

export async function notifyChildRewardUnlocked(childId: string, rewardName: string, rewardId: string) {
  return createNotification({
    childId,
    type: "reward_unlocked",
    title: "مكافأة جديدة!",
    message: `تهانينا! لقد فتحت مكافأة "${rewardName}"`,
    style: "modal",
    priority: "urgent",
    soundAlert: true,
    vibration: true,
    relatedId: rewardId,
    ctaAction: "view_reward",
    ctaTarget: `/rewards/${rewardId}`,
    metadata: { rewardName },
  });
}

export async function notifyChildProductAssigned(childId: string, productId: string, requiredPoints: number) {
  const productData = await db.select().from(products).where(eq(products.id, productId));
  const product = productData[0];
  if (!product) return null;

  return createNotification({
    childId,
    type: "product_assigned",
    title: "هدية جديدة في انتظارك!",
    message: `أضاف والداك "${product.nameAr || product.name}" كهدية! اجمع ${requiredPoints} نقطة للحصول عليها`,
    style: "fullscreen",
    priority: "urgent",
    soundAlert: true,
    vibration: true,
    relatedId: productId,
    ctaAction: "view_goal",
    ctaTarget: `/goals`,
    metadata: { productName: product.name, productNameAr: product.nameAr, requiredPoints, productImage: product.image },
  });
}

export async function notifyChildTaskReminder(childId: string, taskId: string, taskTitle: string) {
  return createNotification({
    childId,
    type: "task_reminder",
    title: "تذكير بالمهمة",
    message: `لا تنسى إتمام مهمة: ${taskTitle}`,
    style: "banner",
    priority: "normal",
    relatedId: taskId,
    ctaAction: "view_task",
    ctaTarget: `/tasks/${taskId}`,
  });
}

export async function notifyChildAchievement(childId: string, achievementName: string, description: string) {
  return createNotification({
    childId,
    type: "achievement",
    title: "إنجاز جديد!",
    message: description,
    style: "fullscreen",
    priority: "urgent",
    soundAlert: true,
    vibration: true,
    metadata: { achievementName },
  });
}

export async function notifyChildDailyChallenge(childId: string, challengeId: string, challengeTitle: string, pointsReward: number) {
  return createNotification({
    childId,
    type: "daily_challenge",
    title: "تحدي اليوم!",
    message: `تحدي جديد: ${challengeTitle} - اربح ${pointsReward} نقطة!`,
    style: "modal",
    priority: "normal",
    soundAlert: true,
    relatedId: challengeId,
    ctaAction: "start_challenge",
    ctaTarget: `/challenges/${challengeId}`,
    metadata: { pointsReward },
  });
}

export async function notifyChildGoalProgress(childId: string, productId: string, currentPoints: number, requiredPoints: number) {
  const percentage = Math.round((currentPoints / requiredPoints) * 100);
  const productData = await db.select().from(products).where(eq(products.id, productId));
  const product = productData[0];

  const milestones = [25, 50, 75, 90];
  let milestone = null;
  for (const m of milestones) {
    if (percentage >= m && (currentPoints - 1) / requiredPoints * 100 < m) {
      milestone = m;
      break;
    }
  }

  if (!milestone) return null;

  return createNotification({
    childId,
    type: "goal_progress",
    title: `تقدم رائع! ${milestone}%`,
    message: `أنت على بعد ${requiredPoints - currentPoints} نقطة فقط من الحصول على "${product?.nameAr || product?.name}"!`,
    style: "toast",
    priority: "normal",
    soundAlert: true,
    relatedId: productId,
    metadata: { percentage, milestone, remaining: requiredPoints - currentPoints },
  });
}

export async function notifyParentChildActivity(parentId: string, childId: string, activityType: string, details: string, childName?: string) {
  const resolvedName = childName || (await (async () => {
    const childData = await db.select().from(children).where(eq(children.id, childId));
    return childData[0]?.name || "طفلك";
  })());
  return createNotification({
    parentId,
    type: "child_activity",
    title: `نشاط ${resolvedName}`,
    message: details,
    style: "toast",
    priority: "normal",
    relatedId: childId,
    metadata: { activityType, childId, childName: resolvedName },
  });
}

export async function notifyParentLowPoints(parentId: string, childId: string, childName: string, currentPoints: number) {
  return createNotification({
    parentId,
    type: "low_points_warning",
    title: "تنبيه النقاط",
    message: `${childName} لديه ${currentPoints} نقطة فقط. قد يحتاج للتشجيع!`,
    style: "banner",
    priority: "warning",
    relatedId: childId,
    metadata: { childName, currentPoints },
  });
}

export default {
  createNotification,
  notifyChildPointsEarned,
  notifyChildRewardUnlocked,
  notifyChildProductAssigned,
  notifyChildTaskReminder,
  notifyChildAchievement,
  notifyChildDailyChallenge,
  notifyChildGoalProgress,
  notifyParentChildActivity,
  notifyParentLowPoints,
};
