import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  schools,
  schoolTeachers,
  schoolPosts,
  schoolPostComments,
  schoolPostLikes,
  teacherReviews,
  teacherTasks,
  teacherTaskOrders,
  teacherBalances,
  teacherWithdrawalRequests,
  teacherHiring,
  childTeacherAssignment,
  parentChild,
  schoolActivityLogs,
  parents,
  children,
  templateTasks,
  subjects,
  schoolPolls,
  schoolPollVotes,
  notifications,
} from "../../shared/schema";
import { eq, desc, and, sql, lte, count } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createPresignedUpload, finalizeUpload } from "../services/uploadService";
import { finalizeUploadSchema } from "../../shared/media";
import { notifyAllAdmins } from "../notifications";
import { NOTIFICATION_TYPES, NOTIFICATION_STYLES, NOTIFICATION_PRIORITIES } from "../../shared/notificationTypes";

const db = storage.db;
const JWT_SECRET = process.env["JWT_SECRET"] ?? "";

if (!JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable is required. Teacher authentication cannot start without it.");
}

// ===== Teacher Middleware =====

interface TeacherRequest extends Request {
  teacher?: { teacherId: string; schoolId: string };
}

const teacherMiddleware = async (req: TeacherRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { teacherId: string; schoolId: string; type: string; exp?: number };

    if (decoded.type !== "teacher") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({ message: "Token expired" });
    }

    const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, decoded.teacherId));
    if (!teacher[0] || !teacher[0].isActive) {
      return res.status(401).json({ message: "Teacher account is deactivated" });
    }

    req.teacher = { teacherId: decoded.teacherId, schoolId: decoded.schoolId };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ===== Helper Functions =====

async function ensureTeacherBalance(teacherId: string) {
  const rows = await db.select().from(teacherBalances).where(eq(teacherBalances.teacherId, teacherId)).limit(1);
  if (rows[0]) return rows[0];
  const created = await db.insert(teacherBalances).values({ teacherId }).returning();
  return created[0];
}

async function settleMaturedTeacherOrders(teacherId: string) {
  const now = new Date();
  // Orders that are completed and past hold days
  const maturedOrders = await db.select().from(teacherTaskOrders).where(
    and(
      eq(teacherTaskOrders.teacherId, teacherId),
      eq(teacherTaskOrders.status, "completed"),
      eq(teacherTaskOrders.isSettled, false),
    )
  );

  // Filter by hold days
  const readyOrders = maturedOrders.filter((order: any) => {
    const createdDate = new Date(order.createdAt);
    const holdMs = (order.holdDays || 7) * 24 * 60 * 60 * 1000;
    return now.getTime() > createdDate.getTime() + holdMs;
  });

  if (!readyOrders.length) {
    return { maturedCount: 0, releasedAmount: 0 };
  }

  const releasedAmount = readyOrders.reduce((sum: number, row: any) => sum + (parseFloat(String(row.teacherEarningAmount || "0")) || 0), 0);
  const orderIds = readyOrders.map((o: any) => o.id);

  await db.transaction(async (tx: any) => {
    for (const orderId of orderIds) {
      await tx
        .update(teacherTaskOrders)
        .set({ isSettled: true, settledAt: now })
        .where(eq(teacherTaskOrders.id, orderId));
    }

    const existingBalance = await tx.select().from(teacherBalances).where(eq(teacherBalances.teacherId, teacherId)).limit(1);
    if (!existingBalance[0]) {
      await tx.insert(teacherBalances).values({
        teacherId,
        pendingBalance: "0.00",
        availableBalance: releasedAmount.toFixed(2),
      });
    } else {
      await tx
        .update(teacherBalances)
        .set({
          pendingBalance: sql`GREATEST(0, ${teacherBalances.pendingBalance} - ${releasedAmount.toFixed(2)})`,
          availableBalance: sql`${teacherBalances.availableBalance} + ${releasedAmount.toFixed(2)}`,
          updatedAt: now,
        })
        .where(eq(teacherBalances.teacherId, teacherId));
    }
  });

  return { maturedCount: readyOrders.length, releasedAmount };
}

// ===== Register Routes =====

