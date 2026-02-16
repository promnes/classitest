import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  GraduationCap, BookOpen, Users, Star, LogOut, Plus, Edit, Trash2,
  DollarSign, TrendingUp, ArrowDownToLine, CheckCircle, Clock, MessageSquare
} from "lucide-react";

interface Task {
  id: string;
  question: string;
  answers: { id: string; text: string; isCorrect: boolean; imageUrl?: string }[];
  explanation: string | null;
  price: string;
  purchaseCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem("teacherToken");
  const teacherData = JSON.parse(localStorage.getItem("teacherData") || "{}");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [taskForm, setTaskForm] = useState({
    question: "",
    explanation: "",
    price: "",
    answers: [
      { id: "a1", text: "", isCorrect: true },
      { id: "a2", text: "", isCorrect: false },
      { id: "a3", text: "", isCorrect: false },
      { id: "a4", text: "", isCorrect: false },
    ],
  });

  useEffect(() => {
    if (!token) setLocation("/teacher/login");
  }, [token, setLocation]);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ===== Queries =====

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/profile", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery({
    queryKey: ["teacher-stats"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/stats", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["teacher-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/tasks", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: balance } = useQuery({
    queryKey: ["teacher-balance"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/balance", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["teacher-orders"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/orders", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["teacher-posts"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/posts", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["teacher-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/withdrawals", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["teacher-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/reviews", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  // ===== Mutations =====

  const createTask = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/teacher/tasks", {
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
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      setShowTaskModal(false);
      resetTaskForm();
      toast({ title: "تم إضافة المهمة بنجاح" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/teacher/tasks/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      setShowTaskModal(false);
      setEditingTask(null);
      resetTaskForm();
      toast({ title: "تم تحديث المهمة" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/tasks/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      toast({ title: "تم حذف المهمة" });
    },
  });

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/teacher/posts", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-posts"] });
      setShowPostModal(false);
      setPostContent("");
      toast({ title: "تم نشر المنشور" });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/posts/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-posts"] });
      toast({ title: "تم حذف المنشور" });
    },
  });

  const requestWithdrawal = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/teacher/withdrawals", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-balance"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-withdrawals"] });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      toast({ title: "تم إرسال طلب السحب" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  function resetTaskForm() {
    setTaskForm({
      question: "", explanation: "", price: "",
      answers: [
        { id: "a1", text: "", isCorrect: true },
        { id: "a2", text: "", isCorrect: false },
        { id: "a3", text: "", isCorrect: false },
        { id: "a4", text: "", isCorrect: false },
      ],
    });
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskForm({
      question: task.question,
      explanation: task.explanation || "",
      price: task.price,
      answers: task.answers.length > 0 ? task.answers : [
        { id: "a1", text: "", isCorrect: true },
        { id: "a2", text: "", isCorrect: false },
        { id: "a3", text: "", isCorrect: false },
        { id: "a4", text: "", isCorrect: false },
      ],
    });
    setShowTaskModal(true);
  }

  function handleSubmitTask() {
    const data = {
      question: taskForm.question,
      explanation: taskForm.explanation || null,
      price: taskForm.price,
      answers: taskForm.answers.filter(a => a.text.trim()),
    };
    if (!data.question || !data.price || data.answers.length < 2) {
      toast({ title: "السؤال والسعر وإجابتين على الأقل مطلوبة", variant: "destructive" });
      return;
    }
    if (!data.answers.some(a => a.isCorrect)) {
      toast({ title: "يجب تحديد إجابة صحيحة واحدة على الأقل", variant: "destructive" });
      return;
    }
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...data });
    } else {
      createTask.mutate(data);
    }
  }

  function handleLogout() {
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherData");
    setLocation("/teacher/login");
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <GraduationCap className="h-8 w-8" />
            )}
            <div>
              <h1 className="font-bold text-lg">{profile?.name || teacherData.name}</h1>
              <p className="text-green-100 text-xs">لوحة تحكم المعلم — {profile?.schoolName || ""}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-green-700" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
              <div className="text-xs text-muted-foreground">المهام</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{balance?.availableBalance || "0.00"}</div>
              <div className="text-xs text-muted-foreground">الرصيد المتاح</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <div className="text-xs text-muted-foreground">الطلبات</div>
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
        <Tabs defaultValue="tasks" dir="rtl">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tasks">المهام</TabsTrigger>
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="balance">المحفظة</TabsTrigger>
            <TabsTrigger value="posts">المنشورات</TabsTrigger>
            <TabsTrigger value="reviews">التقييمات</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">إدارة المهام</h2>
              <Button onClick={() => { resetTaskForm(); setEditingTask(null); setShowTaskModal(true); }} className="bg-green-600">
                <Plus className="h-4 w-4 ml-1" />
                مهمة جديدة
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لم يتم إضافة مهام بعد</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {tasks.map((task: Task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm">{task.question}</h3>
                        <Badge variant={task.isActive ? "default" : "secondary"}>
                          {task.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-green-600 font-bold">{task.price} ر.س</span>
                        <span className="mx-2 text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{task.purchaseCount} عملية شراء</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {task.answers?.length || 0} إجابات
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditTask(task)}>
                          <Edit className="h-3 w-3 ml-1" />
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("هل تريد حذف هذه المهمة؟")) deleteTask.mutate(task.id);
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

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-lg font-bold">الطلبات</h2>
            {orders.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد طلبات بعد</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm">{order.taskQuestion || "مهمة"}</h3>
                          <p className="text-xs text-muted-foreground">المشتري: {order.childName || "طالب"}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-green-600">{order.teacherEarningAmount} ر.س</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {order.isSettled ? (
                              <><CheckCircle className="h-3 w-3 text-green-600" /> تم التسوية</>
                            ) : (
                              <><Clock className="h-3 w-3 text-yellow-600" /> معلق</>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Balance Tab */}
          <TabsContent value="balance" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">الرصيد المتاح</div>
                  <div className="text-2xl font-bold text-green-600">{balance?.availableBalance || "0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">الرصيد المعلق</div>
                  <div className="text-2xl font-bold text-yellow-600">{balance?.pendingBalance || "0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">إجمالي المسحوب</div>
                  <div className="text-2xl font-bold">{balance?.totalWithdrawnAmount || "0.00"}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-bold">طلبات السحب</h3>
              <Button onClick={() => setShowWithdrawModal(true)} className="bg-green-600">
                <ArrowDownToLine className="h-4 w-4 ml-1" />
                طلب سحب
              </Button>
            </div>

            {withdrawals.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">لا توجد طلبات سحب</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w: any) => (
                  <Card key={w.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{w.amount} ر.س</p>
                        <p className="text-xs text-muted-foreground">
                          صافي: {w.netAmount} ر.س (عمولة {w.withdrawalCommissionPct}%)
                        </p>
                      </div>
                      <Badge variant={w.status === "approved" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>
                        {w.status === "approved" ? "مقبول" : w.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                      </Badge>
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
              <Button onClick={() => setShowPostModal(true)} className="bg-green-600">
                <Plus className="h-4 w-4 ml-1" />
                منشور جديد
              </Button>
            </div>
            {posts.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد منشورات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post: Post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="text-sm whitespace-pre-wrap flex-1">{post.content}</p>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("حذف؟")) deletePost.mutate(post.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      {post.mediaUrls?.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {post.mediaUrls.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-24 h-24 rounded object-cover" />
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
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

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <h2 className="text-lg font-bold">التقييمات</h2>
            {reviews.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد تقييمات بعد</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: any) => (
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

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "تعديل المهمة" : "مهمة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>السؤال *</Label>
              <Textarea value={taskForm.question} onChange={e => setTaskForm(f => ({ ...f, question: e.target.value }))} />
            </div>
            <div>
              <Label>السعر (ر.س) *</Label>
              <Input type="number" step="0.01" value={taskForm.price} onChange={e => setTaskForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <Label>الإجابات (حدد الصحيحة)</Label>
              <div className="space-y-2 mt-1">
                {taskForm.answers.map((answer, index) => (
                  <div key={answer.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={answer.isCorrect}
                      onChange={() => {
                        setTaskForm(f => ({
                          ...f,
                          answers: f.answers.map((a, i) => ({ ...a, isCorrect: i === index })),
                        }));
                      }}
                      className="accent-green-600"
                    />
                    <Input
                      placeholder={`إجابة ${index + 1}`}
                      value={answer.text}
                      onChange={e => {
                        setTaskForm(f => ({
                          ...f,
                          answers: f.answers.map((a, i) => i === index ? { ...a, text: e.target.value } : a),
                        }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>شرح الإجابة (اختياري)</Label>
              <Textarea value={taskForm.explanation} onChange={e => setTaskForm(f => ({ ...f, explanation: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>إلغاء</Button>
            <Button className="bg-green-600" onClick={handleSubmitTask}>
              {editingTask ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>منشور جديد</DialogTitle></DialogHeader>
          <Textarea placeholder="اكتب محتوى المنشور..." value={postContent} onChange={e => setPostContent(e.target.value)} className="min-h-[120px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostModal(false)}>إلغاء</Button>
            <Button className="bg-green-600" onClick={() => createPost.mutate(postContent)} disabled={!postContent.trim()}>نشر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>طلب سحب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">الرصيد المتاح: <strong className="text-green-600">{balance?.availableBalance || "0.00"} ر.س</strong></p>
            <div>
              <Label>المبلغ (ر.س)</Label>
              <Input type="number" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>إلغاء</Button>
            <Button className="bg-green-600" onClick={() => requestWithdrawal.mutate(parseFloat(withdrawAmount))} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}>
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
