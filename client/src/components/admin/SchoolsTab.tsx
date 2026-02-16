import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Plus, Edit, Trash2, School, Eye, Users, CheckCircle2, XCircle,
  GraduationCap, Settings, Copy, Wallet, Star
} from "lucide-react";

interface SchoolItem {
  id: string;
  name: string;
  bio: string | null;
  address: string | null;
  imageUrl: string | null;
  username: string;
  referralCode: string;
  activityScore: number;
  commissionRatePct: number;
  withdrawalCommissionPct: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export default function SchoolsTab() {
  const { toast } = useToast();
  const token = localStorage.getItem("adminToken");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolItem | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "", bio: "", address: "", imageUrl: "", username: "", password: "",
    phone: "", email: "", website: "",
    commissionRatePct: "10", withdrawalCommissionPct: "5",
  });

  // ===== Queries =====

  const { data: schools = [], isLoading } = useQuery<SchoolItem[]>({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const res = await fetch("/api/admin/schools", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch");
      return (await res.json()).data || [];
    },
  });

  const { data: referralSettings } = useQuery({
    queryKey: ["admin-school-referral-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/school-referral-settings", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
  });

  const { data: teacherWithdrawals = [] } = useQuery({
    queryKey: ["admin-teacher-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/teacher-withdrawals", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data || [];
    },
  });

  // ===== Mutations =====

  const createSchool = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
      setShowAddModal(false);
      resetForm();
      toast({ title: "تم إنشاء المدرسة بنجاح" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateSchool = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
      setShowEditModal(false);
      setSelectedSchool(null);
      toast({ title: "تم تحديث المدرسة" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteSchool = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
      toast({ title: "تم حذف المدرسة" });
    },
  });

  const updateReferralSettings = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/school-referral-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-school-referral-settings"] });
      setShowSettingsModal(false);
      toast({ title: "تم تحديث الإعدادات" });
    },
  });

  const approveWithdrawal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/teacher-withdrawals/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teacher-withdrawals"] });
      toast({ title: "تم قبول طلب السحب" });
    },
  });

  const rejectWithdrawal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/teacher-withdrawals/${id}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teacher-withdrawals"] });
      toast({ title: "تم رفض طلب السحب" });
    },
  });

  function resetForm() {
    setFormData({
      name: "", bio: "", address: "", imageUrl: "", username: "", password: "",
      phone: "", email: "", website: "",
      commissionRatePct: "10", withdrawalCommissionPct: "5",
    });
  }

  function openEdit(school: SchoolItem) {
    setSelectedSchool(school);
    setFormData({
      name: school.name,
      bio: school.bio || "",
      address: school.address || "",
      imageUrl: school.imageUrl || "",
      username: school.username,
      password: "",
      phone: "", email: "", website: "",
      commissionRatePct: String(school.commissionRatePct),
      withdrawalCommissionPct: String(school.withdrawalCommissionPct),
    });
    setShowEditModal(true);
  }

  async function openDetails(id: string) {
    try {
      const res = await fetch(`/api/admin/schools/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()).data;
      setSchoolDetails(data);
      setShowDetailsModal(true);
    } catch {
      toast({ title: "فشل تحميل التفاصيل", variant: "destructive" });
    }
  }

  const filtered = schools.filter((s: SchoolItem) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingWithdrawals = teacherWithdrawals.filter((w: any) => w.status === "pending");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="schools" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schools">المدارس ({schools.length})</TabsTrigger>
          <TabsTrigger value="withdrawals">
            سحوبات المعلمين {pendingWithdrawals.length > 0 && `(${pendingWithdrawals.length})`}
          </TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        {/* Schools List */}
        <TabsContent value="schools" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input
              placeholder="بحث بالاسم أو اسم المستخدم..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-blue-600">
              <Plus className="h-4 w-4 ml-1" />
              إضافة مدرسة
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جار التحميل...</div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد مدارس</CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((school: SchoolItem) => (
                <Card key={school.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {school.imageUrl ? (
                          <img src={school.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <School className="h-6 w-6 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold">{school.name}</h3>
                            {school.isVerified && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                          </div>
                          <p className="text-xs text-muted-foreground">@{school.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant={school.isActive ? "default" : "destructive"}>
                          {school.isActive ? "نشط" : "معطل"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Copy className="h-3 w-3" />
                        {school.referralCode}
                      </span>
                      <span>عمولة: {school.commissionRatePct}%</span>
                      <span>نشاط: {school.activityScore}</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDetails(school.id)}>
                        <Eye className="h-3 w-3 ml-1" />
                        تفاصيل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(school)}>
                        <Edit className="h-3 w-3 ml-1" />
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { if (confirm("هل تريد حذف هذه المدرسة؟")) deleteSchool.mutate(school.id); }}
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

        {/* Teacher Withdrawals */}
        <TabsContent value="withdrawals" className="space-y-4">
          <h2 className="text-lg font-bold">طلبات سحب المعلمين</h2>
          {teacherWithdrawals.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد طلبات سحب</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {teacherWithdrawals.map((w: any) => (
                <Card key={w.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm">{w.teacherName || "معلم"}</h3>
                        <p className="text-xs text-muted-foreground">المدرسة: {w.schoolName || "—"}</p>
                        <p className="text-sm mt-1">
                          المبلغ: <strong>{w.amount} ر.س</strong> — صافي: <strong className="text-green-600">{w.netAmount} ر.س</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          عمولة السحب: {w.withdrawalCommissionPct}% — الرصيد المتاح: {w.availableBalance || "—"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={w.status === "approved" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>
                          {w.status === "approved" ? "مقبول" : w.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                        </Badge>
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600" onClick={() => approveWithdrawal.mutate(w.id)}>
                              <CheckCircle2 className="h-3 w-3 ml-1" />
                              قبول
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => rejectWithdrawal.mutate(w.id)}>
                              <XCircle className="h-3 w-3 ml-1" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات إحالة المدارس
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {referralSettings ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>مكافأة الإحالة للمدرسة</span>
                    <strong>{referralSettings.schoolReferralReward} ر.س</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>مكافأة الإحالة لولي الأمر</span>
                    <strong>{referralSettings.parentReferralReward} ر.س</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>الحد الأدنى للسحب</span>
                    <strong>{referralSettings.minWithdrawalAmount} ر.س</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>فترة الاحتفاظ بالأموال</span>
                    <strong>{referralSettings.holdDays} يوم</strong>
                  </div>
                  <Button onClick={() => setShowSettingsModal(true)} className="mt-4">
                    <Edit className="h-4 w-4 ml-1" />
                    تعديل الإعدادات
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">لم يتم تعيين إعدادات بعد</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add School Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة مدرسة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم المدرسة *</Label><Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>اسم المستخدم *</Label><Input value={formData.username} onChange={e => setFormData(f => ({ ...f, username: e.target.value }))} /></div>
            <div><Label>كلمة المرور *</Label><Input type="password" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} /></div>
            <div><Label>الوصف</Label><Textarea value={formData.bio} onChange={e => setFormData(f => ({ ...f, bio: e.target.value }))} /></div>
            <div><Label>العنوان</Label><Input value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>الهاتف</Label><Input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>البريد</Label><Input value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>الموقع</Label><Input value={formData.website} onChange={e => setFormData(f => ({ ...f, website: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>عمولة المبيعات %</Label><Input type="number" value={formData.commissionRatePct} onChange={e => setFormData(f => ({ ...f, commissionRatePct: e.target.value }))} /></div>
              <div><Label>عمولة السحب %</Label><Input type="number" value={formData.withdrawalCommissionPct} onChange={e => setFormData(f => ({ ...f, withdrawalCommissionPct: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            <Button className="bg-blue-600" onClick={() => createSchool.mutate(formData)}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit School Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل المدرسة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم المدرسة</Label><Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>اسم المستخدم</Label><Input value={formData.username} onChange={e => setFormData(f => ({ ...f, username: e.target.value }))} /></div>
            <div><Label>كلمة المرور الجديدة (اختياري)</Label><Input type="password" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} /></div>
            <div><Label>الوصف</Label><Textarea value={formData.bio} onChange={e => setFormData(f => ({ ...f, bio: e.target.value }))} /></div>
            <div><Label>العنوان</Label><Input value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>عمولة المبيعات %</Label><Input type="number" value={formData.commissionRatePct} onChange={e => setFormData(f => ({ ...f, commissionRatePct: e.target.value }))} /></div>
              <div><Label>عمولة السحب %</Label><Input type="number" value={formData.withdrawalCommissionPct} onChange={e => setFormData(f => ({ ...f, withdrawalCommissionPct: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Label>موثقة</Label>
              <Switch
                checked={formData.imageUrl === "verified"}
                onCheckedChange={checked => setFormData(f => ({ ...f, imageUrl: checked ? "verified" : "" }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>إلغاء</Button>
            <Button className="bg-blue-600" onClick={() => {
              if (!selectedSchool) return;
              const payload: any = { ...formData };
              if (formData.imageUrl === "verified") {
                payload.isVerified = true;
                delete payload.imageUrl;
              } else {
                delete payload.imageUrl;
              }
              if (!payload.password) delete payload.password;
              updateSchool.mutate({ id: selectedSchool.id, ...payload });
            }}>تحديث</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل المدرسة</DialogTitle></DialogHeader>
          {schoolDetails && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {schoolDetails.imageUrl ? (
                  <img src={schoolDetails.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                    <School className="h-8 w-8 text-blue-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{schoolDetails.name}</h2>
                  <p className="text-sm text-muted-foreground">@{schoolDetails.username}</p>
                  <div className="flex gap-2 mt-1">
                    {schoolDetails.isVerified && <Badge className="bg-blue-600">موثقة</Badge>}
                    <Badge variant={schoolDetails.isActive ? "default" : "destructive"}>
                      {schoolDetails.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="text-muted-foreground">المعلمين</div>
                  <div className="text-xl font-bold text-blue-600">{schoolDetails.teachers?.length || 0}</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="text-muted-foreground">الطلاب</div>
                  <div className="text-xl font-bold text-green-600">{schoolDetails.students?.length || 0}</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <div className="text-muted-foreground">المنشورات</div>
                  <div className="text-xl font-bold text-purple-600">{schoolDetails.posts?.length || 0}</div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <div className="text-muted-foreground">التقييمات</div>
                  <div className="text-xl font-bold text-yellow-600">{schoolDetails.reviews?.length || 0}</div>
                </div>
              </div>

              {schoolDetails.teachers?.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2">المعلمين</h3>
                  <div className="space-y-2">
                    {schoolDetails.teachers.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{t.name}</span>
                          <span className="text-xs text-muted-foreground">{t.subject || "—"}</span>
                        </div>
                        <Badge variant={t.isActive ? "default" : "secondary"} className="text-xs">
                          {t.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {schoolDetails.bio && (
                <div>
                  <h3 className="font-bold mb-1">الوصف</h3>
                  <p className="text-sm text-muted-foreground">{schoolDetails.bio}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                كود الإحالة: <strong>{schoolDetails.referralCode}</strong> — عمولة: {schoolDetails.commissionRatePct}% — عمولة سحب: {schoolDetails.withdrawalCommissionPct}%
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Referral Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل إعدادات الإحالة</DialogTitle></DialogHeader>
          {referralSettings && (
            <ReferralSettingsForm
              initial={referralSettings}
              onSave={(data: any) => updateReferralSettings.mutate(data)}
              onCancel={() => setShowSettingsModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReferralSettingsForm({ initial, onSave, onCancel }: { initial: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    schoolReferralReward: initial.schoolReferralReward || "0",
    parentReferralReward: initial.parentReferralReward || "0",
    minWithdrawalAmount: initial.minWithdrawalAmount || "0",
    holdDays: initial.holdDays || 7,
  });

  return (
    <div className="space-y-3">
      <div><Label>مكافأة إحالة المدرسة</Label><Input type="number" value={form.schoolReferralReward} onChange={e => setForm(f => ({ ...f, schoolReferralReward: e.target.value }))} /></div>
      <div><Label>مكافأة إحالة ولي الأمر</Label><Input type="number" value={form.parentReferralReward} onChange={e => setForm(f => ({ ...f, parentReferralReward: e.target.value }))} /></div>
      <div><Label>الحد الأدنى للسحب</Label><Input type="number" value={form.minWithdrawalAmount} onChange={e => setForm(f => ({ ...f, minWithdrawalAmount: e.target.value }))} /></div>
      <div><Label>فترة الاحتفاظ (أيام)</Label><Input type="number" value={form.holdDays} onChange={e => setForm(f => ({ ...f, holdDays: parseInt(e.target.value) || 7 }))} /></div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
        <Button className="bg-blue-600" onClick={() => onSave(form)}>حفظ</Button>
      </DialogFooter>
    </div>
  );
}
