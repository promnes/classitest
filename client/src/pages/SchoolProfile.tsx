import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  School, GraduationCap, Star, MessageSquare, BookOpen, Heart,
  MapPin, Globe, Phone, Mail, Send, Users
} from "lucide-react";
import { FollowButton } from "@/components/ui/FollowButton";

export default function SchoolProfile() {
  const [, params] = useRoute("/school/:id");
  const schoolId = params?.id;
  const { toast } = useToast();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  const { data: school, isLoading } = useQuery({
    queryKey: ["public-school", schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/store/schools/${schoolId}`);
      if (!res.ok) throw new Error("Not found");
      return (await res.json()).data;
    },
    enabled: !!schoolId,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/store/schools/${schoolId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-school", schoolId] });
      setReviewComment("");
      setReviewRating(5);
      toast({ title: "تم إرسال تقييمك بنجاح" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const likePost = useMutation({
    mutationFn: async (postId: string) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/store/schools/posts/${postId}/like`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-school", schoolId] });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/store/schools/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["public-school", schoolId] });
      setCommentTexts(prev => ({ ...prev, [postId]: "" }));
      toast({ title: "تم إضافة التعليق" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">المدرسة غير موجودة</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cover + School Info */}
      <div className="relative">
        {school.coverImageUrl ? (
          <img src={school.coverImageUrl} alt="" className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 bg-gradient-to-r from-blue-600 to-blue-800" />
        )}
        <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
          <div className="flex items-end gap-4">
            {school.imageUrl ? (
              <img src={school.imageUrl} alt="" className="w-24 h-24 rounded-xl border-4 border-white object-cover shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-xl border-4 border-white bg-blue-100 flex items-center justify-center shadow-lg">
                <School className="h-12 w-12 text-blue-600" />
              </div>
            )}
            <div className="pb-2 flex-1">
              <h1 className="text-2xl font-bold">{school.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {school.isVerified && <Badge className="bg-blue-600">موثقة</Badge>}
                <span className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 ml-1" />
                  {school.avgRating || 0} ({school.reviews?.length || 0} تقييم)
                </span>
              </div>
            </div>
            <FollowButton entityType="school" entityId={schoolId!} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Info Card */}
        {(school.bio || school.address || school.phone || school.email || school.website) && (
          <Card>
            <CardContent className="p-4 space-y-2">
              {school.bio && <p className="text-sm">{school.bio}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {school.address && (
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{school.address}</span>
                )}
                {school.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{school.phone}</span>
                )}
                {school.email && (
                  <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{school.email}</span>
                )}
                {school.website && (
                  <a href={school.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Globe className="h-4 w-4" />{school.website}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="teachers" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teachers">المعلمين ({school.teachers?.length || 0})</TabsTrigger>
            <TabsTrigger value="posts">المنشورات ({school.posts?.length || 0})</TabsTrigger>
            <TabsTrigger value="reviews">التقييمات ({school.reviews?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Teachers */}
          <TabsContent value="teachers" className="space-y-4">
            {!school.teachers?.length ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد معلمين بعد</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {school.teachers.map((teacher: any) => (
                  <Card key={teacher.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <Link href={`/teacher/${teacher.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {teacher.avatarUrl ? (
                          <img src={teacher.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                            <GraduationCap className="h-7 w-7 text-green-600" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold">{teacher.name}</h3>
                          <p className="text-sm text-muted-foreground">{teacher.subject || "—"}</p>
                          <p className="text-xs text-muted-foreground">{teacher.yearsExperience} سنة خبرة</p>
                        </div>
                      </div>
                      {teacher.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{teacher.bio}</p>}
                      <div className="mt-3 flex items-center gap-3 text-sm">
                        {teacher.perTaskRate && (
                          <span className="text-green-600 font-bold">{teacher.perTaskRate} ر.س/مهمة</span>
                        )}
                        {teacher.monthlyRate && (
                          <span className="text-blue-600 font-bold">{teacher.monthlyRate} ر.س/شهر</span>
                        )}
                      </div>
                    </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Posts */}
          <TabsContent value="posts" className="space-y-4">
            {!school.posts?.length ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد منشورات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {school.posts.map((post: any) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={post.authorType === "school" ? "default" : "secondary"}>
                          {post.authorType === "school" ? school.name : post.teacherName || "معلم"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString("ar")}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                      {post.mediaUrls?.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {post.mediaUrls.map((url: string, i: number) => (
                            <img key={i} src={url} alt="" className="w-32 h-32 rounded object-cover" />
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => likePost.mutate(post.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Heart className="h-4 w-4 ml-1" />
                          {post.likesCount}
                        </Button>
                        <span className="text-sm text-muted-foreground flex items-center">
                          <MessageSquare className="h-4 w-4 ml-1" />
                          {post.commentsCount}
                        </span>
                      </div>
                      {/* Comment input */}
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder="أضف تعليق..."
                          value={commentTexts[post.id] || ""}
                          onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => addComment.mutate({ postId: post.id, content: commentTexts[post.id] || "" })}
                          disabled={!commentTexts[post.id]?.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="space-y-4">
            {/* Submit Review */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold">أضف تقييمك</h3>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setReviewRating(n)}>
                      <Star className={`h-6 w-6 ${n <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="اكتب تعليقك..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
                <Button onClick={() => submitReview.mutate()} className="bg-blue-600">
                  إرسال التقييم
                </Button>
              </CardContent>
            </Card>

            {school.reviews?.length > 0 && (
              <div className="space-y-3">
                {school.reviews.map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{review.parentName || "ولي أمر"}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`h-4 w-4 ${n <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm mt-2 text-muted-foreground">{review.comment}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(review.createdAt).toLocaleDateString("ar")}</p>
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