export async function registerTeacherRoutes(app: Express) {

  // ===== Auth =====

  app.post("/api/teacher/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.username, username));
      if (!teacher[0]) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      if (!teacher[0].isActive) {
        return res.status(401).json({ message: "الحساب غير نشط" });
      }

      const passwordMatch = await bcrypt.compare(password, teacher[0].password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      // Check if the school is also active
      const school = await db.select().from(schools).where(eq(schools.id, teacher[0].schoolId));
      if (!school[0] || !school[0].isActive) {
        return res.status(401).json({ message: "المدرسة المرتبطة غير نشطة" });
      }

      const token = jwt.sign(
        { teacherId: teacher[0].id, schoolId: teacher[0].schoolId, type: "teacher" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({
        success: true,
        token,
        teacher: {
          id: teacher[0].id,
          name: teacher[0].name,
          avatarUrl: teacher[0].avatarUrl,
          subject: teacher[0].subject,
          schoolId: teacher[0].schoolId,
          schoolName: school[0].name,
        }
      });
    } catch (error: any) {
      console.error("Teacher login error:", error);
      res.status(500).json({ message: "فشل تسجيل الدخول" });
    }
  });

  // ===== Profile =====

  app.get("/api/teacher/profile", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId));

      if (!teacher[0]) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      const { password, ...safeTeacher } = teacher[0];

      const school = await db.select({ name: schools.name, imageUrl: schools.imageUrl }).from(schools).where(eq(schools.id, teacher[0].schoolId));
      const tasksCount = await db.select().from(teacherTasks).where(eq(teacherTasks.teacherId, teacherId));
      const studentsCount = await db.select().from(childTeacherAssignment).where(eq(childTeacherAssignment.teacherId, teacherId));
      const reviewsData = await db.select().from(teacherReviews).where(eq(teacherReviews.teacherId, teacherId));
      const postsCount = await db.select().from(schoolPosts).where(and(eq(schoolPosts.teacherId, teacherId), eq(schoolPosts.authorType, "teacher")));

      const avgRating = reviewsData.length > 0
        ? reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length
        : 0;

      res.json({
        success: true,
        data: {
          ...safeTeacher,
          schoolName: school[0]?.name,
          schoolImageUrl: school[0]?.imageUrl,
          stats: {
            tasksCount: tasksCount.length,
            studentsCount: studentsCount.length,
            postsCount: postsCount.length,
            reviewsCount: reviewsData.length,
            avgRating: Math.round(avgRating * 10) / 10,
          }
        }
      });
    } catch (error: any) {
      console.error("Get teacher profile error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/teacher/profile", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { name, avatarUrl, coverImageUrl, birthday, bio, subject, yearsExperience, socialLinks } = req.body;

      const updates: any = { updatedAt: new Date() };
      if (name) updates.name = name;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
      if (birthday !== undefined) updates.birthday = birthday;
      if (bio !== undefined) updates.bio = bio;
      if (subject !== undefined) updates.subject = subject;
      if (yearsExperience !== undefined) updates.yearsExperience = yearsExperience;
      if (socialLinks !== undefined) updates.socialLinks = socialLinks;

      const updated = await db.update(schoolTeachers).set(updates)
        .where(eq(schoolTeachers.id, teacherId))
        .returning();

      const { password, ...safe } = updated[0];
      res.json({ success: true, data: safe });
    } catch (error: any) {
      console.error("Update teacher profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ===== File Uploads =====

  app.post("/api/teacher/uploads/presign", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const body = z
        .object({
          contentType: z.string().min(1),
          size: z.number().int().positive(),
          purpose: z.string().min(1),
          originalName: z.string().min(1),
        })
        .parse(req.body);

      const result = await createPresignedUpload({
        actor: { type: "parent", id: req.teacher!.teacherId },
        purpose: body.purpose,
        contentType: body.contentType,
        size: body.size,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error("Teacher upload presign error:", error);
      res.status(500).json({ success: false, message: "فشل إنشاء رابط الرفع" });
    }
  });

  app.post("/api/teacher/uploads/finalize", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const body = finalizeUploadSchema.parse(req.body);
      const media = await finalizeUpload({
        actor: { type: "parent", id: req.teacher!.teacherId },
        input: body,
      });

      res.json({ success: true, data: media });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error?.message === "OBJECT_NOT_FOUND") {
        return res.status(400).json({ success: false, message: "الملف غير موجود في التخزين" });
      }
      console.error("Teacher upload finalize error:", error);
      res.status(500).json({ success: false, message: "فشل تأكيد رفع الملف" });
    }
  });

  app.put("/api/teacher/uploads/proxy", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const uploadURL = String(req.headers["x-upload-url"] || "").trim();
      if (!uploadURL) {
        return res.status(400).json({ success: false, message: "رابط الرفع مطلوب" });
      }

      let parsed: URL;
      try {
        parsed = new URL(uploadURL);
      } catch {
        return res.status(400).json({ success: false, message: "رابط رفع غير صالح" });
      }

      const allowedHosts = new Set<string>([
        "127.0.0.1",
        "localhost",
        "minio",
        String(process.env["MINIO_ENDPOINT"] || "").trim(),
      ].filter(Boolean));

      if (!allowedHosts.has(parsed.hostname)) {
        return res.status(400).json({ success: false, message: "نطاق رابط الرفع غير مسموح" });
      }

      const upstreamRequestInit: any = {
        method: "PUT",
        headers: {
          "Content-Type": String(req.headers["content-type"] || "application/octet-stream"),
          ...(req.headers["content-length"] ? { "Content-Length": String(req.headers["content-length"]) } : {}),
        },
        body: req as any,
        duplex: "half",
      };

      const upstreamRes = await fetch(uploadURL, upstreamRequestInit);

      if (!upstreamRes.ok) {
        const details = await upstreamRes.text().catch(() => "");
        return res.status(502).json({
          success: false,
          message: "فشل رفع الملف إلى التخزين",
          details: details.slice(0, 500),
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Teacher upload proxy error:", error);
      return res.status(500).json({ success: false, message: "فشل رفع الملف عبر الخادم" });
    }
  });

  // ===== Posts (Teacher perspective) =====

  app.get("/api/teacher/posts", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const posts = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.teacherId, teacherId), eq(schoolPosts.authorType, "teacher")))
        .orderBy(desc(schoolPosts.createdAt));

      res.json({ success: true, data: posts });
    } catch (error: any) {
      console.error("Get teacher posts error:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/teacher/posts", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const schoolId = req.teacher!.schoolId;
      const { content, mediaUrls, mediaTypes } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "محتوى المنشور مطلوب" });
      }

      const post = await db.insert(schoolPosts).values({
        schoolId,
        teacherId,
        authorType: "teacher",
        content: content.trim(),
        mediaUrls: mediaUrls || [],
        mediaTypes: mediaTypes || [],
      }).returning();

      // Log activity for the school
      await db.insert(schoolActivityLogs).values({
        schoolId,
        teacherId,
        action: "teacher_post_created",
        points: 2,
        metadata: { postId: post[0].id },
      });

      await db.update(schools)
        .set({
          activityScore: sql`${schools.activityScore} + 2`,
          updatedAt: new Date(),
        })
        .where(eq(schools.id, schoolId));

      res.json({ success: true, data: post[0] });
    } catch (error: any) {
      console.error("Create teacher post error:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.put("/api/teacher/posts/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;
      const { content, mediaUrls, mediaTypes, isActive } = req.body;

      const post = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.id, id), eq(schoolPosts.teacherId, teacherId), eq(schoolPosts.authorType, "teacher")));

      if (!post[0]) {
        return res.status(404).json({ message: "المنشور غير موجود" });
      }

      const updates: any = { updatedAt: new Date() };
      if (content) updates.content = content.trim();
      if (mediaUrls !== undefined) updates.mediaUrls = mediaUrls;
      if (mediaTypes !== undefined) updates.mediaTypes = mediaTypes;
      if (typeof isActive === "boolean") updates.isActive = isActive;

      const updated = await db.update(schoolPosts).set(updates)
        .where(eq(schoolPosts.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update teacher post error:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete("/api/teacher/posts/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;

      const post = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.id, id), eq(schoolPosts.teacherId, teacherId), eq(schoolPosts.authorType, "teacher")));

      if (!post[0]) {
        return res.status(404).json({ message: "المنشور غير موجود" });
      }

      await db.delete(schoolPosts).where(eq(schoolPosts.id, id));
      res.json({ success: true, message: "تم حذف المنشور" });
    } catch (error: any) {
      console.error("Delete teacher post error:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // ===== Tasks CRUD =====

  app.get("/api/teacher/tasks", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const tasks = await db.select().from(teacherTasks)
        .where(eq(teacherTasks.teacherId, teacherId))
        .orderBy(desc(teacherTasks.createdAt));

      res.json({ success: true, data: tasks });
    } catch (error: any) {
      console.error("Get teacher tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/teacher/tasks", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { title, question, answers, imageUrl, gifUrl, videoUrl, coverImageUrl, questionImages, subjectLabel, pointsReward, price } = req.body;

      if (!title || !question || !answers || !price) {
        return res.status(400).json({ message: "العنوان والسؤال والإجابات والسعر مطلوبة" });
      }

      if (!Array.isArray(answers) || answers.length < 2) {
        return res.status(400).json({ message: "يجب أن يكون هناك إجابتان على الأقل" });
      }

      const hasCorrect = answers.some((a: any) => a.isCorrect);
      if (!hasCorrect) {
        return res.status(400).json({ message: "يجب تحديد إجابة صحيحة واحدة على الأقل" });
      }

      const task = await db.insert(teacherTasks).values({
        teacherId,
        title,
        question,
        answers,
        imageUrl: imageUrl || null,
        gifUrl: gifUrl || null,
        videoUrl: videoUrl || null,
        coverImageUrl: coverImageUrl || null,
        questionImages: questionImages || [],
        subjectLabel: subjectLabel || null,
        pointsReward: pointsReward || 10,
        price: String(price),
      }).returning();

      // Update teacher activity score
      await db.update(schoolTeachers).set({
        activityScore: sql`${schoolTeachers.activityScore} + 3`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      res.json({ success: true, data: task[0] });
    } catch (error: any) {
      console.error("Create teacher task error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/teacher/tasks/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;
      const { title, question, answers, imageUrl, gifUrl, videoUrl, coverImageUrl, questionImages, subjectLabel, pointsReward, price, isActive, isPublic } = req.body;

      const task = await db.select().from(teacherTasks)
        .where(and(eq(teacherTasks.id, id), eq(teacherTasks.teacherId, teacherId)));

      if (!task[0]) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }

      const updates: any = { updatedAt: new Date() };
      if (title) updates.title = title;
      if (question) updates.question = question;
      if (answers) updates.answers = answers;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (gifUrl !== undefined) updates.gifUrl = gifUrl;
      if (videoUrl !== undefined) updates.videoUrl = videoUrl;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
      if (questionImages !== undefined) updates.questionImages = questionImages;
      if (subjectLabel !== undefined) updates.subjectLabel = subjectLabel;
      if (pointsReward !== undefined) updates.pointsReward = pointsReward;
      if (price !== undefined) updates.price = String(price);
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (typeof isPublic === "boolean") updates.isPublic = isPublic;

      const updated = await db.update(teacherTasks).set(updates)
        .where(eq(teacherTasks.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update teacher task error:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/teacher/tasks/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;

      const task = await db.select().from(teacherTasks)
        .where(and(eq(teacherTasks.id, id), eq(teacherTasks.teacherId, teacherId)));

      if (!task[0]) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }

      // Check if task has orders
      const orders = await db.select().from(teacherTaskOrders).where(eq(teacherTaskOrders.teacherTaskId, id));
      if (orders.length > 0) {
        // Soft-delete
        await db.update(teacherTasks).set({ isActive: false, updatedAt: new Date() }).where(eq(teacherTasks.id, id));
        return res.json({ success: true, message: "تم تعطيل المهمة (لا يمكن حذفها لوجود طلبات)" });
      }

      await db.delete(teacherTasks).where(eq(teacherTasks.id, id));
      res.json({ success: true, message: "تم حذف المهمة" });
    } catch (error: any) {
      console.error("Delete teacher task error:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // ===== Orders =====

  app.get("/api/teacher/orders", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const orders = await db.select({
        order: teacherTaskOrders,
        taskTitle: teacherTasks.title,
        buyerName: parents.name,
        childName: children.name,
      })
        .from(teacherTaskOrders)
        .leftJoin(teacherTasks, eq(teacherTaskOrders.teacherTaskId, teacherTasks.id))
        .leftJoin(parents, eq(teacherTaskOrders.buyerParentId, parents.id))
        .leftJoin(children, eq(teacherTaskOrders.childId, children.id))
        .where(eq(teacherTaskOrders.teacherId, teacherId))
        .orderBy(desc(teacherTaskOrders.createdAt));

      const data = orders.map((row: any) => ({
        ...row.order,
        taskTitle: row.taskTitle,
        buyerName: row.buyerName,
        childName: row.childName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get teacher orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // ===== Balance & Withdrawals =====

  app.get("/api/teacher/balance", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      await settleMaturedTeacherOrders(teacherId);

      const balance = await ensureTeacherBalance(teacherId);
      const pendingWithdrawals = await db
        .select()
        .from(teacherWithdrawalRequests)
        .where(and(eq(teacherWithdrawalRequests.teacherId, teacherId), eq(teacherWithdrawalRequests.status, "pending")))
        .orderBy(desc(teacherWithdrawalRequests.requestedAt));

      res.json({
        success: true,
        data: {
          ...balance,
          pendingWithdrawals,
        },
      });
    } catch (error: any) {
      console.error("Get teacher balance error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch balance" });
    }
  });

  app.post("/api/teacher/withdrawals", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { amount, paymentMethod, paymentDetails } = req.body || {};

      const requestedAmount = parseFloat(String(amount || 0));
      if (!requestedAmount || requestedAmount <= 0) {
        return res.status(400).json({ success: false, message: "مبلغ السحب غير صحيح" });
      }
      if (!paymentMethod) {
        return res.status(400).json({ success: false, message: "طريقة الدفع مطلوبة" });
      }

      await settleMaturedTeacherOrders(teacherId);
      const balance = await ensureTeacherBalance(teacherId);
      const available = parseFloat(String(balance.availableBalance || "0")) || 0;
      if (requestedAmount > available) {
        return res.status(400).json({ success: false, message: "الرصيد المتاح غير كافٍ" });
      }

      // Get withdrawal commission from teacher's school
      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId)).limit(1);
      const school = teacher[0] ? await db.select().from(schools).where(eq(schools.id, teacher[0].schoolId)).limit(1) : [];
      const withdrawalCommPct = parseFloat(String(school[0]?.withdrawalCommissionPct || "0"));
      const commissionAmount = (requestedAmount * withdrawalCommPct) / 100;
      const netAmount = requestedAmount - commissionAmount;

      const now = new Date();
      const created = await db.transaction(async (tx: any) => {
        await tx
          .update(teacherBalances)
          .set({
            availableBalance: sql`${teacherBalances.availableBalance} - ${requestedAmount.toFixed(2)}`,
            updatedAt: now,
          })
          .where(eq(teacherBalances.teacherId, teacherId));

        const inserted = await tx.insert(teacherWithdrawalRequests).values({
          teacherId,
          amount: requestedAmount.toFixed(2),
          paymentMethod: String(paymentMethod),
          paymentDetails: paymentDetails || null,
          withdrawalCommissionPct: withdrawalCommPct.toFixed(2),
          withdrawalCommissionAmount: commissionAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          status: "pending",
        }).returning();

        return inserted[0];
      });

      // Notify admins about new teacher withdrawal request
      try {
        const teacherInfo = await db.select({ name: schoolTeachers.name }).from(schoolTeachers).where(eq(schoolTeachers.id, teacherId)).limit(1);
        const teacherName = teacherInfo[0]?.name || "معلم";
        await notifyAllAdmins({
          type: NOTIFICATION_TYPES.WITHDRAWAL_APPROVED,
          title: "💰 طلب سحب معلم",
          message: `${teacherName} طلب سحب ₪${requestedAmount.toFixed(2)} عبر ${paymentMethod}`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.URGENT,
          soundAlert: true,
          relatedId: created.id,
          metadata: { teacherId, teacherName, amount: requestedAmount, paymentMethod },
        });
      } catch (err) {
        console.error("Failed to notify admins about teacher withdrawal:", err);
      }

      res.json({ success: true, data: created, message: "تم إرسال طلب السحب" });
    } catch (error: any) {
      console.error("Create teacher withdrawal error:", error);
      res.status(500).json({ success: false, message: "Failed to create withdrawal request" });
    }
  });

  app.get("/api/teacher/withdrawals", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const rows = await db
        .select()
        .from(teacherWithdrawalRequests)
        .where(eq(teacherWithdrawalRequests.teacherId, teacherId))
        .orderBy(desc(teacherWithdrawalRequests.requestedAt));
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Get teacher withdrawals error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch withdrawals" });
    }
  });

  // ===== Students =====

  app.get("/api/teacher/students", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const assignments = await db.select({
        assignment: childTeacherAssignment,
        childName: children.name,
        childAvatar: children.avatarUrl,
        parentName: parents.name,
      })
        .from(childTeacherAssignment)
        .leftJoin(children, eq(childTeacherAssignment.childId, children.id))
        .leftJoin(parentChild, eq(childTeacherAssignment.childId, parentChild.childId))
        .leftJoin(parents, eq(parentChild.parentId, parents.id))
        .where(eq(childTeacherAssignment.teacherId, teacherId))
        .orderBy(desc(childTeacherAssignment.createdAt));

      const data = assignments.map((row: any) => ({
        ...row.assignment,
        childName: row.childName,
        childAvatar: row.childAvatar,
        parentName: row.parentName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get teacher students error:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // ===== Hiring Contracts =====

  app.get("/api/teacher/contracts", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const contracts = await db.select({
        contract: teacherHiring,
        parentName: parents.name,
        childName: children.name,
      })
        .from(teacherHiring)
        .leftJoin(parents, eq(teacherHiring.parentId, parents.id))
        .leftJoin(children, eq(teacherHiring.childId, children.id))
        .where(eq(teacherHiring.teacherId, teacherId))
        .orderBy(desc(teacherHiring.createdAt));

      const data = contracts.map((row: any) => ({
        ...row.contract,
        parentName: row.parentName,
        childName: row.childName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get teacher contracts error:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // ===== Reviews (read-only) =====

  app.get("/api/teacher/reviews", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const reviews = await db.select({
        review: teacherReviews,
        parentName: parents.name,
      })
        .from(teacherReviews)
        .leftJoin(parents, eq(teacherReviews.parentId, parents.id))
        .where(eq(teacherReviews.teacherId, teacherId))
        .orderBy(desc(teacherReviews.createdAt));

      const data = reviews.map((row: any) => ({
        ...row.review,
        parentName: row.parentName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get teacher reviews error:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // ===== Dashboard Stats =====

  app.get("/api/teacher/stats", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;

      const [teacherData] = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId));
      const tasksList = await db.select().from(teacherTasks).where(eq(teacherTasks.teacherId, teacherId));
      const ordersList = await db.select().from(teacherTaskOrders).where(eq(teacherTaskOrders.teacherId, teacherId));
      const studentsList = await db.select().from(childTeacherAssignment).where(eq(childTeacherAssignment.teacherId, teacherId));
      const reviewsList = await db.select().from(teacherReviews).where(eq(teacherReviews.teacherId, teacherId));
      const balance = await ensureTeacherBalance(teacherId);

      const avgRating = reviewsList.length > 0
        ? reviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsList.length
        : 0;

      const totalRevenue = ordersList.reduce((sum: number, o: any) => sum + (parseFloat(String(o.teacherEarningAmount || "0")) || 0), 0);

      res.json({
        success: true,
        data: {
          activityScore: teacherData?.activityScore || 0,
          totalTasks: tasksList.length,
          activeTasks: tasksList.filter((t: any) => t.isActive).length,
          totalOrders: ordersList.length,
          totalStudents: studentsList.length,
          totalReviews: reviewsList.length,
          avgRating: Math.round(avgRating * 10) / 10,
          totalRevenue: totalRevenue.toFixed(2),
          availableBalance: balance.availableBalance,
          pendingBalance: balance.pendingBalance,
        }
      });
    } catch (error: any) {
      console.error("Get teacher stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ===== Public Teacher Profile =====

  app.get("/api/store/teachers/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const teacher = await db.select({
        id: schoolTeachers.id,
        name: schoolTeachers.name,
        avatarUrl: schoolTeachers.avatarUrl,
        coverImageUrl: schoolTeachers.coverImageUrl,
        bio: schoolTeachers.bio,
        subject: schoolTeachers.subject,
        yearsExperience: schoolTeachers.yearsExperience,
        pricingModel: schoolTeachers.pricingModel,
        monthlyRate: schoolTeachers.monthlyRate,
        perTaskRate: schoolTeachers.perTaskRate,
        socialLinks: schoolTeachers.socialLinks,
        activityScore: schoolTeachers.activityScore,
        totalTasksSold: schoolTeachers.totalTasksSold,
        totalStudents: schoolTeachers.totalStudents,
        schoolId: schoolTeachers.schoolId,
        createdAt: schoolTeachers.createdAt,
      }).from(schoolTeachers)
        .where(and(eq(schoolTeachers.id, id), eq(schoolTeachers.isActive, true)));

      if (!teacher[0]) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      // Get school info
      const school = await db.select({
        id: schools.id,
        name: schools.name,
        imageUrl: schools.imageUrl,
      }).from(schools).where(eq(schools.id, teacher[0].schoolId));

      // Get tasks
      const tasks = await db.select().from(teacherTasks)
        .where(and(eq(teacherTasks.teacherId, id), eq(teacherTasks.isActive, true), eq(teacherTasks.isPublic, true)))
        .orderBy(desc(teacherTasks.createdAt));

      // Get reviews
      const reviews = await db.select({
        review: teacherReviews,
        parentName: parents.name,
      })
        .from(teacherReviews)
        .leftJoin(parents, eq(teacherReviews.parentId, parents.id))
        .where(and(eq(teacherReviews.teacherId, id), eq(teacherReviews.isActive, true)))
        .orderBy(desc(teacherReviews.createdAt))
        .limit(20);

      const reviewsData = reviews.map((row: any) => ({
        ...row.review,
        parentName: row.parentName,
      }));

      const avgRating = reviewsData.length > 0
        ? reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length
        : 0;

      // Get posts
      const posts = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.teacherId, id), eq(schoolPosts.authorType, "teacher"), eq(schoolPosts.isActive, true)))
        .orderBy(desc(schoolPosts.createdAt))
        .limit(20);

      res.json({
        success: true,
        data: {
          ...teacher[0],
          school: school[0] || null,
          tasks,
          reviews: reviewsData,
          avgRating: Math.round(avgRating * 10) / 10,
          posts,
        }
      });
    } catch (error: any) {
      console.error("Get public teacher profile error:", error);
      res.status(500).json({ message: "Failed to fetch teacher" });
    }
  });

  // ===== Public: Buy Teacher Task =====

  app.post("/api/store/teachers/:teacherId/tasks/:taskId/buy", async (req, res) => {
    try {
      const { teacherId, taskId } = req.params;
      const { parentId, childId } = req.body;

      if (!parentId) {
        return res.status(400).json({ message: "Parent ID required" });
      }

      const task = await db.select().from(teacherTasks).where(
        and(eq(teacherTasks.id, taskId), eq(teacherTasks.teacherId, teacherId), eq(teacherTasks.isActive, true))
      );

      if (!task[0]) {
        return res.status(404).json({ message: "المهمة غير موجودة" });
      }

      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, teacherId)).limit(1);
      if (!teacher[0]) {
        return res.status(404).json({ message: "المعلم غير موجود" });
      }

      const price = parseFloat(String(task[0].price));
      const commissionPct = parseFloat(String(teacher[0].commissionRatePct));
      const commissionAmount = (price * commissionPct) / 100;
      const teacherEarning = price - commissionAmount;

      const order = await db.insert(teacherTaskOrders).values({
        teacherTaskId: taskId,
        teacherId,
        buyerParentId: parentId,
        childId: childId || null,
        price: price.toFixed(2),
        commissionRatePct: commissionPct.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        teacherEarningAmount: teacherEarning.toFixed(2),
        status: "completed",
        holdDays: 7,
      }).returning();

      // Update task purchase count
      await db.update(teacherTasks).set({
        purchaseCount: sql`${teacherTasks.purchaseCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(teacherTasks.id, taskId));

      // Update teacher stats
      await db.update(schoolTeachers).set({
        totalTasksSold: sql`${schoolTeachers.totalTasksSold} + 1`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      // Add to pending balance
      await ensureTeacherBalance(teacherId);
      await db.update(teacherBalances).set({
        pendingBalance: sql`${teacherBalances.pendingBalance} + ${teacherEarning.toFixed(2)}`,
        totalSalesAmount: sql`${teacherBalances.totalSalesAmount} + ${price.toFixed(2)}`,
        totalCommissionAmount: sql`${teacherBalances.totalCommissionAmount} + ${commissionAmount.toFixed(2)}`,
        updatedAt: new Date(),
      }).where(eq(teacherBalances.teacherId, teacherId));

      res.json({ success: true, data: order[0] });
    } catch (error: any) {
      console.error("Buy teacher task error:", error);
      res.status(500).json({ message: "Failed to purchase task" });
    }
  });

  // ===== Public: Teacher Review =====

  app.post("/api/store/teachers/:teacherId/review", async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { parentId, rating, comment } = req.body;

      if (!parentId || !rating) {
        return res.status(400).json({ message: "Parent ID and rating required" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      // Check if already reviewed
      const existing = await db.select().from(teacherReviews).where(
        and(eq(teacherReviews.teacherId, teacherId), eq(teacherReviews.parentId, parentId))
      );

      if (existing[0]) {
        const updated = await db.update(teacherReviews).set({
          rating,
          comment: comment || null,
        }).where(eq(teacherReviews.id, existing[0].id)).returning();
        return res.json({ success: true, data: updated[0], message: "تم تحديث التقييم" });
      }

      const review = await db.insert(teacherReviews).values({
        teacherId,
        parentId,
        rating,
        comment: comment || null,
      }).returning();

      res.json({ success: true, data: review[0] });
    } catch (error: any) {
      console.error("Submit teacher review error:", error);
      res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // ===== Public: Hire Teacher =====

  app.post("/api/store/teachers/:teacherId/hire", async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { parentId, childId, pricingModel, agreedRate } = req.body;

      if (!parentId || !childId || !pricingModel || !agreedRate) {
        return res.status(400).json({ message: "جميع الحقول مطلوبة" });
      }

      const teacher = await db.select().from(schoolTeachers).where(
        and(eq(schoolTeachers.id, teacherId), eq(schoolTeachers.isActive, true))
      );

      if (!teacher[0]) {
        return res.status(404).json({ message: "المعلم غير موجود" });
      }

      // Check if already hired for this child
      const existingHiring = await db.select().from(teacherHiring).where(
        and(
          eq(teacherHiring.teacherId, teacherId),
          eq(teacherHiring.childId, childId),
          eq(teacherHiring.status, "active")
        )
      );

      if (existingHiring[0]) {
        return res.status(400).json({ message: "المعلم معين بالفعل لهذا الطفل" });
      }

      const hiring = await db.insert(teacherHiring).values({
        parentId,
        teacherId,
        childId,
        pricingModel,
        agreedRate: String(agreedRate),
      }).returning();

      // Create teacher assignment
      const existingAssignment = await db.select().from(childTeacherAssignment).where(
        and(eq(childTeacherAssignment.childId, childId), eq(childTeacherAssignment.teacherId, teacherId))
      );

      if (!existingAssignment[0]) {
        await db.insert(childTeacherAssignment).values({
          childId,
          teacherId,
          subjectLabel: teacher[0].subject || null,
        });

        // Update teacher total students
        await db.update(schoolTeachers).set({
          totalStudents: sql`${schoolTeachers.totalStudents} + 1`,
          updatedAt: new Date(),
        }).where(eq(schoolTeachers.id, teacherId));
      }

      res.json({ success: true, data: hiring[0] });
    } catch (error: any) {
      console.error("Hire teacher error:", error);
      res.status(500).json({ message: "Failed to hire teacher" });
    }
  });

  // ===== Template Tasks for Teachers =====

  // Get all active subjects
  app.get("/api/teacher/subjects", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const result = await db.select().from(subjects).where(eq(subjects.isActive, true)).orderBy(subjects.name);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get template tasks for a subject (admin-created templates for teachers to use)
  app.get("/api/teacher/subjects/:subjectId/templates", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const { subjectId } = req.params;
      const result = await db.select().from(templateTasks)
        .where(and(
          eq(templateTasks.subjectId, subjectId),
          eq(templateTasks.isActive, true),
          eq(templateTasks.createdByParent, false),
        ))
        .orderBy(desc(templateTasks.createdAt));
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch teacher template tasks error:", error);
      res.status(500).json({ message: "Failed to fetch template tasks" });
    }
  });

  // Create task from template (teacher version)
  app.post("/api/teacher/create-task-from-template", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { templateId, price, title, pointsReward } = req.body;

      if (!templateId || !price) {
        return res.status(400).json({ message: "القالب والسعر مطلوبان" });
      }

      // Get template
      const template = await db.select().from(templateTasks).where(eq(templateTasks.id, templateId));
      if (!template[0]) {
        return res.status(404).json({ message: "القالب غير موجود" });
      }

      // Get subject info for label
      const subjectInfo = await db.select().from(subjects).where(eq(subjects.id, template[0].subjectId));

      const task = await db.insert(teacherTasks).values({
        teacherId,
        title: title || template[0].title || template[0].question.substring(0, 60),
        question: template[0].question,
        answers: template[0].answers,
        subjectLabel: subjectInfo[0]?.name || null,
        pointsReward: pointsReward || template[0].pointsReward,
        price: String(price),
      }).returning();

      // Update teacher activity score
      await db.update(schoolTeachers).set({
        activityScore: sql`${schoolTeachers.activityScore} + 3`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      // Increment template usage count
      await db.update(templateTasks).set({
        usageCount: sql`${templateTasks.usageCount} + 1`,
      }).where(eq(templateTasks.id, templateId));

      res.json({ success: true, data: task[0] });
    } catch (error: any) {
      console.error("Create teacher task from template error:", error);
      res.status(500).json({ message: "Failed to create task from template" });
    }
  });

  // ===== Polls — Teacher Management =====

  // Create poll
  app.post("/api/teacher/polls", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const schoolId = req.teacher!.schoolId;
      const { question, options, allowMultiple, isAnonymous, isPinned, expiresAt } = req.body;

      if (!question || !question.trim()) {
        return res.status(400).json({ message: "سؤال التصويت مطلوب" });
      }
      if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
        return res.status(400).json({ message: "يجب إضافة 2-10 خيارات" });
      }

      const formattedOptions = options.map((opt: any, i: number) => ({
        id: String(i + 1),
        text: String(opt.text || opt).trim(),
        ...(opt.imageUrl ? { imageUrl: String(opt.imageUrl) } : {}),
      })).filter((o: any) => o.text);

      if (formattedOptions.length < 2) {
        return res.status(400).json({ message: "يجب إضافة خيارين على الأقل" });
      }

      const poll = await db.insert(schoolPolls).values({
        schoolId,
        teacherId,
        authorType: "teacher",
        question: question.trim(),
        options: formattedOptions,
        allowMultiple: allowMultiple || false,
        isAnonymous: isAnonymous || false,
        isPinned: isPinned || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }).returning();

      // Update teacher activity
      await db.update(schoolTeachers).set({
        activityScore: sql`${schoolTeachers.activityScore} + 3`,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, teacherId));

      res.json({ success: true, data: poll[0] });
    } catch (error: any) {
      console.error("Create teacher poll error:", error);
      res.status(500).json({ message: "فشل إنشاء التصويت" });
    }
  });

  // List polls (teacher’s own)
  app.get("/api/teacher/polls", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const polls = await db.select().from(schoolPolls)
        .where(and(eq(schoolPolls.teacherId, teacherId), eq(schoolPolls.authorType, "teacher")))
        .orderBy(desc(schoolPolls.isPinned), desc(schoolPolls.createdAt));

      const pollsWithStats = await Promise.all(polls.map(async (poll: any) => {
        const votes = await db.select().from(schoolPollVotes)
          .where(eq(schoolPollVotes.pollId, poll.id));

        const optionCounts: Record<string, number> = {};
        poll.options.forEach((o: any) => { optionCounts[o.id] = 0; });
        votes.forEach((v: any) => {
          (v.selectedOptions as string[]).forEach((optId: string) => {
            if (optionCounts[optId] !== undefined) optionCounts[optId]++;
          });
        });

        return {
          ...poll,
          optionCounts,
          votersCount: votes.length,
        };
      }));

      res.json({ success: true, data: pollsWithStats });
    } catch (error: any) {
      console.error("Get teacher polls error:", error);
      res.status(500).json({ message: "فشل جلب التصويتات" });
    }
  });

  // Update poll
  app.put("/api/teacher/polls/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;
      const { isPinned, isClosed, isActive } = req.body;

      const poll = await db.select().from(schoolPolls)
        .where(and(eq(schoolPolls.id, id), eq(schoolPolls.teacherId, teacherId)));
      if (!poll[0]) {
        return res.status(404).json({ message: "التصويت غير موجود" });
      }

      const updates: any = { updatedAt: new Date() };
      if (typeof isPinned === "boolean") updates.isPinned = isPinned;
      if (typeof isClosed === "boolean") updates.isClosed = isClosed;
      if (typeof isActive === "boolean") updates.isActive = isActive;

      const updated = await db.update(schoolPolls).set(updates)
        .where(eq(schoolPolls.id, id)).returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update teacher poll error:", error);
      res.status(500).json({ message: "فشل تحديث التصويت" });
    }
  });

  // Delete poll
  app.delete("/api/teacher/polls/:id", teacherMiddleware, async (req: TeacherRequest, res) => {
    try {
      const teacherId = req.teacher!.teacherId;
      const { id } = req.params;

      const poll = await db.select().from(schoolPolls)
        .where(and(eq(schoolPolls.id, id), eq(schoolPolls.teacherId, teacherId)));
      if (!poll[0]) {
        return res.status(404).json({ message: "التصويت غير موجود" });
      }

      await db.delete(schoolPolls).where(eq(schoolPolls.id, id));
      res.json({ success: true, message: "تم حذف التصويت" });
    } catch (error: any) {
      console.error("Delete teacher poll error:", error);
      res.status(500).json({ message: "فشل حذف التصويت" });
    }
  });

  // ===== Teacher Notifications =====

  app.get("/api/teacher/notifications", teacherMiddleware, async (req: any, res) => {
    try {
      const teacherId = req.teacher.teacherId;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const items = await db.select().from(notifications)
        .where(eq(notifications.teacherId, teacherId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit).offset(offset);

      const [{ value: total }] = await db.select({ value: count() }).from(notifications)
        .where(eq(notifications.teacherId, teacherId));

      res.json({ success: true, data: { items, total: Number(total), limit, offset, hasMore: offset + limit < Number(total) } });
    } catch (error: any) {
      console.error("Teacher notifications error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.get("/api/teacher/notifications/unread-count", teacherMiddleware, async (req: any, res) => {
    try {
      const teacherId = req.teacher.teacherId;
      const [{ value: unread }] = await db.select({ value: count() }).from(notifications)
        .where(and(eq(notifications.teacherId, teacherId), eq(notifications.isRead, false)));
      res.json({ success: true, data: { count: Number(unread) } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.post("/api/teacher/notifications/read-all", teacherMiddleware, async (req: any, res) => {
    try {
      const teacherId = req.teacher.teacherId;
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.teacherId, teacherId), eq(notifications.isRead, false)));
      res.json({ success: true, message: "تم تعليم الكل كمقروء" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.post("/api/teacher/notifications/:id/read", teacherMiddleware, async (req: any, res) => {
    try {
      const teacherId = req.teacher.teacherId;
      const { id } = req.params;
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, id), eq(notifications.teacherId, teacherId)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR" });
    }
  });
}
