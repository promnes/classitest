import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ProfileHeader } from "@/components/ui/ProfileHeader";
import {
  GraduationCap, Star, MessageSquare, BookOpen, Heart,
  Send, Users, Briefcase, Clock
} from "lucide-react";

export default function TeacherProfile() {
  const [, params] = useRoute("/teacher/:id");
  const teacherId = params?.id;
  const { toast } = useToast();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["public-teacher", teacherId],
    queryFn: async () => {
      const res = await fetch(`/api/public/teacher/${teacherId}`);
      if (!res.ok) throw new Error("Not found");
      const json = await res.json();
      return json.data;
    },
    enabled: !!teacherId,
  });

  // Teacher posts (same as school posts but filtered by teacher)
  const { data: postsData } = useQuery({
    queryKey: ["teacher-posts", teacherId],
    queryFn: async () => {
      const res = await fetch(`/api/store/schools/teacher/${teacherId}/posts`);
      if (!res.ok) return { posts: [] };
      const json = await res.json();
      return json.data || { posts: [] };
    },
    enabled: !!teacherId,
  });

  // Teacher tasks for sale
  const { data: tasksData } = useQuery({
    queryKey: ["teacher-tasks-public", teacherId],
    queryFn: async () => {
      const res = await fetch(`/api/store/teachers/${teacherId}/tasks`);
      if (!res.ok) return { tasks: [] };
      const json = await res.json();
      return json.data || { tasks: [] };
    },
    enabled: !!teacherId,
  });

  // Teacher reviews
  const { data: reviewsData } = useQuery({
    queryKey: ["teacher-reviews", teacherId],
    queryFn: async () => {
      const res = await fetch(`/api/store/teachers/${teacherId}/reviews`);
      if (!res.ok) return { reviews: [], avgRating: "0" };
      const json = await res.json();
      return json.data || { reviews: [], avgRating: "0" };
    },
    enabled: !!teacherId,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/store/teachers/${teacherId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشل إرسال التقييم");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-reviews", teacherId] });
      setReviewComment("");
      setReviewRating(5);
      toast({ title: "تم إرسال تقييمك بنجاح" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">المدرس غير موجود</p>
      </div>
    );
  }

  const posts = postsData?.posts || [];
  const tasks = tasksData?.tasks || [];
  const reviews = reviewsData?.reviews || [];
  const avgRating = reviewsData?.avgRating || "0";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ProfileHeader
          name={teacher.name}
          bio={teacher.bio}
          avatarUrl={teacher.avatarUrl}
          governorate=""
          socialLinks={teacher.socialLinks}
          entityType="teacher"
          entityId={teacherId!}
          avgRating={avgRating}
          totalReviews={reviews.length}
          extraBadges={
            <>
              {teacher.subject && (
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  {teacher.subject}
                </Badge>
              )}
              {teacher.yearsExperience > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {teacher.yearsExperience} سنة خبرة
                </Badge>
              )}
            </>
          }
        >
          {teacher.schoolName && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span>يعمل في: {teacher.schoolName}</span>
            </div>
          )}
          <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {teacher.totalStudents || 0} طالب
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {teacher.totalTasksSold || 0} مهمة مباعة
            </span>
          </div>
        </ProfileHeader>

        <Tabs defaultValue="tasks" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="tasks" className="gap-1">
              <BookOpen className="h-4 w-4" />
              المهام ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              المنشورات ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1">
              <Star className="h-4 w-4" />
              التقييمات ({reviews.length})
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            {tasks.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد مهام متاحة حالياً</CardContent></Card>
            ) : (
              tasks.map((task: any) => (
                <Card key={task.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{task.title || task.question}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{task.question}</p>
                        {task.subjectLabel && (
                          <Badge variant="outline" className="mt-2">{task.subjectLabel}</Badge>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-bold text-green-600">{task.price} ج.م</span>
                        <p className="text-xs text-muted-foreground">{task.pointsReward} نقطة</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4 mt-4">
            {posts.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد منشورات</CardContent></Card>
            ) : (
              posts.map((post: any) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                    {post.mediaUrls?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {post.mediaUrls.map((url: string, i: number) => (
                          <img key={i} src={url} alt="" className="h-48 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {post.likesCount || 0}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {post.commentsCount || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4 mt-4">
            {/* Submit Review Form */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">أضف تقييمك</h3>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl transition-colors ${star <= reviewRating ? "text-yellow-400" : "text-gray-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="اكتب تعليقك (اختياري)..."
                  className="mb-3"
                />
                <Button
                  onClick={() => submitReview.mutate()}
                  disabled={submitReview.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  إرسال التقييم
                </Button>
              </CardContent>
            </Card>

            {reviews.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد تقييمات بعد</CardContent></Card>
            ) : (
              reviews.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400">{"★".repeat(review.rating)}</span>
                      <span className="text-gray-300">{"★".repeat(5 - review.rating)}</span>
                      <span className="text-sm text-muted-foreground mr-2">
                        {review.parentName || "مستخدم"}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
