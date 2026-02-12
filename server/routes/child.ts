import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import {
  parents,
  children,
  parentChild,
  tasks,
  taskResults,
  flashGames,
  products,
  orders,
  childPurchases,
  childPurchaseRequests,
  parentOwnedProducts,
  childAssignedProducts,
  subjects,
  templateTasks,
  notifications,
  childGifts,
  childEvents,
  childNotificationSettings,
  gifts,
  entitlements,
  activityLog,
  childTrustedDevices,
  childGrowthTrees,
  childGrowthEvents,
  childLoginRequests,
  libraryProducts,
  libraries,
} from "../../shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, and, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { authMiddleware, JWT_SECRET } from "./middleware";
import { emitGiftEvent } from "../giftEvents";
import { unlockEligibleGifts } from "../giftUnlock";
import { createNotification } from "../notifications";
import { applyPointsDelta } from "../services/pointsService";

const db = storage.db;

// Helper function to normalize answers - ensures each answer has a DETERMINISTIC id
// Uses hash of answer text + index to generate consistent IDs across calls
function normalizeAnswers(answers: any, taskQuestion?: string): any[] {
  if (!answers || !Array.isArray(answers)) return [];
  
  // Generate a simple hash for deterministic ID
  const hashText = (text: string, index: number): string => {
    const combined = `${taskQuestion || ''}-${text}-${index}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  };
  
  return answers.map((answer: any, index: number) => {
    // If answer is already an object with id, return as-is
    if (typeof answer === 'object' && answer !== null && answer.id) {
      return answer;
    }
    // If answer is a string, convert to object with generated deterministic id
    if (typeof answer === 'string') {
      return {
        id: `answer-${index}-${hashText(answer, index)}`,
        text: answer,
        isCorrect: index === 0 // First answer is correct by default for legacy data
      };
    }
    // If answer is an object without id, add one
    if (typeof answer === 'object' && answer !== null) {
      const text = answer.text || String(answer);
      return {
        ...answer,
        id: answer.id || `answer-${index}-${hashText(text, index)}`
      };
    }
    const text = String(answer);
    return { id: `answer-${index}-${hashText(text, index)}`, text, isCorrect: false };
  });
}

async function getFailedAttemptCount(taskId: string, childId: string): Promise<number> {
  const failed = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(taskResults)
    .where(and(
      eq(taskResults.taskId, taskId),
      eq(taskResults.childId, childId),
      eq(taskResults.isCorrect, false)
    ));
  return failed[0]?.count ?? 0;
}

async function logTaskCompletion(childId: string, task: typeof tasks.$inferSelect, childName: string, failedAttempts: number) {
  const totalAttempts = failedAttempts + 1;

  await db.insert(childEvents).values({
    childId,
    eventType: "TASK_COMPLETED",
    relatedId: task.id,
    meta: {
      taskId: task.id,
      question: task.question,
      pointsEarned: task.pointsReward,
      failedAttempts,
      totalAttempts,
    },
    isAcknowledged: true,
    acknowledgedAt: new Date(),
  });

  await createNotification({
    parentId: task.parentId,
    type: "task_completed",
    title: "تم حل مهمة",
    message: `${childName} حل المهمة بنجاح وحصل على ${task.pointsReward} نقطة. عدد الإخفاقات: ${failedAttempts}.`,
    relatedId: task.id,
    metadata: {
      taskId: task.id,
      childId,
      failedAttempts,
      totalAttempts,
      pointsEarned: task.pointsReward,
    },
  });
}

function getMotivationalMessage(speedLevel: string, totalPoints: number, tasksCompleted: number): string {
  const messages: Record<string, string[]> = {
    superfast: [
      "أنت نجم! استمر في التألق!",
      "رائع جداً! أنت من أفضل المتعلمين!",
      "سرعتك مذهلة! افتخر بنفسك!",
    ],
    fast: [
      "أحسنت! أنت تتقدم بسرعة رائعة!",
      "ممتاز! استمر على هذا المستوى!",
      "أنت بطل! كل يوم تصبح أفضل!",
    ],
    moderate: [
      "جيد جداً! يمكنك فعل المزيد!",
      "استمر! أنت على الطريق الصحيح!",
      "رائع! كل خطوة تقربك من هدفك!",
    ],
    slow: [
      "لا تستسلم! كل بداية صعبة!",
      "العب المزيد من الألعاب لتكسب النقاط!",
      "أنت قادر على تحقيق المزيد! جرب الآن!",
    ],
  };

  const levelMessages = messages[speedLevel] || messages.slow;
  return levelMessages[Math.floor(Math.random() * levelMessages.length)];
}

interface GoalProgress {
  id: string;
  requiredPoints: number;
  progressPoints: number;
  status: string;
}

export async function registerChildRoutes(app: Express) {
  // Link Child (from QR Code)
  app.post("/api/child/link", async (req, res) => {
    try {
      const { childName, code } = req.body;

      if (!childName || !code) {
        return res.status(400).json({ message: "Child name and parent code are required" });
      }

      // Validate child name
      const trimmedName = childName.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({ message: "Child name must be between 2 and 100 characters" });
      }

      // Import parents table at top
      // Find parent by unique code (NOT parentChild.parentId)
      const parentList = await db.select().from(parents).where(eq(parents.uniqueCode, code.toUpperCase()));
      if (!parentList[0]) {
        return res.status(400).json({ message: "Invalid parent code" });
      }

      // Create child
      const childResult = await db.insert(children).values({ name: trimmedName }).returning();

      // Check if already linked (to prevent duplicates)
      const existingLink = await db.select().from(parentChild).where(
        and(
          eq(parentChild.parentId, parentList[0].id),
          eq(parentChild.childId, childResult[0].id)
        )
      );

      if (existingLink[0]) {
        return res.status(409).json({ message: "This child is already linked to this parent" });
      }

      // Link parent and child
      await db.insert(parentChild).values({
        parentId: parentList[0].id,
        childId: childResult[0].id,
      });

      // Initialize growth tree for the child
      await db.insert(childGrowthTrees).values({
        childId: childResult[0].id,
        currentStage: 1,
        totalGrowthPoints: 0,
      }).onConflictDoNothing();

      // Send notification to parent about new child linking
      await createNotification({
        parentId: parentList[0].id,
        type: "child_linked",
        title: "تم ربط طفل جديد!",
        message: `تم ربط ${trimmedName} بحسابك بنجاح`,
        metadata: { childId: childResult[0].id, childName: trimmedName }
      });

      const token = jwt.sign({ childId: childResult[0].id, type: "child" }, JWT_SECRET, { expiresIn: "30d" });
      res.status(201).json({ 
        success: true,
        data: { 
          token, 
          childId: childResult[0].id,
          childName: childResult[0].name
        },
        message: "Child linked successfully"
      });
    } catch (error: any) {
      console.error("Child link error:", error);
      res.status(500).json({ message: "Linking failed", error: error.message });
    }
  });

  // Verify child token for quick login
  app.post("/api/child/verify-token", authMiddleware, async (req: any, res) => {
    try {
      const child = await db.select().from(children).where(eq(children.id, req.user.childId));
      if (!child[0]) {
        return res.status(404).json({ success: false, message: "Child not found" });
      }
      res.json({ success: true, valid: true, childId: child[0].id, displayName: child[0].displayName || child[0].name });
    } catch (error: any) {
      console.error("Token verification error:", error);
      res.status(500).json({ success: false, message: "Verification failed" });
    }
  });

  // Get Child Info
  app.get("/api/child/info", authMiddleware, async (req: any, res) => {
    try {
      const child = await db.select().from(children).where(eq(children.id, req.user.childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }
      res.json(child[0]);
    } catch (error: any) {
      console.error("Fetch child info error:", error);
      res.status(500).json({ message: "Failed to fetch child info" });
    }
  });

  // Get Child Profile
  app.get("/api/child/profile", authMiddleware, async (req: any, res) => {
    try {
      const child = await db.select().from(children).where(eq(children.id, req.user.childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "الطفل غير موجود"));
      }
      return res.json(successResponse({
        id: child[0].id,
        name: child[0].name,
        avatarUrl: child[0].avatarUrl,
        birthday: child[0].birthday,
        schoolName: child[0].schoolName,
        academicGrade: child[0].academicGrade,
        hobbies: child[0].hobbies,
        totalPoints: child[0].totalPoints,
      }));
    } catch (error: any) {
      console.error("Fetch child profile error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "حدث خطأ في تحميل الملف الشخصي"));
    }
  });

  // Get Child Progress and Stats
  app.get("/api/child/progress", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      const completedTasks = await db.select().from(taskResults)
        .where(and(eq(taskResults.childId, childId), eq(taskResults.isCorrect, true)));
      
      const allTasks = await db.select().from(tasks).where(eq(tasks.childId, childId));
      
      const activeGoals = await db.select({
        id: childAssignedProducts.id,
        requiredPoints: childAssignedProducts.requiredPoints,
        progressPoints: childAssignedProducts.progressPoints,
        status: childAssignedProducts.status,
      }).from(childAssignedProducts).where(eq(childAssignedProducts.childId, childId));

      const pendingGifts = await db.select().from(childGifts)
        .where(and(eq(childGifts.childId, childId), eq(childGifts.status, "SENT")));

      const completedGifts = await db.select().from(childGifts)
        .where(and(eq(childGifts.childId, childId), eq(childGifts.status, "CLAIMED")));

      const totalPoints = child[0].totalPoints;
      const tasksCompleted = completedTasks.length;
      const totalTasks = allTasks.length;
      const successRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

      const daysSinceJoined = Math.max(1, Math.floor((Date.now() - new Date(child[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      const pointsPerDay = Math.round(totalPoints / daysSinceJoined);

      let speedLevel = "slow";
      if (pointsPerDay >= 50) speedLevel = "superfast";
      else if (pointsPerDay >= 30) speedLevel = "fast";
      else if (pointsPerDay >= 15) speedLevel = "moderate";

      const closestGoal = activeGoals
        .filter((g: GoalProgress) => g.status === "active")
        .sort((a: GoalProgress, b: GoalProgress) => (b.progressPoints / b.requiredPoints) - (a.progressPoints / a.requiredPoints))[0];

      let nextMilestone = 100;
      const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
      for (const m of milestones) {
        if (totalPoints < m) {
          nextMilestone = m;
          break;
        }
      }

      res.json({
        success: true,
        data: {
          currentPoints: totalPoints,
          tasksCompleted,
          totalTasks,
          successRate,
          pointsPerDay,
          speedLevel,
          daysSinceJoined,
          pendingGiftsCount: pendingGifts.length,
          claimedGiftsCount: completedGifts.length,
          activeGoalsCount: activeGoals.filter((g: GoalProgress) => g.status === "active").length,
          closestGoal: closestGoal ? {
            progress: Math.round((closestGoal.progressPoints / closestGoal.requiredPoints) * 100),
            pointsNeeded: closestGoal.requiredPoints - closestGoal.progressPoints,
          } : null,
          nextMilestone,
          milestoneProgress: Math.round((totalPoints / nextMilestone) * 100),
          motivationalMessage: getMotivationalMessage(speedLevel, totalPoints, tasksCompleted),
        }
      });
    } catch (error: any) {
      console.error("Fetch child progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Get Child Tasks
  app.get("/api/child/tasks", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(tasks).where(eq(tasks.childId, req.user.childId));
      // Normalize answers to ensure each has an id
      const normalizedTasks = result.map(task => ({
        ...task,
        answers: normalizeAnswers(task.answers, task.question)
      }));
      res.json(normalizedTasks);
    } catch (error: any) {
      console.error("Fetch tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get Child Pending Tasks
  app.get("/api/child/pending-tasks", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.childId, req.user.childId), eq(tasks.status, "pending")));
      // Normalize answers to ensure each has an id
      const normalizedTasks = result.map(task => ({
        ...task,
        answers: normalizeAnswers(task.answers, task.question)
      }));
      res.json(normalizedTasks);
    } catch (error: any) {
      console.error("Fetch pending tasks error:", error);
      res.status(500).json({ message: "Failed to fetch pending tasks" });
    }
  });

  // Submit Task
  app.post("/api/child/submit-task", authMiddleware, async (req: any, res) => {
    try {
      const { taskId, selectedAnswerId } = req.body;

      if (!taskId || !selectedAnswerId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Task ID and answer are required"));
      }

      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.childId, req.user.childId)));
      if (!task[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Task not found"));
      }

      // Normalize answers and find the correct one
      const normalizedAnswers = normalizeAnswers(task[0].answers, task[0].question);
      const selectedAnswer = normalizedAnswers.find((a: any) => a.id === selectedAnswerId);

      if (!selectedAnswer) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Selected answer not found"));
      }

      const isCorrect = selectedAnswer.isCorrect === true;

      const result = await db.transaction(async (tx) => {
        const existingCorrect = await tx
          .select()
          .from(taskResults)
          .where(and(
            eq(taskResults.taskId, taskId),
            eq(taskResults.childId, req.user.childId),
            eq(taskResults.isCorrect, true)
          ))
          .limit(1);

        if (existingCorrect[0]) {
          return {
            status: "already" as const,
            isCorrect: true,
            pointsEarned: existingCorrect[0].pointsEarned,
          };
        }

        if (!isCorrect) {
          await tx.insert(taskResults).values({
            taskId,
            childId: req.user.childId,
            selectedAnswerId,
            isCorrect: false,
            pointsEarned: 0,
          });
          return { status: "wrong" as const, isCorrect: false, pointsEarned: 0 };
        }

        const updated = await tx
          .update(tasks)
          .set({ status: "completed" })
          .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")))
          .returning();

        if (!updated[0]) {
          return { status: "conflict" as const };
        }

        await tx.insert(taskResults).values({
          taskId,
          childId: req.user.childId,
          selectedAnswerId,
          isCorrect: true,
          pointsEarned: task[0].pointsReward,
        });

        const pointsResult = await applyPointsDelta(tx, {
          childId: req.user.childId,
          delta: task[0].pointsReward,
          reason: "TASK_COMPLETED",
          taskId,
        });

        return {
          status: "correct" as const,
          isCorrect: true,
          pointsEarned: task[0].pointsReward,
          newTotalPoints: pointsResult.newTotalPoints,
          childName: pointsResult.childName || "طفلك",
        };
      });

      if (result.status === "conflict") {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Task already completed"));
      }

      if (result.status === "already") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
        }));
      }

      if (result.status === "wrong") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
        }));
      }

      await unlockEligibleGifts(req.user.childId, result.newTotalPoints);

      // Mark related notifications for this task as resolved/read
      try {
        await db
          .update(notifications)
          .set({ isRead: true, status: "resolved", resolvedAt: new Date() })
          .where(and(eq(notifications.relatedId, taskId), eq(notifications.childId, req.user.childId)));
      } catch (notifyErr: any) {
        console.error("Failed to update notification after correct answer:", notifyErr);
      }

      const failedAttempts = await getFailedAttemptCount(taskId, req.user.childId);
      await logTaskCompletion(req.user.childId, task[0], result.childName, failedAttempts);

      res.json(successResponse({
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
      }));
    } catch (error: any) {
      console.error("Submit task error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to submit task"));
    }
  });

  // Answer Task
  app.post("/api/child/answer-task", authMiddleware, async (req: any, res) => {
    try {
      const { taskId, selectedAnswerId } = req.body;

      if (!taskId || !selectedAnswerId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Task ID and answer are required"));
      }

      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.childId, req.user.childId)));
      if (!task[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Task not found"));
      }

      // Normalize answers and find the correct one
      const normalizedAnswers = normalizeAnswers(task[0].answers, task[0].question);
      const selectedAnswer = normalizedAnswers.find((a: any) => a.id === selectedAnswerId);

      if (!selectedAnswer) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Selected answer not found"));
      }

      const isCorrect = selectedAnswer.isCorrect === true;

      const result = await db.transaction(async (tx) => {
        const existingCorrect = await tx
          .select()
          .from(taskResults)
          .where(and(
            eq(taskResults.taskId, taskId),
            eq(taskResults.childId, req.user.childId),
            eq(taskResults.isCorrect, true)
          ))
          .limit(1);

        if (existingCorrect[0]) {
          return {
            status: "already" as const,
            isCorrect: true,
            pointsEarned: existingCorrect[0].pointsEarned,
          };
        }

        if (!isCorrect) {
          await tx.insert(taskResults).values({
            taskId,
            childId: req.user.childId,
            selectedAnswerId,
            isCorrect: false,
            pointsEarned: 0,
          });
          return { status: "wrong" as const, isCorrect: false, pointsEarned: 0 };
        }

        const updated = await tx
          .update(tasks)
          .set({ status: "completed" })
          .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")))
          .returning();

        if (!updated[0]) {
          return { status: "conflict" as const };
        }

        await tx.insert(taskResults).values({
          taskId,
          childId: req.user.childId,
          selectedAnswerId,
          isCorrect: true,
          pointsEarned: task[0].pointsReward,
        });

        const pointsResult = await applyPointsDelta(tx, {
          childId: req.user.childId,
          delta: task[0].pointsReward,
          reason: "TASK_COMPLETED",
          taskId,
        });

        return {
          status: "correct" as const,
          isCorrect: true,
          pointsEarned: task[0].pointsReward,
          newTotalPoints: pointsResult.newTotalPoints,
          childName: pointsResult.childName || "طفلك",
        };
      });

      if (result.status === "conflict") {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Task already completed"));
      }

      if (result.status === "already") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
        }));
      }

      if (result.status === "wrong") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned,
        }));
      }

      await unlockEligibleGifts(req.user.childId, result.newTotalPoints);

      // Mark related notifications for this task as resolved/read
      try {
        await db
          .update(notifications)
          .set({ isRead: true, status: "resolved", resolvedAt: new Date() })
          .where(and(eq(notifications.relatedId, taskId), eq(notifications.childId, req.user.childId)));
      } catch (notifyErr: any) {
        console.error("Failed to update notification after correct answer:", notifyErr);
      }

      const failedAttempts = await getFailedAttemptCount(taskId, req.user.childId);
      await logTaskCompletion(req.user.childId, task[0], result.childName, failedAttempts);

      res.json(successResponse({
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
      }));
    } catch (error: any) {
      console.error("Answer task error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to answer task"));
    }
  });

  // Get Games
  app.get("/api/games", async (req, res) => {
    try {
      const result = await db.select().from(flashGames).where(eq(flashGames.isActive, true));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch games error:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  // Get Child Store - SEC-004 FIX: Correct query to get parent's products for child
  app.get("/api/child/store", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      
      // Get the parent ID from parentChild relationship
      const parentLink = await db
        .select({ parentId: parentChild.parentId })
        .from(parentChild)
        .where(eq(parentChild.childId, childId));
      
      if (!parentLink[0]) {
        return res.status(404).json({ 
          success: false, 
          error: "NOT_FOUND",
          message: "Parent not found for this child" 
        });
      }
      
      const parentId = parentLink[0].parentId;
      
      // Get products owned by parent that are available for the child
      const ownedProducts = await db
        .select({
          id: products.id,
          name: products.name,
          nameAr: products.nameAr,
          description: products.description,
          image: products.image,
          pointsPrice: products.pointsPrice,
        })
        .from(parentOwnedProducts)
        .innerJoin(products, eq(parentOwnedProducts.productId, products.id))
        .where(and(
          eq(parentOwnedProducts.parentId, parentId),
          eq(parentOwnedProducts.status, "active")
        ));
      
      res.json({ success: true, data: ownedProducts });
    } catch (error: any) {
      console.error("Fetch store error:", error);
      res.status(500).json({ 
        success: false, 
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch store" 
      });
    }
  });

  // Create Purchase Request (for parent approval)
  app.post("/api/child/store/purchase-request", authMiddleware, async (req: any, res) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const normalizedQuantity = Math.max(1, parseInt(String(quantity), 10) || 1);

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const child = await db.select().from(children).where(eq(children.id, req.user.childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      // Get parent linked to this child
      const link = await db.select().from(parentChild).where(eq(parentChild.childId, req.user.childId));
      if (!link[0]) {
        return res.status(400).json({ message: "No parent linked to this child" });
      }

      let resolvedProductId = String(productId);
      let resolvedLibraryProductId: string | null = null;
      let effectivePointsPerUnit = 0;
      let effectiveProductName = "";
      let effectiveProductImage: string | null = null;

      const regularProduct = await db.select().from(products).where(eq(products.id, String(productId)));
      if (regularProduct[0]) {
        effectivePointsPerUnit = regularProduct[0].pointsPrice;
        effectiveProductName = regularProduct[0].nameAr || regularProduct[0].name;
        effectiveProductImage = regularProduct[0].image;
      } else {
        const libraryProduct = await db
          .select({
            id: libraryProducts.id,
            libraryId: libraryProducts.libraryId,
            title: libraryProducts.title,
            description: libraryProducts.description,
            imageUrl: libraryProducts.imageUrl,
            price: libraryProducts.price,
            discountPercent: libraryProducts.discountPercent,
            stock: libraryProducts.stock,
            libraryName: libraries.name,
          })
          .from(libraryProducts)
          .innerJoin(libraries, eq(libraryProducts.libraryId, libraries.id))
          .where(
            and(
              eq(libraryProducts.id, String(productId)),
              eq(libraryProducts.isActive, true),
              eq(libraries.isActive, true)
            )
          );

        if (!libraryProduct[0]) {
          return res.status(404).json({ message: "Product not found" });
        }

        if (libraryProduct[0].stock < normalizedQuantity) {
          return res.status(400).json({ message: "Product out of stock" });
        }

        const unitPrice = libraryProduct[0].discountPercent > 0
          ? parseFloat(libraryProduct[0].price) * (1 - libraryProduct[0].discountPercent / 100)
          : parseFloat(libraryProduct[0].price);

        effectivePointsPerUnit = Math.round(unitPrice * 10);
        effectiveProductName = libraryProduct[0].title;
        effectiveProductImage = libraryProduct[0].imageUrl;
        resolvedLibraryProductId = libraryProduct[0].id;

        const snapshot = await db
          .insert(products)
          .values({
            parentId: link[0].parentId,
            name: libraryProduct[0].title,
            nameAr: libraryProduct[0].title,
            description: libraryProduct[0].description,
            descriptionAr: libraryProduct[0].description,
            price: unitPrice.toFixed(2),
            originalPrice: libraryProduct[0].discountPercent > 0 ? libraryProduct[0].price : null,
            pointsPrice: effectivePointsPerUnit,
            image: libraryProduct[0].imageUrl,
            images: libraryProduct[0].imageUrl ? [libraryProduct[0].imageUrl] : [],
            stock: 999,
            productType: "physical",
            brand: libraryProduct[0].libraryName,
            isFeatured: false,
            isActive: true,
          })
          .returning();

        resolvedProductId = snapshot[0].id;
      }

      const totalPointsNeeded = effectivePointsPerUnit * normalizedQuantity;
      if (child[0].totalPoints < totalPointsNeeded) {
        return res.status(400).json({ message: "Not enough points" });
      }

      // Check for existing pending request for same product
      const existingRequest = await db
        .select()
        .from(childPurchaseRequests)
        .where(
          and(
            eq(childPurchaseRequests.childId, req.user.childId),
            eq(childPurchaseRequests.status, "pending"),
            resolvedLibraryProductId
              ? eq(childPurchaseRequests.libraryProductId, resolvedLibraryProductId)
              : eq(childPurchaseRequests.productId, resolvedProductId)
          )
        );

      if (existingRequest[0]) {
        return res.status(400).json({ message: "You already have a pending request for this product" });
      }

      // Create purchase request (points NOT deducted yet)
      const requestResult = await db
        .insert(childPurchaseRequests)
        .values({
          childId: req.user.childId,
          parentId: link[0].parentId,
          productId: resolvedProductId,
          libraryProductId: resolvedLibraryProductId,
          quantity: normalizedQuantity,
          pointsPrice: totalPointsNeeded,
          status: "pending",
        })
        .returning();

      // Send notification to parent
      await createNotification({
        parentId: link[0].parentId,
        type: "purchase_request",
        title: "طلب شراء جديد!",
        message: `${child[0].name} يريد شراء ${effectiveProductName} بـ ${totalPointsNeeded} نقطة`,
        metadata: { 
          requestId: requestResult[0].id, 
          childId: req.user.childId,
          childName: child[0].name,
          productId: resolvedProductId,
          libraryProductId: resolvedLibraryProductId,
          productName: effectiveProductName,
          productImage: effectiveProductImage,
          pointsPrice: totalPointsNeeded,
          quantity: normalizedQuantity
        }
      });

      res.json({ 
        success: true, 
        requestId: requestResult[0].id,
        message: "Purchase request sent to parent for approval"
      });
    } catch (error: any) {
      console.error("Purchase request error:", error);
      res.status(500).json({ message: "Failed to create purchase request" });
    }
  });

  // Get child's purchase requests
  app.get("/api/child/store/purchase-requests", authMiddleware, async (req: any, res) => {
    try {
      const requests = await db
        .select({
          id: childPurchaseRequests.id,
          productId: childPurchaseRequests.productId,
          quantity: childPurchaseRequests.quantity,
          pointsPrice: childPurchaseRequests.pointsPrice,
          status: childPurchaseRequests.status,
          rejectionReason: childPurchaseRequests.rejectionReason,
          createdAt: childPurchaseRequests.createdAt,
          decidedAt: childPurchaseRequests.decidedAt,
        })
        .from(childPurchaseRequests)
        .where(eq(childPurchaseRequests.childId, req.user.childId))
        .orderBy(sql`${childPurchaseRequests.createdAt} DESC`);

      // Get product details for each request
      const enrichedRequests = await Promise.all(requests.map(async (request: typeof requests[number]) => {
        const product = await db.select().from(products).where(eq(products.id, request.productId));
        return {
          ...request,
          product: product[0] ? {
            name: product[0].name,
            nameAr: product[0].nameAr,
            image: product[0].image,
          } : null
        };
      }));

      res.json({ success: true, data: enrichedRequests });
    } catch (error: any) {
      console.error("Get purchase requests error:", error);
      res.status(500).json({ message: "Failed to get purchase requests" });
    }
  });

  // Get Subjects
  app.get("/api/subjects", async (req, res) => {
    try {
      const result = await db.select().from(subjects).where(eq(subjects.isActive, true));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get Template Tasks by Subject
  app.get("/api/subjects/:subjectId/templates", async (req, res) => {
    try {
      const { subjectId } = req.params;
      const result = await db
        .select()
        .from(templateTasks)
        .where(and(eq(templateTasks.subjectId, subjectId), eq(templateTasks.isActive, true)));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch templates error:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get All Template Tasks
  app.get("/api/template-tasks", async (req, res) => {
    try {
      const result = await db.select().from(templateTasks).where(eq(templateTasks.isActive, true));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch all templates error:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // الحصول على الأحداث والهدايا المعلقة للطفل
  app.get("/api/child/events", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      // الحصول على الأحداث غير المقرة
      const events = await db
        .select()
        .from(childEvents)
        .where(and(eq(childEvents.childId, childId), eq(childEvents.isAcknowledged, false)));

      // الحصول على الهدايا المعلقة
      const gifts = await db
        .select()
        .from(childGifts)
        .where(and(eq(childGifts.childId, childId), eq(childGifts.status, "pending")));

      // الحصول على إعدادات الإشعارات
      const settings = await db
        .select()
        .from(childNotificationSettings)
        .where(eq(childNotificationSettings.childId, childId));

      res.json({
        success: true,
        data: {
          events,
          gifts,
          settings: settings[0] || {
            mode: "popup_soft",
            repeatDelayMinutes: 5,
            requireOverlayPermission: false,
          },
        },
      });
    } catch (error: any) {
      console.error("Fetch events error:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get Child Notifications (in-app)
  app.get("/api/child/notifications", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const result = await db
        .select()
        .from(notifications)
        .where(eq(notifications.childId, childId))
        .orderBy(notifications.createdAt, "desc");

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch child notifications error:", error);
      res.status(500).json({ message: "Failed to fetch child notifications" });
    }
  });

  // Resolve / mark notification as handled by child
  app.post("/api/child/notifications/:id/resolve", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const childId = req.user.childId;

      // Ensure notification belongs to child
      const notif = await db.select().from(notifications).where(and(eq(notifications.id, id), eq(notifications.childId, childId)));
      if (!notif[0]) return res.status(404).json({ message: "Notification not found" });

      const updated = await db
        .update(notifications)
        .set({ isRead: true, status: "resolved", resolvedAt: new Date() })
        .where(eq(notifications.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Resolve notification error:", error);
      res.status(500).json({ message: "Failed to resolve notification" });
    }
  });

  // Mark notification as read (Phase 1.4 UI endpoint)
  app.put("/api/child/notifications/:id/read", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const childId = req.user.childId;

      // Ensure notification belongs to child
      const notif = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.childId, childId)));
      if (!notif[0]) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Mark as read with timestamp
      const updated = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Mark read notification error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // الاعتراف بحدث / هدية
  app.post("/api/child/events/ack/:eventId", authMiddleware, async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const childId = req.user.childId;

      // التحقق من وجود الحدث والتأكد من أنه يخص هذا الطفل
      const event = await db
        .select()
        .from(childEvents)
        .where(and(eq(childEvents.id, eventId), eq(childEvents.childId, childId)));

      if (!event[0]) {
        return res.status(404).json({ message: "Event not found" });
      }

      // تحديث الحدث
      const updated = await db
        .update(childEvents)
        .set({
          isAcknowledged: true,
          acknowledgedAt: new Date(),
        })
        .where(eq(childEvents.id, eventId))
        .returning();

      // إذا كان نوع الحدث GIFT_ASSIGNED، تحديث حالة الهدية
      if (event[0].eventType === "GIFT_ASSIGNED" && event[0].relatedId) {
        await db
          .update(childGifts)
          .set({
            status: "delivered",
            deliveredAt: new Date(),
          })
          .where(eq(childGifts.id, event[0].relatedId));
      }

      res.json({
        success: true,
        data: {
          eventId,
          message: "Event acknowledged",
        },
      });
    } catch (error: any) {
      console.error("Acknowledge event error:", error);
      res.status(500).json({ message: "Failed to acknowledge event" });
    }
  });

  // الاعتراف بالهدية (تم فتح/استقبال الهدية)
  app.post("/api/child/gifts/:giftId/acknowledge", authMiddleware, async (req: any, res) => {
    try {
      const { giftId } = req.params;
      const childId = req.user.childId;

      const gift = await db
        .select()
        .from(childGifts)
        .where(and(eq(childGifts.id, giftId), eq(childGifts.childId, childId)));

      if (!gift[0]) {
        return res.status(404).json({ message: "Gift not found" });
      }

      const updated = await db
        .update(childGifts)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
        })
        .where(eq(childGifts.id, giftId))
        .returning();

      res.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      console.error("Acknowledge gift error:", error);
      res.status(500).json({ message: "Failed to acknowledge gift" });
    }
  });

  // الحصول على الهدايا السابقة / المستلمة (point-based rewards from childGifts table)
  // Note: Store gifts (parent-sent products) are at /api/child/store-gifts in store.ts
  app.get("/api/child/gifts", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const result = await db
        .select()
        .from(childGifts)
        .where(eq(childGifts.childId, childId));

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("Fetch gifts error:", error);
      res.status(500).json({ message: "Failed to fetch gifts" });
    }
  });

  // Get child assigned rewards / products
  app.get("/api/child/rewards", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const assigned = await db.select().from(childAssignedProducts).where(eq(childAssignedProducts.childId, childId));

      const child = await db.select().from(children).where(eq(children.id, childId));
      const currentPoints = child[0]?.totalPoints || 0;

      const enriched = await Promise.all(
        assigned.map(async (a: any) => {
          const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.id, a.parentOwnedProductId));
          const product = await db.select().from(products).where(eq(products.id, owned[0]?.productId));
          return {
            ...a,
            product: product[0] || null,
            progress: {
              currentPoints,
              requiredPoints: a.requiredPoints,
              ready: currentPoints >= a.requiredPoints,
            },
          };
        })
      );

      res.json({ success: true, data: enriched });
    } catch (error: any) {
      console.error("Fetch child rewards error:", error);
      res.status(500).json({ message: "Failed to fetch child rewards" });
    }
  });

  // تعديل إعدادات الإشعارات للطفل
  app.post("/api/child/notification-settings", authMiddleware, async (req: any, res) => {
    try {
      const { mode, repeatDelayMinutes, requireOverlayPermission } = req.body;
      const childId = req.user.childId;

      if (!mode || !["popup_strict", "popup_soft", "floating_bubble"].includes(mode)) {
        return res.status(400).json({ message: "Invalid notification mode" });
      }

      // التحقق من وجود الإعدادات
      const existing = await db
        .select()
        .from(childNotificationSettings)
        .where(eq(childNotificationSettings.childId, childId));

      let result;
      if (existing[0]) {
        result = await db
          .update(childNotificationSettings)
          .set({
            mode,
            repeatDelayMinutes: repeatDelayMinutes || 5,
            requireOverlayPermission: requireOverlayPermission || false,
            updatedAt: new Date(),
          })
          .where(eq(childNotificationSettings.childId, childId))
          .returning();
      } else {
        result = await db
          .insert(childNotificationSettings)
          .values({
            childId,
            mode,
            repeatDelayMinutes: repeatDelayMinutes || 5,
            requireOverlayPermission: requireOverlayPermission || false,
          })
          .returning();
      }

      res.json({
        success: true,
        data: result[0],
      });
    } catch (error: any) {
      console.error("Update notification settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // ===== Phase 1.3: Gifts - List Child Gifts =====
  // LOGIC-001 FIX: Route conflict resolved
  // - /api/child/gifts (this file, line ~1022) → point-based rewards from childGifts table
  // - /api/child/store-gifts (store.ts) → parent-sent product gifts from gifts table

  // ===== Phase 1.3: Gifts - Activate Gift =====
  app.post("/api/child/gifts/:id/activate", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const childId = req.user.childId;

      // Lock gift row
      const gift = await db.select().from(gifts).where(eq(gifts.id, id));
      if (!gift[0]) {
        return res.status(404).json({ message: "Gift not found" });
      }
      if (gift[0].childId !== childId) {
        return res.status(403).json({ message: "Gift does not belong to this child" });
      }
      if (gift[0].status === "ACTIVATED") {
        return res.json({ success: true, message: "Gift already activated" });
      }
      if (gift[0].status !== "UNLOCKED") {
        return res.status(400).json({ message: "Gift is not unlocked yet" });
      }

      // Update entitlement to ACTIVE (childId already set)
      const ent = await db
        .select()
        .from(entitlements)
        .where(
          and(
            eq(entitlements.productId, gift[0].productId),
            eq(entitlements.parentId, gift[0].parentId),
            eq(entitlements.childId, childId)
          )
        );
      if (ent[0]) {
        await db
          .update(entitlements)
          .set({
            status: "ACTIVE",
            metadata: { ...ent[0].metadata, giftId: id, activatedAt: new Date().toISOString() },
            updatedAt: new Date(),
          })
          .where(eq(entitlements.id, ent[0].id));
      }

      // Update gift to ACTIVATED
      await db
        .update(gifts)
        .set({ status: "ACTIVATED", activatedAt: new Date() })
        .where(and(eq(gifts.id, id), eq(gifts.status, "UNLOCKED")));

      // Activity log
      await db.insert(activityLog).values({
        adminId: null,
        action: "GIFT_ACTIVATED",
        entity: "gift",
        entityId: id,
        meta: { childId, productId: gift[0].productId },
      });

      // Emit stub event
      emitGiftEvent({
        type: "gift.activated",
        giftId: id,
        parentId: gift[0].parentId,
        childId,
        productId: gift[0].productId,
        timestamp: new Date(),
      });

      res.json({ success: true, message: "Gift activated" });
    } catch (error: any) {
      console.error("Activate gift error:", error);
      res.status(500).json({ message: "Failed to activate gift" });
    }
  });

  // ===== Task Notifications (Sponsored Ad Style) =====
  app.get("/api/child/task-notifications", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.query.childId || req.user?.childId;
      
      if (!childId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "childId is required"));
      }

      // Get pending tasks assigned to this child that need notification
      const pendingTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.childId, childId),
            eq(tasks.status, "pending")
          )
        )
        .limit(5);

      // Transform tasks into notification format
      const taskNotifications = pendingTasks.map((task: typeof tasks.$inferSelect) => ({
        id: task.id,
        question: task.question,
        answers: task.answers,
        points: task.pointsReward,
        imageUrl: task.imageUrl,
        gifUrl: task.gifUrl,
      }));

      res.json(successResponse(taskNotifications));
    } catch (error: any) {
      console.error("Get task notifications error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get task notifications"));
    }
  });

  app.post("/api/child/task-notifications/complete", authMiddleware, async (req: any, res) => {
    try {
      const { notificationId, answerId } = req.body;
      const childId = req.user.childId;

      if (!notificationId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "notificationId is required"));
      }

      // Find the task
      const task = await db.select().from(tasks).where(eq(tasks.id, notificationId));
      if (!task[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Task not found"));
      }

      // Verify task belongs to child
      if (task[0].childId !== childId) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Task does not belong to this child"));
      }

      const normalizedAnswers = normalizeAnswers(task[0].answers, task[0].question);
      const selectedAnswer = normalizedAnswers.find((ans: any) => ans.id === answerId);

      if (!selectedAnswer) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid answer"));
      }

      const result = await db.transaction(async (tx) => {
        const existingCorrect = await tx
          .select()
          .from(taskResults)
          .where(and(
            eq(taskResults.taskId, notificationId),
            eq(taskResults.childId, childId),
            eq(taskResults.isCorrect, true)
          ))
          .limit(1);

        if (existingCorrect[0]) {
          return {
            status: "already" as const,
            isCorrect: true,
            pointsAwarded: existingCorrect[0].pointsEarned,
          };
        }

        if (!selectedAnswer.isCorrect) {
          await tx.insert(taskResults).values({
            taskId: notificationId,
            childId,
            selectedAnswerId: answerId,
            isCorrect: false,
            pointsEarned: 0,
          });
          return { status: "wrong" as const };
        }

        const updated = await tx
          .update(tasks)
          .set({ status: "completed" })
          .where(and(eq(tasks.id, notificationId), eq(tasks.status, "pending")))
          .returning();

        if (!updated[0]) {
          return { status: "conflict" as const };
        }

        const pointsToAward = task[0].pointsReward;

        await tx.insert(taskResults).values({
          taskId: notificationId,
          childId,
          selectedAnswerId: answerId,
          isCorrect: true,
          pointsEarned: pointsToAward,
        });

        const pointsResult = await applyPointsDelta(tx, {
          childId,
          delta: pointsToAward,
          reason: "TASK_COMPLETED",
          taskId: notificationId,
        });

        return {
          status: "correct" as const,
          isCorrect: true,
          pointsAwarded: pointsToAward,
          newTotalPoints: pointsResult.newTotalPoints,
          childName: pointsResult.childName || "طفلك",
        };
      });

      if (result.status === "already") {
        return res.json(successResponse({
          isCorrect: result.isCorrect,
          pointsAwarded: result.pointsAwarded,
        }, "Task already completed"));
      }

      if (result.status === "wrong") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Incorrect answer"));
      }

      if (result.status === "conflict") {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Task already completed"));
      }

      await unlockEligibleGifts(childId, result.newTotalPoints);

      try {
        await db
          .update(notifications)
          .set({ isRead: true, status: "resolved", resolvedAt: new Date() })
          .where(and(eq(notifications.relatedId, notificationId), eq(notifications.childId, childId)));
      } catch (notifyErr: any) {
        console.error("Failed to update notification after correct answer:", notifyErr);
      }

      const failedAttempts = await getFailedAttemptCount(notificationId, childId);
      await logTaskCompletion(childId, task[0], result.childName, failedAttempts);

      res.json(successResponse({
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
      }, "Task completed"));
    } catch (error: any) {
      console.error("Complete task notification error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to complete task"));
    }
  });

  // ===== Child Login System =====
  // PIN-based login removed - now using parent approval flow only

  // Child refresh token (auto-login with saved device)
  app.post("/api/child/refresh-token", async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }

      const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

      // Find trusted device
      const device = await db.select()
        .from(childTrustedDevices)
        .innerJoin(children, eq(childTrustedDevices.childId, children.id))
        .where(eq(childTrustedDevices.refreshTokenHash, refreshTokenHash));

      if (!device[0]) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const trustedDevice = device[0].child_trusted_devices;
      const child = device[0].children;

      // Check if device is expired or revoked
      if (trustedDevice.expiresAt < new Date() || trustedDevice.revokedAt) {
        return res.status(401).json({ message: "Token expired or revoked" });
      }

      // Update last used timestamp
      await db.update(childTrustedDevices)
        .set({ lastUsedAt: new Date() })
        .where(eq(childTrustedDevices.id, trustedDevice.id));

      // Generate new JWT
      const token = jwt.sign({ childId: child.id, type: "child" }, JWT_SECRET, { expiresIn: "30d" });

      res.json({
        success: true,
        data: {
          token,
          childId: child.id,
          childName: child.name,
        },
      });
    } catch (error: any) {
      console.error("Refresh token error:", error);
      res.status(500).json({ message: "Token refresh failed" });
    }
  });

  // ===== Child Login Request Flow (طلب تسجيل دخول الطفل مع موافقة الوالد) =====

  // Step 1: Child requests login - creates request and notifies parent
  app.post("/api/child/login-request", async (req, res) => {
    try {
      const { childName, parentCode, deviceId } = req.body;

      if (!childName || !parentCode) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child name and parent code are required"));
      }

      // Find parent by code
      const parent = await db.select().from(parents).where(eq(parents.uniqueCode, parentCode.toUpperCase()));
      if (!parent[0]) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid parent code"));
      }

      // Find child by name linked to this parent
      const linkedChildren = await db.select({
        child: children,
      })
        .from(parentChild)
        .innerJoin(children, eq(parentChild.childId, children.id))
        .where(eq(parentChild.parentId, parent[0].id));

      const matchedChild = linkedChildren.find((lc: any) => 
        lc.child.name.toLowerCase() === childName.toLowerCase().trim()
      );

      if (!matchedChild) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child not found"));
      }

      // Create login request (expires in 15 minutes)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const generatedDeviceId = deviceId || crypto.randomUUID();

      const loginRequest = await db.insert(childLoginRequests).values({
        childId: matchedChild.child.id,
        parentId: parent[0].id,
        deviceId: generatedDeviceId,
        deviceName: req.get("User-Agent") || "Unknown Device",
        browserInfo: req.get("User-Agent"),
        ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
        status: "pending",
        expiresAt,
      }).returning();

      // Notify parent
      await createNotification({
        parentId: parent[0].id,
        type: "login_code_request",
        title: `طلب دخول من ${matchedChild.child.name}`,
        message: `${matchedChild.child.name} يطلب الدخول للتطبيق. هل توافق؟`,
        style: "modal",
        priority: "urgent",
        soundAlert: true,
        metadata: {
          childId: matchedChild.child.id,
          childName: matchedChild.child.name,
          parentCode: parent[0].uniqueCode,
          loginRequestId: loginRequest[0].id,
          deviceInfo: req.get("User-Agent"),
        },
      });

      res.json(successResponse({
        requestId: loginRequest[0].id,
        status: "pending",
        expiresAt,
        message: "تم إرسال طلب الدخول للوالد. انتظر الموافقة.",
      }, "Login request created"));

    } catch (error: any) {
      console.error("Login request error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create login request"));
    }
  });

  // Step 2: Child polls for login request status
  app.get("/api/child/login-request/:id/status", async (req, res) => {
    try {
      const { id } = req.params;

      const request = await db.select().from(childLoginRequests).where(eq(childLoginRequests.id, id));
      
      if (!request[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Login request not found"));
      }

      const loginRequest = request[0];

      // Check if expired
      if (loginRequest.expiresAt < new Date() && loginRequest.status === "pending") {
        await db.update(childLoginRequests)
          .set({ status: "expired" })
          .where(eq(childLoginRequests.id, id));
        
        return res.json(successResponse({
          status: "expired",
          message: "انتهت صلاحية الطلب. يرجى إنشاء طلب جديد.",
        }, "Request expired"));
      }

      // If approved, return the token
      if (loginRequest.status === "approved" && loginRequest.sessionToken) {
        return res.json(successResponse({
          status: "approved",
          token: loginRequest.sessionToken,
          message: "تمت الموافقة! جاري تسجيل الدخول...",
        }, "Login approved"));
      }

      // If rejected
      if (loginRequest.status === "rejected") {
        return res.json(successResponse({
          status: "rejected",
          message: "تم رفض طلب الدخول من قبل الوالد.",
        }, "Login rejected"));
      }

      // Still pending
      res.json(successResponse({
        status: "pending",
        message: "في انتظار موافقة الوالد...",
      }, "Request pending"));

    } catch (error: any) {
      console.error("Check login request status error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to check status"));
    }
  });

  // Get child's trusted devices
  app.get("/api/child/trusted-devices", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      const devices = await db.select({
        id: childTrustedDevices.id,
        deviceLabel: childTrustedDevices.deviceLabel,
        lastUsedAt: childTrustedDevices.lastUsedAt,
        createdAt: childTrustedDevices.createdAt,
      })
        .from(childTrustedDevices)
        .where(and(
          eq(childTrustedDevices.childId, childId),
          sql`${childTrustedDevices.revokedAt} IS NULL`
        ));

      res.json({ success: true, data: devices });
    } catch (error: any) {
      console.error("Get trusted devices error:", error);
      res.status(500).json({ message: "Failed to get trusted devices" });
    }
  });

  // Revoke child trusted device
  app.delete("/api/child/trusted-devices/:deviceId", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { deviceId } = req.params;

      await db.update(childTrustedDevices)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(childTrustedDevices.id, deviceId),
          eq(childTrustedDevices.childId, childId)
        ));

      res.json({ success: true, message: "Device revoked" });
    } catch (error: any) {
      console.error("Revoke device error:", error);
      res.status(500).json({ message: "Failed to revoke device" });
    }
  });

  // Request login - child enters name, parent receives approval notification
  // This endpoint finds all parents linked to a child and sends them login requests
  app.post("/api/child/request-login-by-name", async (req, res) => {
    try {
      const { childName, deviceId } = req.body;

      if (!childName || childName.trim().length < 2) {
        return res.status(400).json({ message: "يرجى إدخال اسمك الكامل" });
      }

      const normalizedName = childName.toLowerCase().trim();

      // Find children with this name (case-insensitive)
      const allChildren = await db.select().from(children);
      const matchingChildren = allChildren.filter((c: any) => 
        c.name.toLowerCase().trim() === normalizedName
      );

      if (matchingChildren.length === 0) {
        return res.status(400).json({ message: "لم يتم العثور على حساب بهذا الاسم. تأكد من كتابة اسمك بالشكل الصحيح." });
      }

      // Use the first matching child (in most cases there should only be one)
      const child = matchingChildren[0];

      // Find the parent linked to this child
      const parentLinks = await db.select({
        parent: parents,
      })
        .from(parentChild)
        .innerJoin(parents, eq(parentChild.parentId, parents.id))
        .where(eq(parentChild.childId, child.id));

      if (parentLinks.length === 0) {
        return res.status(400).json({ message: "لم يتم العثور على والد مرتبط بهذا الحساب" });
      }

      const parentData = parentLinks[0].parent;
      const generatedDeviceId = deviceId || crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Create login request
      const loginRequest = await db.insert(childLoginRequests).values({
        childId: child.id,
        parentId: parentData.id,
        deviceId: generatedDeviceId,
        deviceName: req.get("User-Agent") || "Unknown Device",
        browserInfo: req.get("User-Agent"),
        ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
        status: "pending",
        expiresAt,
      }).returning();

      // Notify parent with approve/reject buttons
      await createNotification({
        parentId: parentData.id,
        type: "login_code_request",
        title: `${child.name} يطلب الدخول`,
        message: `${child.name} يريد تسجيل الدخول للتطبيق. هل توافق؟`,
        style: "modal",
        priority: "urgent",
        soundAlert: true,
        metadata: {
          childId: child.id,
          childName: child.name,
          parentCode: parentData.uniqueCode,
          loginRequestId: loginRequest[0].id,
          deviceInfo: req.get("User-Agent"),
        },
      });

      res.json({ 
        success: true, 
        data: {
          requestId: loginRequest[0].id,
          status: "pending",
          expiresAt,
        },
        message: "تم إرسال طلب الدخول لوالديك. انتظر موافقتهم." 
      });
    } catch (error: any) {
      console.error("Request login by name error:", error);
      res.status(500).json({ message: "حدث خطأ. حاول مرة أخرى." });
    }
  });

  // Child logout - with notification to parent
  app.post("/api/child/logout", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const { deviceId, revokeDevice } = req.body;

      // Get child info
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      // Get parent to send notification
      const parentLinks = await db.select({
        parent: parents,
      })
        .from(parentChild)
        .innerJoin(parents, eq(parentChild.parentId, parents.id))
        .where(eq(parentChild.childId, childId));

      // Revoke device if requested
      if (revokeDevice && deviceId) {
        await db.update(childTrustedDevices)
          .set({ revokedAt: new Date() })
          .where(and(
            eq(childTrustedDevices.id, deviceId),
            eq(childTrustedDevices.childId, childId)
          ));
      }

      // Send notification to all linked parents
      for (const link of parentLinks) {
        await createNotification({
          parentId: link.parent.id,
          type: "child_logout",
          title: "تسجيل خروج الطفل 👋",
          message: `${child[0].name} قام بتسجيل الخروج من التطبيق.`,
          style: "toast",
          metadata: { 
            childId: child[0].id, 
            childName: child[0].name,
            logoutTime: new Date().toISOString()
          }
        });
      }

      res.json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Child logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // ============ GROWTH TREE ENDPOINTS ============

  // Growth tree stage thresholds (points needed for each stage)
  const GROWTH_STAGES = [
    { stage: 1, name: "seed", minPoints: 0 },
    { stage: 2, name: "sprout", minPoints: 50 },
    { stage: 3, name: "sapling", minPoints: 150 },
    { stage: 4, name: "smallTree", minPoints: 350 },
    { stage: 5, name: "mediumTree", minPoints: 700 },
    { stage: 6, name: "largeTree", minPoints: 1200 },
    { stage: 7, name: "matureTree", minPoints: 2000 },
    { stage: 8, name: "majesticTree", minPoints: 3500 },
  ];

  function calculateTreeStage(totalPoints: number): number {
    for (let i = GROWTH_STAGES.length - 1; i >= 0; i--) {
      if (totalPoints >= GROWTH_STAGES[i].minPoints) {
        return GROWTH_STAGES[i].stage;
      }
    }
    return 1;
  }

  // Get child's growth tree
  app.get("/api/child/growth-tree", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;

      // Get or create growth tree
      let tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));
      
      if (!tree[0]) {
        // Initialize growth tree if not exists
        const newTree = await db.insert(childGrowthTrees).values({
          childId,
          currentStage: 1,
          totalGrowthPoints: 0,
        }).returning();
        tree = newTree;
      }

      // Get recent growth events
      const recentEvents = await db.select()
        .from(childGrowthEvents)
        .where(eq(childGrowthEvents.childId, childId))
        .orderBy(sql`${childGrowthEvents.occurredAt} DESC`)
        .limit(10);

      // Calculate next stage info
      const currentStageInfo = GROWTH_STAGES.find(s => s.stage === tree[0].currentStage);
      const nextStageInfo = GROWTH_STAGES.find(s => s.stage === tree[0].currentStage + 1);
      
      const response = {
        tree: tree[0],
        stages: GROWTH_STAGES,
        currentStageName: currentStageInfo?.name || "seed",
        nextStageName: nextStageInfo?.name || null,
        pointsToNextStage: nextStageInfo ? nextStageInfo.minPoints - tree[0].totalGrowthPoints : 0,
        progress: nextStageInfo 
          ? Math.min(100, ((tree[0].totalGrowthPoints - (currentStageInfo?.minPoints || 0)) / 
              (nextStageInfo.minPoints - (currentStageInfo?.minPoints || 0))) * 100)
          : 100,
        recentEvents,
      };

      res.json({ success: true, data: response });
    } catch (error: any) {
      console.error("Get growth tree error:", error);
      res.status(500).json({ message: "Failed to get growth tree" });
    }
  });

  // Record a growth event (internal function)
  async function recordGrowthEvent(childId: string, eventType: string, growthPoints: number, metadata?: Record<string, any>) {
    try {
      // Insert event
      await db.insert(childGrowthEvents).values({
        childId,
        eventType,
        growthPoints,
        metadata,
      });

      // Update growth tree
      let tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));
      
      if (!tree[0]) {
        // Initialize if not exists
        await db.insert(childGrowthTrees).values({
          childId,
          currentStage: 1,
          totalGrowthPoints: growthPoints,
        });
        tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));
      } else {
        // Update existing tree
        const newTotal = tree[0].totalGrowthPoints + growthPoints;
        const newStage = calculateTreeStage(newTotal);
        
        const updateData: Record<string, any> = {
          totalGrowthPoints: newTotal,
          lastGrowthAt: new Date(),
          updatedAt: new Date(),
        };

        // Update specific counters
        if (eventType === "task_complete") {
          updateData.tasksCompleted = tree[0].tasksCompleted + 1;
        } else if (eventType === "game_played") {
          updateData.gamesPlayed = tree[0].gamesPlayed + 1;
        } else if (eventType === "reward_earned") {
          updateData.rewardsEarned = tree[0].rewardsEarned + 1;
        }

        // Update stage if changed
        if (newStage > tree[0].currentStage) {
          updateData.currentStage = newStage;
        }

        await db.update(childGrowthTrees)
          .set(updateData)
          .where(eq(childGrowthTrees.childId, childId));
      }
    } catch (error) {
      console.error("Record growth event error:", error);
    }
  }

  // Export for use in other routes
  (global as any).recordGrowthEvent = recordGrowthEvent;

  // Get annual report for a child
  app.get("/api/child/annual-report", authMiddleware, async (req: any, res) => {
    try {
      const childId = req.user.childId;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Get monthly data for the year
      const monthlyData = [];
      
      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Count tasks completed in this month
        const tasksCompleted = await db.select({ count: sql<number>`count(*)` })
          .from(taskResults)
          .where(and(
            eq(taskResults.childId, childId),
            eq(taskResults.isCorrect, true),
            sql`${taskResults.completedAt} >= ${startDate}`,
            sql`${taskResults.completedAt} <= ${endDate}`
          ));

        // Count growth points in this month
        const growthEvents = await db.select({ 
          totalPoints: sql<number>`COALESCE(SUM(${childGrowthEvents.growthPoints}), 0)` 
        })
          .from(childGrowthEvents)
          .where(and(
            eq(childGrowthEvents.childId, childId),
            sql`${childGrowthEvents.occurredAt} >= ${startDate}`,
            sql`${childGrowthEvents.occurredAt} <= ${endDate}`
          ));

        monthlyData.push({
          month,
          monthName: new Date(year, month - 1).toLocaleDateString('ar-EG', { month: 'long' }),
          tasksCompleted: Number(tasksCompleted[0]?.count || 0),
          growthPoints: Number(growthEvents[0]?.totalPoints || 0),
        });
      }

      // Get yearly totals
      const yearlyTotals = await db.select({
        totalTasks: sql<number>`count(*)`,
        totalPoints: sql<number>`COALESCE(SUM(${taskResults.pointsEarned}), 0)`
      })
        .from(taskResults)
        .where(and(
          eq(taskResults.childId, childId),
          sql`EXTRACT(YEAR FROM ${taskResults.completedAt}) = ${year}`
        ));

      res.json({
        success: true,
        data: {
          year,
          monthlyData,
          yearlyTotals: {
            totalTasks: Number(yearlyTotals[0]?.totalTasks || 0),
            totalPoints: Number(yearlyTotals[0]?.totalPoints || 0),
          }
        }
      });
    } catch (error: any) {
      console.error("Get annual report error:", error);
      res.status(500).json({ message: "Failed to get annual report" });
    }
  });

  // Parent endpoint: Get child's annual report
  app.get("/api/parent/children/:childId/annual-report", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.parentId;
      const { childId } = req.params;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Verify parent owns this child
      const link = await db.select().from(parentChild).where(and(
        eq(parentChild.parentId, parentId),
        eq(parentChild.childId, childId)
      ));

      if (!link[0]) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get monthly data for the year
      const monthlyData = [];
      
      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const tasksCompleted = await db.select({ count: sql<number>`count(*)` })
          .from(taskResults)
          .where(and(
            eq(taskResults.childId, childId),
            eq(taskResults.isCorrect, true),
            sql`${taskResults.completedAt} >= ${startDate}`,
            sql`${taskResults.completedAt} <= ${endDate}`
          ));

        const growthEvents = await db.select({ 
          totalPoints: sql<number>`COALESCE(SUM(${childGrowthEvents.growthPoints}), 0)` 
        })
          .from(childGrowthEvents)
          .where(and(
            eq(childGrowthEvents.childId, childId),
            sql`${childGrowthEvents.occurredAt} >= ${startDate}`,
            sql`${childGrowthEvents.occurredAt} <= ${endDate}`
          ));

        monthlyData.push({
          month,
          monthName: new Date(year, month - 1).toLocaleDateString('ar-EG', { month: 'long' }),
          tasksCompleted: Number(tasksCompleted[0]?.count || 0),
          growthPoints: Number(growthEvents[0]?.totalPoints || 0),
        });
      }

      // Get child's growth tree
      const tree = await db.select().from(childGrowthTrees).where(eq(childGrowthTrees.childId, childId));

      res.json({
        success: true,
        data: {
          year,
          monthlyData,
          growthTree: tree[0] || null,
        }
      });
    } catch (error: any) {
      console.error("Get child annual report error:", error);
      res.status(500).json({ message: "Failed to get annual report" });
    }
  });

}
