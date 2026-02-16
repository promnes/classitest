import type { Express } from "express";
import { storage } from "../storage";
import {
  schools,
  schoolTeachers,
  teacherTasks,
  teacherTaskOrders,
  teacherBalances,
  templateTasks,
  parentTaskLibrary,
  taskFavorites,
  follows,
  children,
  parentChild,
  childSchoolAssignment,
  teacherReviews,
  schoolReviews,
  parents,
  tasks,
  parentWallet,
} from "../../shared/schema";
import { eq, and, sql, desc, or, ilike, inArray, count, ne, isNull } from "drizzle-orm";
import { authMiddleware } from "./middleware";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";

export function registerMarketplaceRoutes(app: Express) {
  const db = storage.db;

  // ===== Universal Search (البحث الشامل) =====
  app.get("/api/search", authMiddleware, async (req: any, res) => {
    try {
      const { q, type = "all", limit = "10", offset = "0" } = req.query;

      if (!q || String(q).trim().length < 2) {
        return res.json(successResponse({ schools: [], teachers: [], tasks: [] }));
      }

      const term = String(q).trim();
      const lim = Math.min(parseInt(limit as string) || 10, 50);
      const off = parseInt(offset as string) || 0;

      const results: { schools?: any[]; teachers?: any[]; tasks?: any[] } = {};

      // Search schools
      if (type === "all" || type === "schools") {
        const schoolResults = await db.select({
          id: schools.id,
          name: schools.name,
          nameAr: schools.nameAr,
          governorate: schools.governorate,
          city: schools.city,
          imageUrl: schools.imageUrl,
          isVerified: schools.isVerified,
          totalTeachers: schools.totalTeachers,
          totalStudents: schools.totalStudents,
        }).from(schools)
          .where(and(
            eq(schools.isActive, true),
            or(
              ilike(schools.name, `%${term}%`),
              ilike(schools.nameAr, `%${term}%`)
            )
          ))
          .orderBy(desc(schools.activityScore))
          .limit(lim)
          .offset(off);

        results.schools = schoolResults.map((s: any) => ({ ...s, _type: "school" }));
      }

      // Search teachers
      if (type === "all" || type === "teachers") {
        const teacherResults = await db.select({
          id: schoolTeachers.id,
          name: schoolTeachers.name,
          avatarUrl: schoolTeachers.avatarUrl,
          bio: schoolTeachers.bio,
          subject: schoolTeachers.subject,
          yearsExperience: schoolTeachers.yearsExperience,
          totalTasksSold: schoolTeachers.totalTasksSold,
          schoolId: schoolTeachers.schoolId,
        }).from(schoolTeachers)
          .where(and(
            eq(schoolTeachers.isActive, true),
            or(
              ilike(schoolTeachers.name, `%${term}%`),
              ilike(schoolTeachers.subject, `%${term}%`)
            )
          ))
          .orderBy(desc(schoolTeachers.activityScore))
          .limit(lim)
          .offset(off);

        results.teachers = teacherResults.map((t: any) => ({ ...t, _type: "teacher" }));
      }

      // Search teacher tasks
      if (type === "all" || type === "tasks") {
        const taskResults = await db.select({
          id: teacherTasks.id,
          title: teacherTasks.title,
          question: teacherTasks.question,
          subjectLabel: teacherTasks.subjectLabel,
          price: teacherTasks.price,
          pointsReward: teacherTasks.pointsReward,
          purchaseCount: teacherTasks.purchaseCount,
          teacherId: teacherTasks.teacherId,
          imageUrl: teacherTasks.imageUrl,
        }).from(teacherTasks)
          .where(and(
            eq(teacherTasks.isActive, true),
            eq(teacherTasks.isPublic, true),
            or(
              ilike(teacherTasks.title, `%${term}%`),
              ilike(teacherTasks.question, `%${term}%`),
              ilike(teacherTasks.subjectLabel, `%${term}%`)
            )
          ))
          .orderBy(desc(teacherTasks.purchaseCount))
          .limit(lim)
          .offset(off);

        results.tasks = taskResults.map((t: any) => ({ ...t, _type: "teacher_task" }));
      }

      res.json(successResponse(results));
    } catch (err: any) {
      console.error("Search error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في البحث"));
    }
  });

  // ===== Task Favorites (المفضلة) =====

  // Get parent's favorites
  app.get("/api/parent/favorites", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const favs = await db.select().from(taskFavorites)
        .where(eq(taskFavorites.parentId, parentId))
        .orderBy(desc(taskFavorites.createdAt));

      // Enrich with task details
      const enriched = [];
      for (const fav of favs) {
        let taskDetail: any = null;
        if (fav.taskType === "teacher_task") {
          const [t] = await db.select({
            id: teacherTasks.id,
            title: teacherTasks.title,
            question: teacherTasks.question,
            price: teacherTasks.price,
            pointsReward: teacherTasks.pointsReward,
            subjectLabel: teacherTasks.subjectLabel,
            teacherId: teacherTasks.teacherId,
            imageUrl: teacherTasks.imageUrl,
            purchaseCount: teacherTasks.purchaseCount,
          }).from(teacherTasks).where(eq(teacherTasks.id, fav.taskId)).limit(1);
          taskDetail = t || null;
        } else if (fav.taskType === "template_task") {
          const [t] = await db.select({
            id: templateTasks.id,
            title: templateTasks.title,
            question: templateTasks.question,
            pointsReward: templateTasks.pointsReward,
            pointsCost: templateTasks.pointsCost,
          }).from(templateTasks).where(eq(templateTasks.id, fav.taskId)).limit(1);
          taskDetail = t || null;
        }
        if (taskDetail) {
          enriched.push({ ...fav, task: taskDetail });
        }
      }

      res.json(successResponse({ favorites: enriched }));
    } catch (err: any) {
      console.error("Get favorites error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب المفضلة"));
    }
  });

  // Toggle favorite
  app.post("/api/parent/favorites/toggle", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { taskType, taskId } = req.body;

      if (!taskType || !taskId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "taskType و taskId مطلوبان"));
      }
      if (!["teacher_task", "template_task"].includes(taskType)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "نوع المهمة غير صالح"));
      }

      // Check if already favorited
      const existing = await db.select().from(taskFavorites)
        .where(and(
          eq(taskFavorites.parentId, parentId),
          eq(taskFavorites.taskType, taskType),
          eq(taskFavorites.taskId, taskId)
        )).limit(1);

      if (existing[0]) {
        await db.delete(taskFavorites).where(eq(taskFavorites.id, existing[0].id));
        return res.json(successResponse({ isFavorited: false, message: "تم إزالة المهمة من المفضلة" }));
      }

      await db.insert(taskFavorites).values({ parentId, taskType, taskId });
      res.json(successResponse({ isFavorited: true, message: "تم إضافة المهمة للمفضلة" }));
    } catch (err: any) {
      console.error("Toggle favorite error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في تحديث المفضلة"));
    }
  });

  // Check if a task is favorited
  app.get("/api/parent/favorites/check", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { taskType, taskId } = req.query;

      if (!taskType || !taskId) {
        return res.json(successResponse({ isFavorited: false }));
      }

      const existing = await db.select({ id: taskFavorites.id }).from(taskFavorites)
        .where(and(
          eq(taskFavorites.parentId, parentId),
          eq(taskFavorites.taskType, taskType as string),
          eq(taskFavorites.taskId, taskId as string)
        )).limit(1);

      res.json(successResponse({ isFavorited: !!existing[0] }));
    } catch (err: any) {
      console.error("Check favorite error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ"));
    }
  });

  // ===== Parent Task Library (مكتبة مهام الأهل) =====

  // Get parent's task library
  app.get("/api/parent/task-library", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const items = await db.select().from(parentTaskLibrary)
        .where(and(eq(parentTaskLibrary.parentId, parentId), eq(parentTaskLibrary.isActive, true)))
        .orderBy(desc(parentTaskLibrary.createdAt));

      res.json(successResponse({ tasks: items }));
    } catch (err: any) {
      console.error("Get task library error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب مكتبة المهام"));
    }
  });

  // Buy teacher task and add to library
  app.post("/api/parent/buy-teacher-task", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { teacherTaskId, childId, purchaseType = "permanent" } = req.body;

      if (!teacherTaskId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "معرّف المهمة مطلوب"));
      }

      // Get the teacher task
      const [task] = await db.select().from(teacherTasks)
        .where(and(eq(teacherTasks.id, teacherTaskId), eq(teacherTasks.isActive, true)))
        .limit(1);

      if (!task) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المهمة غير موجودة"));
      }

      // Get teacher info
      const [teacher] = await db.select().from(schoolTeachers)
        .where(eq(schoolTeachers.id, task.teacherId)).limit(1);

      if (!teacher) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المعلم غير موجود"));
      }

      // Check wallet balance
      const [wallet] = await db.select().from(parentWallet)
        .where(eq(parentWallet.parentId, parentId)).limit(1);

      const balance = Number(wallet?.balance || 0);
      const price = parseFloat(String(task.price));

      if (balance < price) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 
          `رصيدك غير كافٍ. الرصيد: ${balance}, السعر: ${price}`));
      }

      // Deduct from wallet
      await db.update(parentWallet).set({
        balance: sql`${parentWallet.balance} - ${price.toFixed(2)}`,
      }).where(eq(parentWallet.parentId, parentId));

      // Create order
      const commissionPct = parseFloat(String(teacher.commissionRatePct));
      const commissionAmount = (price * commissionPct) / 100;
      const teacherEarning = price - commissionAmount;

      const [order] = await db.insert(teacherTaskOrders).values({
        teacherTaskId: task.id,
        teacherId: task.teacherId,
        buyerParentId: parentId,
        childId: childId || null,
        price: price.toFixed(2),
        commissionRatePct: commissionPct.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        teacherEarningAmount: teacherEarning.toFixed(2),
        status: "completed",
        holdDays: 7,
      }).returning();

      // Update teacher stats
      await db.update(teacherTasks).set({
        purchaseCount: sql`${teacherTasks.purchaseCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(teacherTasks.id, task.id));

      await db.update(schoolTeachers).set({
        totalTasksSold: sql`${schoolTeachers.totalTasksSold} + 1`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, task.teacherId));

      // Add to pending teacher balance
      async function ensureBalance(tId: string) {
        const [existing] = await db.select().from(teacherBalances)
          .where(eq(teacherBalances.teacherId, tId)).limit(1);
        if (!existing) {
          await db.insert(teacherBalances).values({ teacherId: tId }).onConflictDoNothing();
        }
      }
      await ensureBalance(task.teacherId);
      await db.update(teacherBalances).set({
        pendingBalance: sql`${teacherBalances.pendingBalance} + ${teacherEarning.toFixed(2)}`,
        totalSalesAmount: sql`${teacherBalances.totalSalesAmount} + ${price.toFixed(2)}`,
        totalCommissionAmount: sql`${teacherBalances.totalCommissionAmount} + ${commissionAmount.toFixed(2)}`,
        updatedAt: new Date(),
      }).where(eq(teacherBalances.teacherId, task.teacherId));

      // Add to parent's task library
      const [libItem] = await db.insert(parentTaskLibrary).values({
        parentId,
        sourceType: "teacher_task",
        sourceTaskId: task.id,
        title: task.title,
        question: task.question,
        answers: task.answers,
        imageUrl: task.imageUrl,
        gifUrl: task.gifUrl,
        subjectLabel: task.subjectLabel,
        pointsReward: task.pointsReward,
        purchaseType: purchaseType as string,
      }).returning();

      res.json(successResponse({
        order,
        libraryItem: libItem,
        message: "تم شراء المهمة وإضافتها لمكتبتك بنجاح",
      }));
    } catch (err: any) {
      console.error("Buy teacher task error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في شراء المهمة"));
    }
  });

  // Use task from library — assign to child
  app.post("/api/parent/task-library/:id/use", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { id } = req.params;
      const { childId } = req.body;

      if (!childId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "معرّف الطفل مطلوب"));
      }

      // Verify parent owns this child
      const [link] = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)))
        .limit(1);
      if (!link) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "غير مصرح"));
      }

      // Get library item
      const [item] = await db.select().from(parentTaskLibrary)
        .where(and(
          eq(parentTaskLibrary.id, id),
          eq(parentTaskLibrary.parentId, parentId),
          eq(parentTaskLibrary.isActive, true)
        )).limit(1);

      if (!item) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المهمة غير موجودة في المكتبة"));
      }

      // Check wallet for points reward
      const [wallet] = await db.select().from(parentWallet)
        .where(eq(parentWallet.parentId, parentId)).limit(1);

      const balance = Number(wallet?.balance || 0);
      if (balance < item.pointsReward) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST,
          `رصيدك غير كافٍ لإرسال المهمة. الرصيد: ${balance}, المطلوب: ${item.pointsReward}`));
      }

      // Deduct points
      await db.update(parentWallet).set({
        balance: sql`${parentWallet.balance} - ${item.pointsReward}`,
      }).where(eq(parentWallet.parentId, parentId));

      // Create actual task for child
      const [newTask] = await db.insert(tasks).values({
        parentId,
        childId,
        question: item.question,
        answers: item.answers,
        imageUrl: item.imageUrl,
        gifUrl: item.gifUrl,
        pointsReward: item.pointsReward,
        status: "pending",
      }).returning();

      // Update usage count
      await db.update(parentTaskLibrary).set({
        usageCount: sql`${parentTaskLibrary.usageCount} + 1`,
      }).where(eq(parentTaskLibrary.id, id));

      // If one_time, deactivate
      if (item.purchaseType === "one_time") {
        await db.update(parentTaskLibrary).set({ isActive: false })
          .where(eq(parentTaskLibrary.id, id));
      }

      res.json(successResponse({ task: newTask, message: "تم إرسال المهمة للطفل" }));
    } catch (err: any) {
      console.error("Use library task error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إرسال المهمة"));
    }
  });

  // ===== Recommendations (التوصيات) =====
  app.get("/api/parent/recommendations", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { type = "all", limit = "10" } = req.query;
      const lim = Math.min(parseInt(limit as string) || 10, 30);

      // Get parent's children info for context
      const childLinks = await db.select({ childId: parentChild.childId })
        .from(parentChild).where(eq(parentChild.parentId, parentId));
      const childIds = childLinks.map((l: any) => l.childId);

      // Get children details (governorate, school)
      let childGovernorates: string[] = [];
      let childSchoolIds: string[] = [];

      if (childIds.length > 0) {
        const childrenData = await db.select({
          id: children.id,
          governorate: children.governorate,
        }).from(children).where(inArray(children.id, childIds));
        childGovernorates = childrenData.map((c: any) => c.governorate).filter(Boolean) as string[];

        const schoolAssignments = await db.select({ schoolId: childSchoolAssignment.schoolId })
          .from(childSchoolAssignment).where(inArray(childSchoolAssignment.childId, childIds));
        childSchoolIds = schoolAssignments.map((s: any) => s.schoolId);
      }

      // Get parent's existing follows to exclude
      const existingFollows = await db.select({
        entityType: follows.entityType,
        entityId: follows.entityId,
      }).from(follows).where(eq(follows.followerParentId, parentId));

      const followedSchoolIds = existingFollows.filter((f: any) => f.entityType === "school").map((f: any) => f.entityId);
      const followedTeacherIds = existingFollows.filter((f: any) => f.entityType === "teacher").map((f: any) => f.entityId);

      // Get existing purchases to avoid recommending same tasks
      const existingOrders = await db.select({ taskId: teacherTaskOrders.teacherTaskId })
        .from(teacherTaskOrders).where(eq(teacherTaskOrders.buyerParentId, parentId));
      const purchasedTaskIds = existingOrders.map((o: any) => o.taskId);

      const result: { teachers?: any[]; schools?: any[]; tasks?: any[] } = {};

      // Recommend teachers
      if (type === "all" || type === "teachers") {
        // Teachers from same governorate or from child's school, not already followed
        let teacherQuery = db.select({
          id: schoolTeachers.id,
          name: schoolTeachers.name,
          avatarUrl: schoolTeachers.avatarUrl,
          subject: schoolTeachers.subject,
          bio: schoolTeachers.bio,
          totalTasksSold: schoolTeachers.totalTasksSold,
          activityScore: schoolTeachers.activityScore,
          schoolId: schoolTeachers.schoolId,
        }).from(schoolTeachers)
          .where(eq(schoolTeachers.isActive, true))
          .orderBy(desc(schoolTeachers.activityScore))
          .limit(lim);

        let allTeachers = await teacherQuery;

        // Score and sort teachers
        const scoredTeachers = allTeachers
          .filter((t: any) => !followedTeacherIds.includes(t.id))
          .map((t: any) => {
            let score = t.activityScore || 0;
            // Boost if from child's school
            if (childSchoolIds.includes(t.schoolId)) score += 100;
            // Boost by tasks sold
            score += (t.totalTasksSold || 0) * 2;
            return { ...t, _score: score, _type: "teacher" };
          })
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, lim);

        result.teachers = scoredTeachers;
      }

      // Recommend schools
      if (type === "all" || type === "schools") {
        let allSchools = await db.select({
          id: schools.id,
          name: schools.name,
          nameAr: schools.nameAr,
          governorate: schools.governorate,
          imageUrl: schools.imageUrl,
          isVerified: schools.isVerified,
          totalTeachers: schools.totalTeachers,
          totalStudents: schools.totalStudents,
          activityScore: schools.activityScore,
        }).from(schools)
          .where(eq(schools.isActive, true))
          .orderBy(desc(schools.activityScore))
          .limit(lim * 2);

        const scoredSchools = allSchools
          .filter((s: any) => !followedSchoolIds.includes(s.id))
          .map((s: any) => {
            let score = s.activityScore || 0;
            // Boost if same governorate as children
            if (childGovernorates.includes(s.governorate || "")) score += 50;
            // Boost verified
            if (s.isVerified) score += 30;
            score += (s.totalTeachers || 0) * 3;
            return { ...s, _score: score, _type: "school" };
          })
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, lim);

        result.schools = scoredSchools;
      }

      // Recommend tasks
      if (type === "all" || type === "tasks") {
        let allTasks = await db.select({
          id: teacherTasks.id,
          title: teacherTasks.title,
          question: teacherTasks.question,
          price: teacherTasks.price,
          pointsReward: teacherTasks.pointsReward,
          subjectLabel: teacherTasks.subjectLabel,
          purchaseCount: teacherTasks.purchaseCount,
          teacherId: teacherTasks.teacherId,
          imageUrl: teacherTasks.imageUrl,
        }).from(teacherTasks)
          .where(and(
            eq(teacherTasks.isActive, true),
            eq(teacherTasks.isPublic, true)
          ))
          .orderBy(desc(teacherTasks.purchaseCount))
          .limit(lim * 3);

        const scoredTasks = allTasks
          .filter((t: any) => !purchasedTaskIds.includes(t.id))
          .map((t: any) => {
            let score = (t.purchaseCount || 0) * 5;
            // Boost if from followed teacher
            if (followedTeacherIds.includes(t.teacherId)) score += 50;
            // Boost if from child's school teacher
            return { ...t, _score: score, _type: "teacher_task" };
          })
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, lim);

        result.tasks = scoredTasks;
      }

      res.json(successResponse(result));
    } catch (err: any) {
      console.error("Recommendations error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في التوصيات"));
    }
  });

  // ===== Parent Profile Data (بيانات ملف الأهل) =====
  app.get("/api/parent/profile-data", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      // Get parent info
      const [parent] = await db.select({
        id: parents.id,
        name: parents.name,
        email: parents.email,
        avatarUrl: parents.avatarUrl,
        coverImageUrl: parents.coverImageUrl,
        bio: parents.bio,
        governorate: parents.governorate,
        city: parents.city,
        socialLinks: parents.socialLinks,
      }).from(parents).where(eq(parents.id, parentId)).limit(1);

      // Get follow counts
      const [followCounts] = await db.select({
        following: count(),
      }).from(follows).where(eq(follows.followerParentId, parentId));

      // Get library task count
      const [libCount] = await db.select({
        count: count(),
      }).from(parentTaskLibrary).where(and(
        eq(parentTaskLibrary.parentId, parentId),
        eq(parentTaskLibrary.isActive, true)
      ));

      // Get favorites count
      const [favCount] = await db.select({
        count: count(),
      }).from(taskFavorites).where(eq(taskFavorites.parentId, parentId));

      // Get children count
      const [childCount] = await db.select({
        count: count(),
      }).from(parentChild).where(eq(parentChild.parentId, parentId));

      res.json(successResponse({
        parent,
        stats: {
          following: followCounts?.following || 0,
          libraryTasks: libCount?.count || 0,
          favorites: favCount?.count || 0,
          children: childCount?.count || 0,
        },
      }));
    } catch (err: any) {
      console.error("Profile data error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في بيانات الملف"));
    }
  });

  // Get parent's followed entities
  app.get("/api/parent/following", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { type } = req.query;

      let query = db.select().from(follows)
        .where(eq(follows.followerParentId, parentId))
        .orderBy(desc(follows.createdAt));

      let results = await query;

      if (type) {
        results = results.filter((f: any) => f.entityType === type);
      }

      // Enrich with entity details
      const enriched = [];
      for (const f of results) {
        let entity: any = null;
        if (f.entityType === "school") {
          const [s] = await db.select({
            id: schools.id, name: schools.name, imageUrl: schools.imageUrl, governorate: schools.governorate,
          }).from(schools).where(eq(schools.id, f.entityId)).limit(1);
          entity = s;
        } else if (f.entityType === "teacher") {
          const [t] = await db.select({
            id: schoolTeachers.id, name: schoolTeachers.name, avatarUrl: schoolTeachers.avatarUrl, subject: schoolTeachers.subject,
          }).from(schoolTeachers).where(eq(schoolTeachers.id, f.entityId)).limit(1);
          entity = t;
        } else if (f.entityType === "library") {
          // Libraries use a different table, skip for now
        }
        if (entity) {
          enriched.push({ ...f, entity });
        }
      }

      res.json(successResponse({ following: enriched }));
    } catch (err: any) {
      console.error("Get following error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ"));
    }
  });
}
