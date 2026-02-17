import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  School, GraduationCap, Star, MessageSquare, BookOpen, Heart,
  MapPin, Globe, Phone, Mail, Send, Users, Calendar, Award,
  ExternalLink, Facebook, Instagram, Youtube, Clock,
  CheckCircle, Share2, BookOpenCheck, TrendingUp
} from "lucide-react";
import { FollowButton } from "@/components/ui/FollowButton";

function SocialIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "facebook": return <Facebook className="h-4 w-4" />;
    case "instagram": return <Instagram className="h-4 w-4" />;
    case "youtube": return <Youtube className="h-4 w-4" />;
    case "twitter": return <span className="text-sm font-bold leading-none">𝕏</span>;
    case "tiktok": return <span className="text-sm font-bold leading-none">T</span>;
    case "website": return <Globe className="h-4 w-4" />;
    default: return <ExternalLink className="h-4 w-4" />;
  }
}

function socialLabel(platform: string): string {
  const labels: Record<string, string> = {
    facebook: "فيسبوك",
    instagram: "انستجرام",
    youtube: "يوتيوب",
    twitter: "تويتر",
    tiktok: "تيك توك",
    website: "الموقع الإلكتروني",
  };
  return labels[platform] || platform;
}

function socialColor(platform: string): string {
  const colors: Record<string, string> = {
    facebook: "bg-blue-600 hover:bg-blue-700",
    instagram: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
    youtube: "bg-red-600 hover:bg-red-700",
    twitter: "bg-black hover:bg-gray-800",
    tiktok: "bg-black hover:bg-gray-800",
    website: "bg-green-600 hover:bg-green-700",
  };
  return colors[platform] || "bg-gray-600 hover:bg-gray-700";
}

