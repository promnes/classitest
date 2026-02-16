import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, authenticatedFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { FollowButton } from "@/components/ui/FollowButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Heart,
  BookOpen,
  Users,
  Star,
  ShoppingCart,
  School,
  GraduationCap,
  Sparkles,
  Trash2,
  Send,
  Search,
  ChevronRight,
} from "lucide-react";

export default function ParentProfile() {
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const token = localStorage.getItem("token");
  const [activeTab, setActiveTab] = useState("library");
  const [selectedChild, setSelectedChild] = useState("");

  // Profile data
  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/parent/profile-data"],
    queryFn: () => authenticatedFetch("/api/parent/profile-data"),
    enabled: !!token,
  });

  // Task library
  const { data: taskLibrary } = useQuery<any>({
    queryKey: ["/api/parent/task-library"],
    queryFn: () => authenticatedFetch("/api/parent/task-library"),
    enabled: !!token,
  });

  // Favorites
  const { data: favorites } = useQuery<any>({
    queryKey: ["/api/parent/favorites"],
    queryFn: () => authenticatedFetch("/api/parent/favorites"),
    enabled: !!token,
  });

  // Following
  const { data: following } = useQuery<any>({
    queryKey: ["/api/parent/following"],
    queryFn: () => authenticatedFetch("/api/parent/following"),
    enabled: !!token,
  });

  // Recommendations
  const { data: recommendations } = useQuery<any>({
    queryKey: ["/api/parent/recommendations"],
    queryFn: () => authenticatedFetch("/api/parent/recommendations"),
    enabled: !!token,
    staleTime: 120000,
  });

  // Children list
  const { data: childrenData } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  // Use task from library
  const useTaskMutation = useMutation({
    mutationFn: async ({ libraryId, childId }: { libraryId: string; childId: string }) => {
      const res = await apiRequest("POST", `/api/parent/task-library/${libraryId}/use`, { childId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/task-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      toast({ title: "تم ✅", description: data?.data?.message || "تم إرسال المهمة للطفل" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err?.message || "فشل إرسال المهمة", variant: "destructive" });
    },
  });

  // Toggle favorite
  const toggleFavMutation = useMutation({
    mutationFn: async ({ taskType, taskId }: { taskType: string; taskId: string }) => {
      const res = await apiRequest("POST", "/api/parent/favorites/toggle", { taskType, taskId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/favorites"] });
    },
  });

  const parent = profileData?.parent;
  const stats = profileData?.stats;
  const childrenList = (childrenData as any)?.data || (childrenData as any) || [];
  const libraryTasks = taskLibrary?.tasks || [];
  const favList = favorites?.favorites || [];
  const followList = following?.following || [];
  const recs = recommendations || {};

  if (!token) {
    navigate("/parent-auth");
    return null;
  }

  return (
    <div className={`min-h-screen pb-20 ${isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-30 px-4 py-3 flex items-center gap-3 border-b ${
        isDark ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-200"
      } backdrop-blur-md`}>
        <Button variant="ghost" size="icon" onClick={() => navigate("/parent-dashboard")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">ملفي الشخصي</h1>
      </div>

      {/* Profile Header */}
      {parent && (
        <div className="relative">
          <div className={`h-32 ${isDark ? "bg-gradient-to-r from-blue-900 to-purple-900" : "bg-gradient-to-r from-blue-400 to-purple-500"}`}>
            {parent.coverImageUrl && (
              <img src={parent.coverImageUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="px-4 -mt-12 relative z-10">
            <div className="flex items-end gap-3">
              <div className={`h-20 w-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold ${
                isDark ? "bg-gray-800 border-gray-900 text-blue-400" : "bg-white border-white text-blue-600"
              }`}>
                {parent.avatarUrl ? (
                  <img src={parent.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  parent.name?.charAt(0) || "👤"
                )}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold">{parent.name}</h2>
                {parent.governorate && (
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    📍 {parent.governorate}{parent.city ? ` - ${parent.city}` : ""}
                  </p>
                )}
              </div>
            </div>
            {parent.bio && (
              <p className={`mt-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{parent.bio}</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 px-4 mt-4">
            {[
              { label: "الأطفال", value: stats?.children || 0, icon: Users },
              { label: "المكتبة", value: stats?.libraryTasks || 0, icon: BookOpen },
              { label: "المفضلة", value: stats?.favorites || 0, icon: Heart },
              { label: "متابَع", value: stats?.following || 0, icon: Star },
            ].map((s, i) => (
              <div key={i} className={`text-center p-2 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-white"}`}>
                <s.icon className={`h-4 w-4 mx-auto mb-1 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="library">📚 المكتبة</TabsTrigger>
            <TabsTrigger value="favorites">❤️ المفضلة</TabsTrigger>
            <TabsTrigger value="following">👥 المتابعة</TabsTrigger>
            <TabsTrigger value="discover">✨ مقترح</TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="mt-4 space-y-3">
            {libraryTasks.length === 0 ? (
              <div className={`text-center py-8 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-white"}`}>
                <BookOpen className={`h-10 w-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>مكتبتك فارغة</p>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>اشترِ مهام من المعلمين لتظهر هنا</p>
              </div>
            ) : (
              libraryTasks.map((item: any) => (
                <Card key={item.id} className={isDark ? "bg-gray-800/50 border-gray-700" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {item.subjectLabel || "بدون مادة"} • {item.pointsReward} نقطة
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {item.purchaseType === "permanent" ? "♾️ دائم" : "1️⃣ مرة واحدة"}
                          </Badge>
                          <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            استُخدمت {item.usageCount} مرة
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {/* Select child & send */}
                        <select
                          value={selectedChild}
                          onChange={(e) => setSelectedChild(e.target.value)}
                          className={`text-xs px-2 py-1 rounded border ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                        >
                          <option value="">اختر طفل</option>
                          {(Array.isArray(childrenList) ? childrenList : []).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          className="text-xs gap-1"
                          disabled={!selectedChild || useTaskMutation.isPending}
                          onClick={() => useTaskMutation.mutate({ libraryId: item.id, childId: selectedChild })}
                        >
                          <Send className="h-3 w-3" /> إرسال
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="mt-4 space-y-3">
            {favList.length === 0 ? (
              <div className={`text-center py-8 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-white"}`}>
                <Heart className={`h-10 w-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>لا توجد مهام مفضلة</p>
              </div>
            ) : (
              favList.map((fav: any) => (
                <Card key={fav.id} className={isDark ? "bg-gray-800/50 border-gray-700" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{fav.task?.title || fav.task?.question}</h4>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {fav.taskType === "teacher_task" ? "مهمة معلم" : "مهمة قالب"}
                          {fav.task?.price ? ` • ${fav.task.price} ر.س` : ""}
                          {fav.task?.pointsReward ? ` • ${fav.task.pointsReward} نقطة` : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavMutation.mutate({ taskType: fav.taskType, taskId: fav.taskId })}
                      >
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="mt-4 space-y-3">
            {followList.length === 0 ? (
              <div className={`text-center py-8 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-white"}`}>
                <Users className={`h-10 w-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>لا تتابع أحداً بعد</p>
              </div>
            ) : (
              followList.map((f: any) => (
                <Card key={f.id} className={`cursor-pointer ${isDark ? "bg-gray-800/50 border-gray-700" : ""}`}
                  onClick={() => navigate(f.entityType === "school" ? `/school/${f.entityId}` : `/teacher/${f.entityId}`)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isDark ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      {f.entityType === "school" ? (
                        <School className="h-5 w-5 text-blue-500" />
                      ) : (
                        <GraduationCap className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{f.entity?.name || "غير معروف"}</h4>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {f.entityType === "school" ? "مدرسة" : "معلم"}
                        {f.entity?.subject ? ` • ${f.entity.subject}` : ""}
                        {f.entity?.governorate ? ` • ${f.entity.governorate}` : ""}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Discover / Recommendations Tab */}
          <TabsContent value="discover" className="mt-4 space-y-5">
            {/* Recommended Teachers */}
            {recs.teachers && recs.teachers.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-2 flex items-center gap-1">
                  <GraduationCap className="h-4 w-4 text-purple-500" /> معلمون مقترحون
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {recs.teachers.map((t: any) => (
                    <Card key={t.id} className={`min-w-[160px] cursor-pointer flex-shrink-0 ${isDark ? "bg-gray-800/50 border-gray-700" : ""}`}
                      onClick={() => navigate(`/teacher/${t.id}`)}>
                      <CardContent className="p-3 text-center">
                        <div className={`h-12 w-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold ${
                          isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-600"
                        }`}>
                          {t.avatarUrl ? (
                            <img src={t.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                          ) : (
                            t.name?.charAt(0)
                          )}
                        </div>
                        <p className="font-semibold text-sm mt-2 truncate">{t.name}</p>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t.subject || "عام"}</p>
                        <FollowButton entityType="teacher" entityId={t.id} size="sm" className="mt-2 w-full text-xs" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Schools */}
            {recs.schools && recs.schools.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-2 flex items-center gap-1">
                  <School className="h-4 w-4 text-blue-500" /> مدارس مقترحة
                </h3>
                <div className="space-y-2">
                  {recs.schools.map((s: any) => (
                    <Card key={s.id} className={`cursor-pointer ${isDark ? "bg-gray-800/50 border-gray-700" : ""}`}
                      onClick={() => navigate(`/school/${s.id}`)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isDark ? "bg-blue-900/50" : "bg-blue-100"
                        }`}>
                          <School className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{s.name}</p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {s.governorate || ""} • {s.totalTeachers || 0} معلم
                            {s.isVerified && " ✓"}
                          </p>
                        </div>
                        <FollowButton entityType="school" entityId={s.id} size="sm" className="text-xs" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Tasks */}
            {recs.tasks && recs.tasks.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-2 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-amber-500" /> مهام شائعة
                </h3>
                <div className="space-y-2">
                  {recs.tasks.map((t: any) => (
                    <Card key={t.id} className={isDark ? "bg-gray-800/50 border-gray-700" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{t.title}</h4>
                            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              {t.subjectLabel || "عام"} • {t.price} ر.س • {t.purchaseCount || 0} مشتري
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavMutation.mutate({ taskType: "teacher_task", taskId: t.id });
                              }}
                            >
                              <Heart className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs gap-1"
                              onClick={() => navigate(`/teacher/${t.teacherId}`)}
                            >
                              <ShoppingCart className="h-3 w-3" /> شراء
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {(!recs.teachers?.length && !recs.schools?.length && !recs.tasks?.length) && (
              <div className={`text-center py-8 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-white"}`}>
                <Sparkles className={`h-10 w-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>لا توجد اقتراحات حالياً</p>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>تابع مدارس ومعلمين لتحصل على اقتراحات أفضل</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
