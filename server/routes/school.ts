import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import {
  schools,
  schoolTeachers,
  schoolPosts,
  schoolPostComments,
  schoolPostLikes,
  schoolReviews,
  schoolActivityLogs,
  schoolReferralSettings,
  childSchoolAssignment,
  parentChild,
  parents,
  children,
  parentNotifications,
} from "../../shared/schema";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createPresignedUpload, finalizeUpload } from "../services/uploadService";
import { finalizeUploadSchema } from "../../shared/media";

const db = storage.db;
const JWT_SECRET = process.env["JWT_SECRET"] ?? "";

if (!JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable is required. School authentication cannot start without it.");
}

// ===== School Middleware =====

interface SchoolRequest extends Request {
  school?: { schoolId: string };
}

const schoolMiddleware = async (req: SchoolRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { schoolId: string; type: string; exp?: number };

    if (decoded.type !== "school") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({ message: "Token expired" });
    }

    const school = await db.select().from(schools).where(eq(schools.id, decoded.schoolId));
    if (!school[0] || !school[0].isActive) {
      return res.status(401).json({ message: "School account is deactivated" });
    }

    req.school = { schoolId: decoded.schoolId };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ===== Helper Functions =====

async function logSchoolActivity(schoolId: string, action: string, points: number, metadata?: Record<string, any>) {
  await db.insert(schoolActivityLogs).values({
    schoolId,
    action,
    points,
    metadata: metadata || null,
  });

  await db.update(schools)
    .set({
      activityScore: sql`${schools.activityScore} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(schools.id, schoolId));
}

// ===== Register Routes =====

export async function registerSchoolRoutes(app: Express) {

  // ===== Auth =====

  app.post("/api/school/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const school = await db.select().from(schools).where(eq(schools.username, username));
      if (!school[0]) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      if (!school[0].isActive) {
        return res.status(401).json({ message: "الحساب غير نشط" });
      }

      const passwordMatch = await bcrypt.compare(password, school[0].password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      const token = jwt.sign(
        { schoolId: school[0].id, type: "school" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({
        success: true,
        token,
        school: {
          id: school[0].id,
          name: school[0].name,
          imageUrl: school[0].imageUrl,
          referralCode: school[0].referralCode,
        }
      });
    } catch (error: any) {
      console.error("School login error:", error);
      res.status(500).json({ message: "فشل تسجيل الدخول" });
    }
  });

  // ===== Profile =====

  app.get("/api/school/profile", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const school = await db.select().from(schools).where(eq(schools.id, schoolId));

      if (!school[0]) {
        return res.status(404).json({ message: "School not found" });
      }

      const { password, ...safeSchool } = school[0];

      const teachersCount = await db.select().from(schoolTeachers).where(eq(schoolTeachers.schoolId, schoolId));
      const studentsCount = await db.select().from(childSchoolAssignment).where(eq(childSchoolAssignment.schoolId, schoolId));
      const postsCount = await db.select().from(schoolPosts).where(and(eq(schoolPosts.schoolId, schoolId), eq(schoolPosts.authorType, "school")));
      const reviewsData = await db.select().from(schoolReviews).where(eq(schoolReviews.schoolId, schoolId));

      const avgRating = reviewsData.length > 0
        ? reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length
        : 0;

      res.json({
        success: true,
        data: {
          ...safeSchool,
          stats: {
            teachersCount: teachersCount.length,
            studentsCount: studentsCount.length,
            postsCount: postsCount.length,
            reviewsCount: reviewsData.length,
            avgRating: Math.round(avgRating * 10) / 10,
          }
        }
      });
    } catch (error: any) {
      console.error("Get school profile error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/school/profile", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const { name, nameAr, description, address, city, governorate, imageUrl, coverImageUrl, phoneNumber, email, socialLinks } = req.body;

      const updates: any = { updatedAt: new Date() };
      if (name) updates.name = name;
      if (nameAr !== undefined) updates.nameAr = nameAr;
      if (description !== undefined) updates.description = description;
      if (address !== undefined) updates.address = address;
      if (city !== undefined) updates.city = city;
      if (governorate !== undefined) updates.governorate = governorate;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
      if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
      if (email !== undefined) updates.email = email;
      if (socialLinks !== undefined) updates.socialLinks = socialLinks;

      const updated = await db.update(schools).set(updates).where(eq(schools.id, schoolId)).returning();
      const { password, ...safe } = updated[0];

      await logSchoolActivity(schoolId, "profile_updated", 2);

      res.json({ success: true, data: safe });
    } catch (error: any) {
      console.error("Update school profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ===== File Uploads =====

  app.post("/api/school/uploads/presign", schoolMiddleware, async (req: SchoolRequest, res) => {
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
        actor: { type: "parent", id: req.school!.schoolId },
        purpose: body.purpose,
        contentType: body.contentType,
        size: body.size,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error?.message === "POLICY_REJECTED_MIME" || error?.message === "POLICY_REJECTED_SIZE") {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error("School upload presign error:", error);
      res.status(500).json({ success: false, message: "فشل إنشاء رابط الرفع" });
    }
  });

  app.post("/api/school/uploads/finalize", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const body = finalizeUploadSchema.parse(req.body);
      const media = await finalizeUpload({
        actor: { type: "parent", id: req.school!.schoolId },
        input: body,
      });

      res.json({ success: true, data: media });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error("School upload finalize error:", error);
      res.status(500).json({ success: false, message: "فشل تأكيد رفع الملف" });
    }
  });

  app.put("/api/school/uploads/proxy", schoolMiddleware, async (req: SchoolRequest, res) => {
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
      console.error("School upload proxy error:", error);
      return res.status(500).json({ success: false, message: "فشل رفع الملف عبر الخادم" });
    }
  });

  // ===== Teachers Management =====

  app.get("/api/school/teachers", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const teachers = await db.select().from(schoolTeachers)
        .where(eq(schoolTeachers.schoolId, schoolId))
        .orderBy(desc(schoolTeachers.createdAt));

      const safeTeachers = teachers.map(({ password: _pw, ...t }: any) => t);
      res.json({ success: true, data: safeTeachers });
    } catch (error: any) {
      console.error("Get school teachers error:", error);
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  app.post("/api/school/teachers", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const { name, avatarUrl, birthday, bio, subject, yearsExperience, username, password, monthlyRate, perTaskRate, pricingModel, socialLinks } = req.body;

      if (!name || !username || !password) {
        return res.status(400).json({ message: "الاسم واسم المستخدم وكلمة المرور مطلوبة" });
      }

      // Check username unique
      const existing = await db.select().from(schoolTeachers).where(eq(schoolTeachers.username, username));
      if (existing[0]) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const teacher = await db.insert(schoolTeachers).values({
        schoolId,
        name,
        avatarUrl: avatarUrl || null,
        birthday: birthday || null,
        bio: bio || null,
        subject: subject || null,
        yearsExperience: yearsExperience || 0,
        username,
        password: hashedPassword,
        monthlyRate: monthlyRate ? String(monthlyRate) : null,
        perTaskRate: perTaskRate ? String(perTaskRate) : null,
        pricingModel: pricingModel || "per_task",
        socialLinks: socialLinks || null,
      }).returning();

      // Update total teachers count
      await db.update(schools).set({
        totalTeachers: sql`${schools.totalTeachers} + 1`,
        updatedAt: new Date(),
      }).where(eq(schools.id, schoolId));

      const settings = await db.select().from(schoolReferralSettings);
      const pointsToAdd = settings[0]?.pointsPerTeacherAdd || 20;
      await logSchoolActivity(schoolId, "teacher_added", pointsToAdd, { teacherId: teacher[0].id });

      // Notify school followers about new teacher
      try {
        const { follows } = await import("../../shared/schema");
        const schoolFollowers = await db.select({ followerId: follows.followerParentId })
          .from(follows)
          .where(and(eq(follows.entityType, "school"), eq(follows.entityId, schoolId)));
        
        const schoolData = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId));
        const schoolName = schoolData[0]?.name || "";
        
        for (const follower of schoolFollowers) {
          await db.insert(parentNotifications).values({
            parentId: follower.followerId,
            title: `👨‍🏫 مدرس جديد في ${schoolName}`,
            message: `انضم المدرس "${name}" إلى مدرسة ${schoolName}. تصفح ملفه الشخصي الآن!`,
          });
        }
      } catch (notifErr) {
        console.error("Failed to send new teacher notifications:", notifErr);
      }

      const { password: _, ...safe } = teacher[0];
      res.json({ success: true, data: safe });
    } catch (error: any) {
      console.error("Create school teacher error:", error);
      res.status(500).json({ message: "Failed to create teacher" });
    }
  });

  app.put("/api/school/teachers/:id", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const { id } = req.params;
      const { name, avatarUrl, birthday, bio, subject, yearsExperience, username, password, monthlyRate, perTaskRate, pricingModel, socialLinks, isActive } = req.body;

      const teacher = await db.select().from(schoolTeachers)
        .where(and(eq(schoolTeachers.id, id), eq(schoolTeachers.schoolId, schoolId)));

      if (!teacher[0]) {
        return res.status(404).json({ message: "المعلم غير موجود" });
      }

      // Check username unique if changed
      if (username && username !== teacher[0].username) {
        const existing = await db.select().from(schoolTeachers).where(eq(schoolTeachers.username, username));
        if (existing[0]) {
          return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
        }
      }

      const updates: any = { updatedAt: new Date() };
      if (name) updates.name = name;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (birthday !== undefined) updates.birthday = birthday;
      if (bio !== undefined) updates.bio = bio;
      if (subject !== undefined) updates.subject = subject;
      if (yearsExperience !== undefined) updates.yearsExperience = yearsExperience;
      if (username) updates.username = username;
      if (password) updates.password = await bcrypt.hash(password, 10);
      if (monthlyRate !== undefined) updates.monthlyRate = monthlyRate ? String(monthlyRate) : null;
      if (perTaskRate !== undefined) updates.perTaskRate = perTaskRate ? String(perTaskRate) : null;
      if (pricingModel !== undefined) updates.pricingModel = pricingModel;
      if (socialLinks !== undefined) updates.socialLinks = socialLinks;
      if (typeof isActive === "boolean") updates.isActive = isActive;

      const updated = await db.update(schoolTeachers).set(updates)
        .where(eq(schoolTeachers.id, id))
        .returning();

      await logSchoolActivity(schoolId, "teacher_updated", 1, { teacherId: id });

      const { password: _, ...safe } = updated[0];
      res.json({ success: true, data: safe });
    } catch (error: any) {
      console.error("Update school teacher error:", error);
      res.status(500).json({ message: "Failed to update teacher" });
    }
  });

  app.delete("/api/school/teachers/:id", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const { id } = req.params;

      const teacher = await db.select().from(schoolTeachers)
        .where(and(eq(schoolTeachers.id, id), eq(schoolTeachers.schoolId, schoolId)));

      if (!teacher[0]) {
        return res.status(404).json({ message: "المعلم غير موجود" });
      }

      await db.delete(schoolTeachers).where(eq(schoolTeachers.id, id));

      await db.update(schools).set({
        totalTeachers: sql`GREATEST(0, ${schools.totalTeachers} - 1)`,
        updatedAt: new Date(),
      }).where(eq(schools.id, schoolId));

      res.json({ success: true, message: "تم حذف المعلم" });
    } catch (error: any) {
      console.error("Delete school teacher error:", error);
      res.status(500).json({ message: "Failed to delete teacher" });
    }
  });

  // ===== Posts (School perspective) =====

  app.get("/api/school/posts", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const posts = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.schoolId, schoolId), eq(schoolPosts.authorType, "school")))
        .orderBy(desc(schoolPosts.createdAt));

      res.json({ success: true, data: posts });
    } catch (error: any) {
      console.error("Get school posts error:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/school/posts", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const { content, mediaUrls, mediaTypes, isPinned } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "محتوى المنشور مطلوب" });
      }

      const post = await db.insert(schoolPosts).values({
        schoolId,
        authorType: "school",
        content: content.trim(),
        mediaUrls: mediaUrls || [],
        mediaTypes: mediaTypes || [],
        isPinned: isPinned || false,
      }).returning();

      await logSchoolActivity(schoolId, "post_created", 3, { postId: post[0].id });

      res.json({ success: true, data: post[0] });
    } catch (error: any) {
      console.error("Create school post error:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.put("/api/school/posts/:id", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const { id } = req.params;
      const { content, mediaUrls, mediaTypes, isPinned, isActive } = req.body;

      const post = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.id, id), eq(schoolPosts.schoolId, schoolId), eq(schoolPosts.authorType, "school")));

      if (!post[0]) {
        return res.status(404).json({ message: "المنشور غير موجود" });
      }

      const updates: any = { updatedAt: new Date() };
      if (content) updates.content = content.trim();
      if (mediaUrls !== undefined) updates.mediaUrls = mediaUrls;
      if (mediaTypes !== undefined) updates.mediaTypes = mediaTypes;
      if (typeof isPinned === "boolean") updates.isPinned = isPinned;
      if (typeof isActive === "boolean") updates.isActive = isActive;

      const updated = await db.update(schoolPosts).set(updates)
        .where(eq(schoolPosts.id, id))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update school post error:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete("/api/school/posts/:id", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const { id } = req.params;

      const post = await db.select().from(schoolPosts)
        .where(and(eq(schoolPosts.id, id), eq(schoolPosts.schoolId, schoolId), eq(schoolPosts.authorType, "school")));

      if (!post[0]) {
        return res.status(404).json({ message: "المنشور غير موجود" });
      }

      await db.delete(schoolPosts).where(eq(schoolPosts.id, id));
      res.json({ success: true, message: "تم حذف المنشور" });
    } catch (error: any) {
      console.error("Delete school post error:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // ===== All Posts Feed (school + its teachers) =====

  app.get("/api/school/feed", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      // Get all posts for school (by school and by its teachers)
      const posts = await db.select({
        post: schoolPosts,
        teacherName: schoolTeachers.name,
        teacherAvatar: schoolTeachers.avatarUrl,
      })
        .from(schoolPosts)
        .leftJoin(schoolTeachers, eq(schoolPosts.teacherId, schoolTeachers.id))
        .where(eq(schoolPosts.schoolId, schoolId))
        .orderBy(desc(schoolPosts.isPinned), desc(schoolPosts.createdAt))
        .limit(limit)
        .offset(offset);

      const data = posts.map((row: any) => ({
        ...row.post,
        teacherName: row.teacherName,
        teacherAvatar: row.teacherAvatar,
      }));

      res.json({ success: true, data, page, limit });
    } catch (error: any) {
      console.error("Get school feed error:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // ===== Students =====

  app.get("/api/school/students", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const assignments = await db.select({
        assignment: childSchoolAssignment,
        childName: children.name,
        childAvatar: children.avatarUrl,
        parentName: parents.name,
      })
        .from(childSchoolAssignment)
        .leftJoin(children, eq(childSchoolAssignment.childId, children.id))
        .leftJoin(parentChild, eq(childSchoolAssignment.childId, parentChild.childId))
        .leftJoin(parents, eq(parentChild.parentId, parents.id))
        .where(eq(childSchoolAssignment.schoolId, schoolId))
        .orderBy(desc(childSchoolAssignment.createdAt));

      const data = assignments.map((row: any) => ({
        ...row.assignment,
        childName: row.childName,
        childAvatar: row.childAvatar,
        parentName: row.parentName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get school students error:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // ===== Reviews (read-only for school) =====

  app.get("/api/school/reviews", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const reviews = await db.select({
        review: schoolReviews,
        parentName: parents.name,
      })
        .from(schoolReviews)
        .leftJoin(parents, eq(schoolReviews.parentId, parents.id))
        .where(eq(schoolReviews.schoolId, schoolId))
        .orderBy(desc(schoolReviews.createdAt));

      const data = reviews.map((row: any) => ({
        ...row.review,
        parentName: row.parentName,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Get school reviews error:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // ===== Activity Logs =====

  app.get("/api/school/activity", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;
      const logs = await db.select().from(schoolActivityLogs)
        .where(eq(schoolActivityLogs.schoolId, schoolId))
        .orderBy(desc(schoolActivityLogs.createdAt))
        .limit(100);

      res.json({ success: true, data: logs });
    } catch (error: any) {
      console.error("Get school activity error:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // ===== Dashboard Stats =====

  app.get("/api/school/stats", schoolMiddleware, async (req: SchoolRequest, res) => {
    try {
      const schoolId = req.school!.schoolId;

      const [schoolData] = await db.select().from(schools).where(eq(schools.id, schoolId));
      const teachersList = await db.select().from(schoolTeachers).where(eq(schoolTeachers.schoolId, schoolId));
      const studentsList = await db.select().from(childSchoolAssignment).where(eq(childSchoolAssignment.schoolId, schoolId));
      const postsList = await db.select().from(schoolPosts).where(eq(schoolPosts.schoolId, schoolId));
      const reviewsList = await db.select().from(schoolReviews).where(eq(schoolReviews.schoolId, schoolId));

      const avgRating = reviewsList.length > 0
        ? reviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsList.length
        : 0;

      res.json({
        success: true,
        data: {
          activityScore: schoolData?.activityScore || 0,
          totalTeachers: teachersList.length,
          activeTeachers: teachersList.filter((t: any) => t.isActive).length,
          totalStudents: studentsList.length,
          totalPosts: postsList.length,
          totalReviews: reviewsList.length,
          avgRating: Math.round(avgRating * 10) / 10,
        }
      });
    } catch (error: any) {
      console.error("Get school stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ===== Public Endpoints =====

  // Browse schools
  app.get("/api/store/schools", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const search = (req.query.search as string || "").trim();
      const city = (req.query.city as string || "").trim();

      let whereClause = eq(schools.isActive, true);

      const activeSchools = await db.select({
        id: schools.id,
        name: schools.name,
        nameAr: schools.nameAr,
        description: schools.description,
        city: schools.city,
        governorate: schools.governorate,
        imageUrl: schools.imageUrl,
        coverImageUrl: schools.coverImageUrl,
        referralCode: schools.referralCode,
        activityScore: schools.activityScore,
        totalTeachers: schools.totalTeachers,
        totalStudents: schools.totalStudents,
        isVerified: schools.isVerified,
      }).from(schools)
        .where(eq(schools.isActive, true))
        .orderBy(desc(schools.activityScore))
        .limit(limit)
        .offset(offset);

      res.json({ success: true, data: activeSchools, page, limit });
    } catch (error: any) {
      console.error("Get store schools error:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Get single school profile (public)
  app.get("/api/store/schools/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== "string" || id.length > 50) {
        return res.status(400).json({ message: "Invalid school ID" });
      }

      const school = await db.select({
        id: schools.id,
        name: schools.name,
        nameAr: schools.nameAr,
        description: schools.description,
        address: schools.address,
        city: schools.city,
        governorate: schools.governorate,
        imageUrl: schools.imageUrl,
        coverImageUrl: schools.coverImageUrl,
        referralCode: schools.referralCode,
        phoneNumber: schools.phoneNumber,
        email: schools.email,
        socialLinks: schools.socialLinks,
        activityScore: schools.activityScore,
        totalTeachers: schools.totalTeachers,
        totalStudents: schools.totalStudents,
        isVerified: schools.isVerified,
        createdAt: schools.createdAt,
      }).from(schools)
        .where(and(eq(schools.id, id), eq(schools.isActive, true)));

      if (!school[0]) {
        return res.status(404).json({ message: "School not found" });
      }

      // Get teachers
      const teachers = await db.select({
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
        createdAt: schoolTeachers.createdAt,
      }).from(schoolTeachers)
        .where(and(eq(schoolTeachers.schoolId, id), eq(schoolTeachers.isActive, true)))
        .orderBy(desc(schoolTeachers.activityScore));

      // Get reviews
      const reviews = await db.select({
        review: schoolReviews,
        parentName: parents.name,
      })
        .from(schoolReviews)
        .leftJoin(parents, eq(schoolReviews.parentId, parents.id))
        .where(and(eq(schoolReviews.schoolId, id), eq(schoolReviews.isActive, true)))
        .orderBy(desc(schoolReviews.createdAt))
        .limit(20);

      const reviewsData = reviews.map((row: any) => ({
        ...row.review,
        parentName: row.parentName,
      }));

      const avgRating = reviewsData.length > 0
        ? reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length
        : 0;

      // Get posts
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const posts = await db.select({
        post: schoolPosts,
        teacherName: schoolTeachers.name,
        teacherAvatar: schoolTeachers.avatarUrl,
      })
        .from(schoolPosts)
        .leftJoin(schoolTeachers, eq(schoolPosts.teacherId, schoolTeachers.id))
        .where(and(eq(schoolPosts.schoolId, id), eq(schoolPosts.isActive, true)))
        .orderBy(desc(schoolPosts.isPinned), desc(schoolPosts.createdAt))
        .limit(limit)
        .offset(offset);

      const postsData = posts.map((row: any) => ({
        ...row.post,
        teacherName: row.teacherName,
        teacherAvatar: row.teacherAvatar,
      }));

      res.json({
        success: true,
        data: {
          ...school[0],
          teachers,
          reviews: reviewsData,
          avgRating: Math.round(avgRating * 10) / 10,
          posts: postsData,
        },
        page,
        limit,
      });
    } catch (error: any) {
      console.error("Get store school error:", error);
      res.status(500).json({ message: "Failed to fetch school" });
    }
  });

  // Get school by referral code (public)
  app.get("/api/store/schools/by-referral/:code", async (req, res) => {
    try {
      const { code } = req.params;

      if (!code || typeof code !== "string" || code.length > 64) {
        return res.status(400).json({ message: "Invalid referral code" });
      }

      const school = await db.select({
        id: schools.id,
        name: schools.name,
        nameAr: schools.nameAr,
        description: schools.description,
        city: schools.city,
        governorate: schools.governorate,
        imageUrl: schools.imageUrl,
        referralCode: schools.referralCode,
        activityScore: schools.activityScore,
        totalTeachers: schools.totalTeachers,
        totalStudents: schools.totalStudents,
        isVerified: schools.isVerified,
      }).from(schools)
        .where(and(eq(schools.referralCode, code.trim().toUpperCase()), eq(schools.isActive, true)))
        .limit(1);

      if (!school[0]) {
        return res.status(404).json({ message: "School not found" });
      }

      res.json({ success: true, data: school[0] });
    } catch (error: any) {
      console.error("Get school by referral code error:", error);
      res.status(500).json({ message: "Failed to fetch school" });
    }
  });

  // ===== Post Comments & Likes (Public with auth) =====

  app.get("/api/store/schools/posts/:postId/comments", async (req, res) => {
    try {
      const { postId } = req.params;
      const comments = await db.select().from(schoolPostComments)
        .where(and(eq(schoolPostComments.postId, postId), eq(schoolPostComments.isActive, true)))
        .orderBy(desc(schoolPostComments.createdAt));

      res.json({ success: true, data: comments });
    } catch (error: any) {
      console.error("Get post comments error:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/store/schools/posts/:postId/like", async (req, res) => {
    try {
      const { postId } = req.params;
      const { parentId, childId } = req.body;

      if (!parentId && !childId) {
        return res.status(400).json({ message: "Parent or child ID required" });
      }

      // Check if already liked
      const existingLike = await db.select().from(schoolPostLikes).where(
        and(
          eq(schoolPostLikes.postId, postId),
          parentId ? eq(schoolPostLikes.parentId, parentId) : eq(schoolPostLikes.childId, childId!)
        )
      );

      if (existingLike[0]) {
        // Unlike
        await db.delete(schoolPostLikes).where(eq(schoolPostLikes.id, existingLike[0].id));
        await db.update(schoolPosts).set({
          likesCount: sql`GREATEST(0, ${schoolPosts.likesCount} - 1)`,
        }).where(eq(schoolPosts.id, postId));

        return res.json({ success: true, liked: false });
      }

      // Like
      await db.insert(schoolPostLikes).values({
        postId,
        parentId: parentId || null,
        childId: childId || null,
      });
      await db.update(schoolPosts).set({
        likesCount: sql`${schoolPosts.likesCount} + 1`,
      }).where(eq(schoolPosts.id, postId));

      res.json({ success: true, liked: true });
    } catch (error: any) {
      console.error("Like/unlike post error:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  app.post("/api/store/schools/posts/:postId/comment", async (req, res) => {
    try {
      const { postId } = req.params;
      const { parentId, childId, authorName, content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "محتوى التعليق مطلوب" });
      }

      if (!authorName) {
        return res.status(400).json({ message: "اسم المعلق مطلوب" });
      }

      const comment = await db.insert(schoolPostComments).values({
        postId,
        parentId: parentId || null,
        childId: childId || null,
        authorName,
        content: content.trim(),
      }).returning();

      await db.update(schoolPosts).set({
        commentsCount: sql`${schoolPosts.commentsCount} + 1`,
      }).where(eq(schoolPosts.id, postId));

      res.json({ success: true, data: comment[0] });
    } catch (error: any) {
      console.error("Create post comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // ===== Reviews (public - parent submits) =====

  app.post("/api/store/schools/:schoolId/review", async (req, res) => {
    try {
      const { schoolId } = req.params;
      const { parentId, rating, comment } = req.body;

      if (!parentId || !rating) {
        return res.status(400).json({ message: "Parent ID and rating required" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      // Check if already reviewed
      const existing = await db.select().from(schoolReviews).where(
        and(eq(schoolReviews.schoolId, schoolId), eq(schoolReviews.parentId, parentId))
      );

      if (existing[0]) {
        // Update existing review
        const updated = await db.update(schoolReviews).set({
          rating,
          comment: comment || null,
        }).where(eq(schoolReviews.id, existing[0].id)).returning();
        return res.json({ success: true, data: updated[0], message: "تم تحديث التقييم" });
      }

      const review = await db.insert(schoolReviews).values({
        schoolId,
        parentId,
        rating,
        comment: comment || null,
      }).returning();

      res.json({ success: true, data: review[0] });
    } catch (error: any) {
      console.error("Submit school review error:", error);
      res.status(500).json({ message: "Failed to submit review" });
    }
  });
}
