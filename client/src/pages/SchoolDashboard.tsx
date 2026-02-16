import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  School, Users, GraduationCap, TrendingUp, Plus, Edit, Trash2,
  Copy, LogOut, Activity, Star, MessageSquare, BookOpen, Eye, EyeOff
} from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  subject: string | null;
  yearsExperience: number;
  username: string;
  monthlyRate: string | null;
  perTaskRate: string | null;
  pricingModel: string;
  isActive: boolean;
  totalTasksSold: number;
  totalStudents: number;
  activityScore: number;
  createdAt: string;
}

interface Post {
  id: string;
  authorType: string;
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  isActive: boolean;
  teacherName?: string;
  teacherAvatar?: string;
  createdAt: string;
}

export default function SchoolDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem("schoolToken");
  const schoolData = JSON.parse(localStorage.getItem("schoolData") || "{}");

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    name: "", username: "", password: "", bio: "", subject: "",
    yearsExperience: 0, monthlyRate: "", perTaskRate: "", pricingModel: "per_task",
  });
  const [postContent, setPostContent] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) setLocation("/school/login");
  }, [token, setLocation]);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ===== Queries =====

  const { data: profile } = useQuery({
    queryKey: ["school-profile"],
    queryFn: async () => {
      const res = await fetch("/api/school/profile", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery({
    queryKey: ["school-stats"],
    queryFn: async () => {
      const res = await fetch("/api/school/stats", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["school-teachers"],
    queryFn: async () => {
      const res = await fetch("/api/school/teachers", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: feed = [] } = useQuery<Post[]>({
    queryKey: ["school-feed"],
    queryFn: async () => {
      const res = await fetch("/api/school/feed", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["school-students"],
    queryFn: async () => {
      const res = await fetch("/api/school/students", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["school-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/school/reviews", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  // ===== Mutations =====

  const createTeacher = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/school/teachers", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      setShowTeacherModal(false);
      resetTeacherForm();
      toast({ title: "تم إضافة المعلم بنجاح" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateTeacher = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/school/teachers/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      setShowTeacherModal(false);
      setEditingTeacher(null);
      resetTeacherForm();
      toast({ title: "تم تحديث بيانات المعلم" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteTeacher = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/school/teachers/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      toast({ title: "تم حذف المعلم" });
    },
  });

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/school/posts", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-feed"] });
      setShowPostModal(false);
      setPostContent("");
      toast({ title: "تم نشر المنشور بنجاح" });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/school/posts/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-feed"] });
      toast({ title: "تم حذف المنشور" });
    },
  });

  function resetTeacherForm() {
    setTeacherForm({
      name: "", username: "", password: "", bio: "", subject: "",
      yearsExperience: 0, monthlyRate: "", perTaskRate: "", pricingModel: "per_task",
    });
  }

  function openEditTeacher(teacher: Teacher) {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      username: teacher.username,
      password: "",
      bio: teacher.bio || "",
      subject: teacher.subject || "",
      yearsExperience: teacher.yearsExperience,
      monthlyRate: teacher.monthlyRate || "",
      perTaskRate: teacher.perTaskRate || "",
      pricingModel: teacher.pricingModel,
    });
    setShowTeacherModal(true);
  }

  function handleSubmitTeacher() {
    if (editingTeacher) {
      updateTeacher.mutate({ id: editingTeacher.id, ...teacherForm });
    } else {
      if (!teacherForm.name || !teacherForm.username || !teacherForm.password) {
        toast({ title: "الاسم واسم المستخدم وكلمة المرور مطلوبة", variant: "destructive" });
        return;
      }
      createTeacher.mutate(teacherForm);
    }
  }

  function handleLogout() {
    localStorage.removeItem("schoolToken");
    localStorage.removeItem("schoolData");
    setLocation("/school/login");
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.imageUrl ? (
              <img src={profile.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <School className="h-8 w-8" />
            )}
            <div>
              <h1 className="font-bold text-lg">{profile?.name || schoolData.name}</h1>
              <p className="text-blue-100 text-xs">لوحة تحكم المدرسة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700"
              onClick={() => {
                navigator.clipboard.writeText(profile?.referralCode || "");
                toast({ title: "تم نسخ كود الإحالة" });
              }}
            >
              <Copy className="h-4 w-4 ml-1" />
              {profile?.referralCode}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
              <div className="text-xs text-muted-foreground">المعلمين</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              <div className="text-xs text-muted-foreground">الطلاب</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
              <div className="text-xs text-muted-foreground">المنشورات</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats?.avgRating || 0}</div>
              <div className="text-xs text-muted-foreground">التقييم ({stats?.totalReviews || 0})</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="teachers" dir="rtl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="teachers">المعلمين</TabsTrigger>
            <TabsTrigger value="posts">المنشورات</TabsTrigger>
            <TabsTrigger value="students">الطلاب</TabsTrigger>
            <TabsTrigger value="reviews">التقييمات</TabsTrigger>
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">إدارة المعلمين</h2>
              <Button onClick={() => { resetTeacherForm(); setEditingTeacher(null); setShowTeacherModal(true); }} className="bg-blue-600">
                <Plus className="h-4 w-4 ml-1" />
                إضافة معلم
              </Button>
            </div>

            {teachers.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لم يتم إضافة معلمين بعد</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {teachers.map((teacher: Teacher) => (
                  <Card key={teacher.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {teacher.avatarUrl ? (
                            <img src={teacher.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <GraduationCap className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold">{teacher.name}</h3>
                            <p className="text-sm text-muted-foreground">{teacher.subject || "بدون تخصص"}</p>
                            <p className="text-xs text-muted-foreground">@{teacher.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={teacher.isActive ? "default" : "secondary"}>
                            {teacher.isActive ? "نشط" : "غير نشط"}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{teacher.totalTasksSold} مهمة مباعة</span>
                        <span>{teacher.totalStudents} طالب</span>
                        <span>{teacher.yearsExperience} سنة خبرة</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditTeacher(teacher)}>
                          <Edit className="h-3 w-3 ml-1" />
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("هل تريد حذف هذا المعلم؟")) deleteTeacher.mutate(teacher.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">المنشورات</h2>
              <Button onClick={() => setShowPostModal(true)} className="bg-blue-600">
                <Plus className="h-4 w-4 ml-1" />
                منشور جديد
              </Button>
            </div>

            {feed.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد منشورات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {feed.map((post: Post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={post.authorType === "school" ? "default" : "secondary"}>
                            {post.authorType === "school" ? "المدرسة" : post.teacherName || "معلم"}
                          </Badge>
                          {post.isPinned && <Badge variant="outline">مثبت</Badge>}
                        </div>
                        {post.authorType === "school" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("هل تريد حذف هذا المنشور؟")) deletePost.mutate(post.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {post.mediaUrls.map((url: string, i: number) => (
                            <img key={i} src={url} alt="" className="w-24 h-24 rounded object-cover" />
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>❤️ {post.likesCount}</span>
                        <span>💬 {post.commentsCount}</span>
                        <span>{new Date(post.createdAt).toLocaleDateString("ar")}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <h2 className="text-lg font-bold">الطلاب المسجلين</h2>
            {students.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد طلاب مسجلين بعد</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {students.map((student: any) => (
                  <Card key={student.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {student.childAvatar ? (
                          <img src={student.childAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold">{student.childName || "طالب"}</h3>
                          <p className="text-sm text-muted-foreground">ولي الأمر: {student.parentName || "—"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(student.createdAt).toLocaleDateString("ar")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <h2 className="text-lg font-bold">التقييمات</h2>
            {reviews.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد تقييمات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{review.parentName || "ولي أمر"}</span>
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

      {/* Teacher Modal */}
      <Dialog open={showTeacherModal} onOpenChange={setShowTeacherModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "تعديل المعلم" : "إضافة معلم جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الاسم *</Label>
              <Input value={teacherForm.name} onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>اسم المستخدم *</Label>
              <Input value={teacherForm.username} onChange={e => setTeacherForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <Label>{editingTeacher ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور *"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={teacherForm.password}
                  onChange={e => setTeacherForm(f => ({ ...f, password: e.target.value }))}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>التخصص</Label>
              <Input value={teacherForm.subject} onChange={e => setTeacherForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <Label>سنوات الخبرة</Label>
              <Input type="number" value={teacherForm.yearsExperience} onChange={e => setTeacherForm(f => ({ ...f, yearsExperience: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>نبذة</Label>
              <Textarea value={teacherForm.bio} onChange={e => setTeacherForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>السعر الشهري</Label>
                <Input value={teacherForm.monthlyRate} onChange={e => setTeacherForm(f => ({ ...f, monthlyRate: e.target.value }))} />
              </div>
              <div>
                <Label>سعر المهمة</Label>
                <Input value={teacherForm.perTaskRate} onChange={e => setTeacherForm(f => ({ ...f, perTaskRate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeacherModal(false)}>إلغاء</Button>
            <Button className="bg-blue-600" onClick={handleSubmitTeacher}>
              {editingTeacher ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>منشور جديد</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="اكتب محتوى المنشور..."
            value={postContent}
            onChange={e => setPostContent(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostModal(false)}>إلغاء</Button>
            <Button className="bg-blue-600" onClick={() => createPost.mutate(postContent)} disabled={!postContent.trim()}>
              نشر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
