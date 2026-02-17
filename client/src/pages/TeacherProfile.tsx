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
  Users, Briefcase, Clock
} from "lucide-react";
import { ShareMenu } from "@/components/ui/ShareMenu";

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
          shareTitle={`${teacher.name} — معلم على Classify`}
          shareDescription={teacher.bio || `تعرّف على المعلم ${teacher.name} على منصة Classify`}
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
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>لا توجد مهام متاحة حالياً</p>
              </CardContent></Card>
            ) : (
              tasks.map((task: any) => (
                <Card key={task.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {task.coverImageUrl && (
                    <img src={task.coverImageUrl} alt="" className="w-full h-36 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">{task.title || task.question}</h3>
                        {task.title && task.question !== task.title && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.question}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {task.subjectLabel && (
                            <Badge variant="outline" className="text-xs">{task.subjectLabel}</Badge>
                          )}
                          {task.pointsReward > 0 && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Star className="h-3 w-3" />
                              {task.pointsReward} نقطة
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="bg-green-50 dark:bg-green-950 px-3 py-2 rounded-xl text-center">
                          <span className="text-lg font-bold text-green-600">{task.price}</span>
                          <span className="text-xs text-green-600 block">ج.م</span>
                        </div>
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
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>لا توجد منشورات</p>
              </CardContent></Card>
            ) : (
              posts.map((post: any) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
                    {post.mediaUrls?.length > 0 && (
                      <div className={`mt-3 ${post.mediaUrls.length === 1 ? "" : "grid grid-cols-2 gap-1"} rounded-lg overflow-hidden`}>
                        {post.mediaUrls.map((url: string, i: number) => {
                          const mediaType = post.mediaTypes?.[i];
                          if (mediaType === "video") {
                            return <video key={i} src={url} controls className="w-full max-h-96 object-contain bg-black" />;
                          }
                          return (
                            <img key={i} src={url} alt="" className={`w-full object-cover ${post.mediaUrls.length === 1 ? "max-h-[400px] rounded-lg" : "h-48"}`} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {post.likesCount || 0}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {post.commentsCount || 0}</span>
                      </div>
                      <ShareMenu
                        url={typeof window !== "undefined" ? window.location.href : ""}
                        title={post.content?.substring(0, 60) || "منشور"}
                        description={post.content?.substring(0, 120) || ""}
                        variant="ghost"
                        size="sm"
                        buttonLabel="مشاركة"
                        className="text-xs"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4 mt-4">
            {/* Rating Summary Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-5xl font-extrabold text-foreground">{avgRating}</div>
                    <div className="flex gap-0.5 mt-1 justify-center">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`h-4 w-4 ${n <= Math.round(parseFloat(avgRating)) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{reviews.length} تقييم</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map(n => {
                      const count = reviews.filter((r: any) => r.rating === n).length;
                      const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-sm">
                          <span className="w-3">{n}</span>
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-xs text-muted-foreground text-left">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Review Form */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold text-lg">أضف تقييمك</h3>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`h-8 w-8 ${star <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="شاركنا رأيك عن المعلم..."
                  className="min-h-[80px]"
                />
                <Button
                  onClick={() => submitReview.mutate()}
                  disabled={submitReview.isPending}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {submitReview.isPending ? "جاري الإرسال..." : "إرسال التقييم"}
                </Button>
              </CardContent>
            </Card>

            {reviews.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Star className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>لا توجد تقييمات بعد</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{review.parentName || "ولي أمر"}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          </div>
                          <div className="flex gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-sm mt-2 text-muted-foreground">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