export default function SchoolProfile() {
  const [, params] = useRoute("/school/:id");
  const schoolId = params?.id;
  const { toast } = useToast();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("posts");

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-950">
        <School className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-lg text-muted-foreground">المدرسة غير موجودة</p>
      </div>
    );
  }

  const socialEntries = Object.entries(school.socialLinks || {}).filter(([, v]) => v);
  const joinDate = new Date(school.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950" dir="rtl">
      {/* ===== FACEBOOK-STYLE COVER SECTION ===== */}
      <div className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="relative h-52 sm:h-72 md:h-80 rounded-b-xl overflow-hidden">
            {school.coverImageUrl ? (
              <img src={school.coverImageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            ) : (
              <div className="w-full h-full bg-gradient-to-l from-blue-500 via-blue-600 to-indigo-700" />
            )}
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        </div>

        {/* Profile Info Bar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-8 sm:-mt-10 relative z-10 pb-4">
            <div className="relative">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-gray-900 bg-blue-100 dark:bg-blue-900 flex items-center justify-center shadow-xl overflow-hidden relative">
                <School className="h-14 w-14 sm:h-16 sm:w-16 text-blue-600 dark:text-blue-400" />
                {school.imageUrl && (
                  <img
                    src={school.imageUrl}
                    alt={school.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
              </div>
              {school.isVerified && (
                <div className="absolute bottom-1 left-1 bg-blue-600 text-white rounded-full p-1 shadow-md">
                  <CheckCircle className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="flex-1 sm:pb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
                {school.nameAr || school.name}
              </h1>
              {school.nameAr && school.name !== school.nameAr && (
                <p className="text-sm text-muted-foreground">{school.name}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <strong className="text-foreground">{school.avgRating || 0}</strong>
                  <span>({school.reviews?.length || 0} تقييم)</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Users className="h-4 w-4" />
                  {school.totalStudents || 0} طالب
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <GraduationCap className="h-4 w-4" />
                  {school.teachers?.length || school.totalTeachers || 0} معلم
                </span>
              </div>
            </div>

            <div className="flex gap-2 sm:pb-2">
              <FollowButton entityType="school" entityId={schoolId!} />
              <Button variant="outline" size="sm" className="gap-1">
                <Share2 className="h-4 w-4" />
                مشاركة
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-t dark:border-gray-800">
            <div className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
              {[
                { key: "posts", label: "المنشورات", icon: BookOpen },
                { key: "about", label: "حول", icon: School },
                { key: "teachers", label: "المعلمين", icon: GraduationCap },
                { key: "reviews", label: "التقييمات", icon: Star },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  style={{ borderBottomWidth: "3px", borderBottomStyle: "solid", borderBottomColor: activeTab === tab.key ? "#2563eb" : "transparent" }}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* ===== LEFT SIDEBAR ===== */}
          <div className="lg:w-80 space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <School className="h-5 w-5 text-blue-600" />
                  معلومات المدرسة
                </h3>
                {school.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{school.description}</p>
                )}
                <div className="space-y-2.5">
                  {(school.address || school.city || school.governorate) && (
                    <div className="flex items-start gap-2.5 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span>{[school.address, school.city, school.governorate].filter(Boolean).join("، ")}</span>
                    </div>
                  )}
                  {school.phoneNumber && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${school.phoneNumber}`} className="hover:text-blue-600" dir="ltr">{school.phoneNumber}</a>
                    </div>
                  )}
                  {school.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${school.email}`} className="hover:text-blue-600 text-blue-600">{school.email}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>انضمت في {joinDate}</span>
                  </div>
                  {school.referralCode && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>كود الإحالة: <strong className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-blue-600">{school.referralCode}</strong></span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {socialEntries.length > 0 && (
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    وسائل التواصل
                  </h3>
                  <div className="space-y-2">
                    {socialEntries.map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2.5 text-white text-sm px-3 py-2.5 rounded-lg transition-all ${socialColor(platform)} shadow-sm`}
                      >
                        <SocialIcon platform={platform} />
                        <span className="font-medium">{socialLabel(platform)}</span>
                        <ExternalLink className="h-3 w-3 mr-auto opacity-60" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  إحصائيات
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">{school.teachers?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">معلم</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{school.totalStudents || 0}</div>
                    <div className="text-xs text-muted-foreground">طالب</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600">{school.avgRating || 0}</div>
                    <div className="text-xs text-muted-foreground">تقييم</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">{school.posts?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">منشور</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {school.teachers?.length > 0 && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      المعلمين
                    </h3>
                    <button onClick={() => setActiveTab("teachers")} className="text-xs text-blue-600 hover:underline">
                      عرض الكل
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {school.teachers.slice(0, 6).map((teacher: any) => (
                      <Link key={teacher.id} href={`/teacher/${teacher.id}`}>
                        <div className="text-center group cursor-pointer">
                          {teacher.avatarUrl ? (
                            <img src={teacher.avatarUrl} alt="" className="w-14 h-14 mx-auto rounded-lg object-cover group-hover:ring-2 ring-blue-400 transition-all" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          ) : (
                            <div className="w-14 h-14 mx-auto rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center group-hover:ring-2 ring-blue-400 transition-all">
                              <GraduationCap className="h-7 w-7 text-green-600" />
                            </div>
                          )}
                          <p className="text-xs font-medium mt-1 line-clamp-1">{teacher.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ===== MAIN CONTENT AREA ===== */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* POSTS TAB */}
            {activeTab === "posts" && (
              <>
                {!school.posts?.length ? (
                  <Card className="shadow-sm">
                    <CardContent className="p-12 text-center">
                      <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-muted-foreground">لا يوجد منشورات بعد</p>
                    </CardContent>
                  </Card>
                ) : (
                  school.posts.map((post: any) => {
                    const isLong = post.content?.length > 300;
                    const expanded = expandedPosts[post.id];
                    return (
                      <Card key={post.id} className="shadow-sm">
                        <CardContent className="p-0">
                          <div className="flex items-center gap-3 p-4 pb-2">
                            {post.authorType === "school" ? (
                              school.imageUrl ? (
                                <img src={school.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <School className="h-5 w-5 text-blue-600" />
                                </div>
                              )
                            ) : (
                              post.teacherAvatar ? (
                                <img src={post.teacherAvatar} alt="" className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <GraduationCap className="h-5 w-5 text-green-600" />
                                </div>
                              )
                            )}
                            <div className="flex-1">
                              <p className="font-bold text-sm">
                                {post.authorType === "school" ? (school.nameAr || school.name) : (post.teacherName || "معلم")}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(post.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                                {post.isPinned && <Badge variant="outline" className="mr-1 text-xs py-0 px-1">مثبت</Badge>}
                              </div>
                            </div>
                          </div>

                          <div className="px-4 pb-2">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {isLong && !expanded ? post.content.substring(0, 300) + "..." : post.content}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => setExpandedPosts(p => ({ ...p, [post.id]: !expanded }))}
                                className="text-blue-600 text-sm font-medium mt-1 hover:underline"
                              >
                                {expanded ? "عرض أقل" : "عرض المزيد"}
                              </button>
                            )}
                          </div>

                          {post.mediaUrls?.length > 0 && (
                            <div className={`${post.mediaUrls.length === 1 ? "" : "grid grid-cols-2 gap-0.5"}`}>
                              {post.mediaUrls.map((url: string, i: number) => {
                                const mediaType = post.mediaTypes?.[i];
                                if (mediaType === "video") {
                                  return <video key={i} src={url} controls className="w-full max-h-96 object-contain bg-black" />;
                                }
                                return (
                                  <img
                                    key={i}
                                    src={url}
                                    alt=""
                                    className={`w-full object-cover ${post.mediaUrls.length === 1 ? "max-h-[500px]" : "h-48 sm:h-64"}`}
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                  />
                                );
                              })}
                            </div>
                          )}

                          <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b dark:border-gray-800">
                            <span className="flex items-center gap-1">
                              <span className="bg-blue-600 text-white rounded-full p-0.5 inline-flex"><Heart className="h-2.5 w-2.5 fill-white" /></span>
                              {post.likesCount}
                            </span>
                            <button onClick={() => setShowComments(p => ({ ...p, [post.id]: !p[post.id] }))} className="hover:underline">
                              {post.commentsCount} تعليق
                            </button>
                          </div>

                          <div className="px-4 py-1 flex border-b dark:border-gray-800">
                            <button
                              onClick={() => likePost.mutate(post.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                              <Heart className="h-5 w-5" />
                              أعجبني
                            </button>
                            <button
                              onClick={() => setShowComments(p => ({ ...p, [post.id]: !p[post.id] }))}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                              <MessageSquare className="h-5 w-5" />
                              تعليق
                            </button>
                          </div>

                          {showComments[post.id] !== false && (
                            <div className="p-3 flex items-center gap-2">
                              <Input
                                placeholder="اكتب تعليقاً..."
                                value={commentTexts[post.id] || ""}
                                onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                className="text-sm rounded-full bg-gray-100 dark:bg-gray-800 border-0"
                                onKeyDown={e => {
                                  if (e.key === "Enter" && commentTexts[post.id]?.trim()) {
                                    addComment.mutate({ postId: post.id, content: commentTexts[post.id] });
                                  }
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (commentTexts[post.id]?.trim()) {
                                    addComment.mutate({ postId: post.id, content: commentTexts[post.id] });
                                  }
                                }}
                                disabled={!commentTexts[post.id]?.trim()}
                                className="shrink-0"
                              >
                                <Send className="h-4 w-4 text-blue-600" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </>
            )}

            {/* ABOUT TAB */}
            {activeTab === "about" && (
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <School className="h-6 w-6 text-blue-600" />
                      حول المدرسة
                    </h2>
                    {school.description ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">{school.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">لم يتم إضافة وصف بعد</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Phone className="h-6 w-6 text-blue-600" />
                      معلومات التواصل
                    </h2>
                    <div className="space-y-3">
                      {(school.address || school.city || school.governorate) && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <MapPin className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">العنوان</p>
                            <p className="text-sm text-muted-foreground">{[school.address, school.city, school.governorate].filter(Boolean).join("، ")}</p>
                          </div>
                        </div>
                      )}
                      {school.phoneNumber && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Phone className="h-5 w-5 text-green-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">رقم الهاتف</p>
                            <a href={`tel:${school.phoneNumber}`} className="text-sm text-blue-600 hover:underline" dir="ltr">{school.phoneNumber}</a>
                          </div>
                        </div>
                      )}
                      {school.email && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Mail className="h-5 w-5 text-blue-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">البريد الإلكتروني</p>
                            <a href={`mailto:${school.email}`} className="text-sm text-blue-600 hover:underline">{school.email}</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {socialEntries.length > 0 && (
                  <Card className="shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Globe className="h-6 w-6 text-blue-600" />
                        صفحات التواصل الاجتماعي
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {socialEntries.map(([platform, url]) => (
                          <a
                            key={platform}
                            href={url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 text-white px-4 py-3 rounded-xl transition-all ${socialColor(platform)} shadow-md hover:shadow-lg`}
                          >
                            <SocialIcon platform={platform} />
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{socialLabel(platform)}</p>
                              <p className="text-xs opacity-75 truncate" dir="ltr">{(url as string).replace(/^https?:\/\/(www\.)?/, "").substring(0, 30)}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 opacity-60" />
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <BookOpenCheck className="h-6 w-6 text-blue-600" />
                      معلومات عامة
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">تاريخ الانضمام</p>
                          <p className="text-sm font-medium">{joinDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">حالة التوثيق</p>
                          <p className="text-sm font-medium">{school.isVerified ? "موثقة ✓" : "غير موثقة"}</p>
                        </div>
                      </div>
                      {school.referralCode && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <Share2 className="h-5 w-5 text-purple-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">كود الإحالة</p>
                            <p className="text-sm font-mono font-bold text-blue-600">{school.referralCode}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">نقاط النشاط</p>
                          <p className="text-sm font-medium">{school.activityScore}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TEACHERS TAB */}
            {activeTab === "teachers" && (
              <>
                {!school.teachers?.length ? (
                  <Card className="shadow-sm">
                    <CardContent className="p-12 text-center">
                      <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-muted-foreground">لا يوجد معلمين بعد</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {school.teachers.map((teacher: any) => {
                      const teacherSocials = Object.entries(teacher.socialLinks || {}).filter(([, v]) => v);
                      return (
                        <Card key={teacher.id} className="shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          {teacher.coverImageUrl && (
                            <img src={teacher.coverImageUrl} alt="" className="w-full h-32 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          )}
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Link href={`/teacher/${teacher.id}`}>
                                {teacher.avatarUrl ? (
                                  <img
                                    src={teacher.avatarUrl}
                                    alt=""
                                    className={`w-16 h-16 rounded-full object-cover border-2 border-white shadow-md ${teacher.coverImageUrl ? "-mt-12" : ""}`}
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                  />
                                ) : (
                                  <div className={`w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center border-2 border-white shadow-md ${teacher.coverImageUrl ? "-mt-12" : ""}`}>
                                    <GraduationCap className="h-8 w-8 text-green-600" />
                                  </div>
                                )}
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link href={`/teacher/${teacher.id}`}>
                                  <h3 className="font-bold text-base hover:text-blue-600 transition-colors cursor-pointer">{teacher.name}</h3>
                                </Link>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  {teacher.subject && (
                                    <Badge variant="secondary" className="text-xs">{teacher.subject}</Badge>
                                  )}
                                  {teacher.yearsExperience > 0 && (
                                    <span className="text-xs text-muted-foreground">{teacher.yearsExperience} سنة خبرة</span>
                                  )}
                                </div>
                                {teacher.bio && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{teacher.bio}</p>
                                )}
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {teacher.totalTasksSold || 0} مهمة مباعة
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {teacher.totalStudents || 0} طالب
                                  </span>
                                  {teacher.perTaskRate && (
                                    <span className="text-green-600 font-bold">{teacher.perTaskRate} ج.م/مهمة</span>
                                  )}
                                  {teacher.monthlyRate && (
                                    <span className="text-blue-600 font-bold">{teacher.monthlyRate} ج.م/شهر</span>
                                  )}
                                </div>
                                {teacherSocials.length > 0 && (
                                  <div className="flex gap-1.5 mt-2">
                                    {teacherSocials.map(([platform, url]) => (
                                      <a
                                        key={platform}
                                        href={url as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                                        title={socialLabel(platform)}
                                      >
                                        <SocialIcon platform={platform} />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Link href={`/teacher/${teacher.id}`}>
                                <Button size="sm" variant="outline" className="shrink-0 gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  عرض الملف
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-5xl font-extrabold text-foreground">{school.avgRating || 0}</div>
                        <div className="flex gap-0.5 mt-1 justify-center">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} className={`h-4 w-4 ${n <= Math.round(school.avgRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{school.reviews?.length || 0} تقييم</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map(n => {
                          const count = school.reviews?.filter((r: any) => r.rating === n).length || 0;
                          const pct = school.reviews?.length ? (count / school.reviews.length) * 100 : 0;
                          return (
                            <div key={n} className="flex items-center gap-2 text-sm">
                              <span className="w-3">{n}</span>
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-6 text-xs text-muted-foreground text-left">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-6 space-y-3">
                    <h3 className="font-bold text-lg">أضف تقييمك</h3>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setReviewRating(n)} className="transition-transform hover:scale-110">
                          <Star className={`h-8 w-8 ${n <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="شاركنا رأيك عن المدرسة..."
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button onClick={() => submitReview.mutate()} className="bg-blue-600 hover:bg-blue-700" disabled={submitReview.isPending}>
                      {submitReview.isPending ? "جاري الإرسال..." : "إرسال التقييم"}
                    </Button>
                  </CardContent>
                </Card>

                {school.reviews?.length > 0 && (
                  <div className="space-y-3">
                    {school.reviews.map((review: any) => (
                      <Card key={review.id} className="shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm">{review.parentName || "ولي أمر"}</span>
                                <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
                              </div>
                              <div className="flex gap-0.5 mt-0.5">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                                ))}
                              </div>
                              {review.comment && <p className="text-sm mt-2 text-muted-foreground">{review.comment}</p>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
