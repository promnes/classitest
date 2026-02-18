import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Megaphone,
  Eye,
  MousePointer,
  Users,
  Baby,
  Calendar,
  Link2,
  Image,
  Upload,
  BarChart3,
  ArrowUpDown,
  Globe,
  X,
  Copy,
  ExternalLink,
  TrendingUp,
  Clock,
} from "lucide-react";

interface Ad {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  targetAudience: string;
  priority: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  viewCount: number;
  clickCount: number;
  createdAt: string;
}

const AUDIENCE_OPTIONS = [
  { value: "all", label: "الكل", icon: Globe, color: "bg-purple-500", description: "يظهر لجميع المستخدمين" },
  { value: "parents", label: "الآباء فقط", icon: Users, color: "bg-blue-500", description: "يظهر للآباء فقط" },
  { value: "children", label: "الأطفال فقط", icon: Baby, color: "bg-pink-500", description: "يظهر للأطفال فقط" },
];

const PRIORITY_PRESETS = [
  { value: 0, label: "عادي", color: "text-gray-500" },
  { value: 5, label: "مرتفع", color: "text-amber-500" },
  { value: 10, label: "عاجل", color: "text-red-500" },
];

export function AdsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [previewImage, setPreviewImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sortBy, setSortBy] = useState<"priority" | "views" | "clicks" | "date">("date");
  const [filterAudience, setFilterAudience] = useState<string>("all-filter");
  const [form, setForm] = useState({
    title: "",
    content: "",
    imageUrl: "",
    linkUrl: "",
    targetAudience: "all",
    priority: 0,
    isActive: true,
    startDate: "",
    endDate: "",
  });

  const { data: ads, isLoading } = useQuery<Ad[]>({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...data,
          imageUrl: data.imageUrl || null,
          linkUrl: data.linkUrl || null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل إنشاء الإعلان");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      resetForm();
      toast({ title: "تم إنشاء الإعلان بنجاح ✅" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في إنشاء الإعلان", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...data,
          imageUrl: data.imageUrl || null,
          linkUrl: data.linkUrl || null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل تحديث الإعلان");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      resetForm();
      toast({ title: "تم تحديث الإعلان بنجاح ✅" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في تحديث الإعلان", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل حذف الإعلان");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast({ title: "تم حذف الإعلان بنجاح 🗑️" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في حذف الإعلان", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/ads/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل تبديل الحالة");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast({ title: "تم تبديل حالة الإعلان ✅" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في تبديل الحالة", description: err.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (ad: Ad) => {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: ad.title + " (نسخة)",
          content: ad.content,
          imageUrl: ad.imageUrl,
          linkUrl: ad.linkUrl,
          targetAudience: ad.targetAudience,
          priority: ad.priority,
          isActive: false,
          startDate: ad.startDate,
          endDate: ad.endDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل نسخ الإعلان");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast({ title: "تم نسخ الإعلان بنجاح 📋" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في نسخ الإعلان", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingAd(null);
    setPreviewImage(false);
    setUploadingImage(false);
    setForm({
      title: "",
      content: "",
      imageUrl: "",
      linkUrl: "",
      targetAudience: "all",
      priority: 0,
      isActive: true,
      startDate: "",
      endDate: "",
    });
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "فشل رفع الصورة");
      const data = json.data || json;
      setForm((prev) => ({ ...prev, imageUrl: data.fullUrl || data.url }));
      setPreviewImage(true);
      toast({ title: "تم رفع الصورة بنجاح ✅" });
    } catch (err: any) {
      toast({ title: "فشل رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      content: ad.content,
      imageUrl: ad.imageUrl || "",
      linkUrl: ad.linkUrl || "",
      targetAudience: ad.targetAudience,
      priority: ad.priority,
      isActive: ad.isActive,
      startDate: ad.startDate ? ad.startDate.split("T")[0] : "",
      endDate: ad.endDate ? ad.endDate.split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editingAd) {
      updateMutation.mutate({ id: editingAd.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // Stats
  const adsList = ads || [];
  const totalViews = adsList.reduce((s, a) => s + a.viewCount, 0);
  const totalClicks = adsList.reduce((s, a) => s + a.clickCount, 0);
  const activeCount = adsList.filter((a) => a.isActive).length;
  const avgCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";

  // Sorting & filtering
  let filteredAds = filterAudience === "all-filter" ? adsList : adsList.filter((a) => a.targetAudience === filterAudience);
  filteredAds = [...filteredAds].sort((a, b) => {
    switch (sortBy) {
      case "priority": return b.priority - a.priority;
      case "views": return b.viewCount - a.viewCount;
      case "clicks": return b.clickCount - a.clickCount;
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const getAudienceBadge = (audience: string) => {
    const opt = AUDIENCE_OPTIONS.find((o) => o.value === audience) || AUDIENCE_OPTIONS[0];
    const Icon = opt.icon;
    return (
      <Badge className={`${opt.color} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {opt.label}
      </Badge>
    );
  };

  const getStatusInfo = (ad: Ad) => {
    const now = new Date();
    if (!ad.isActive) return { label: "متوقف", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
    if (ad.startDate && new Date(ad.startDate) > now) return { label: "مجدول", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    if (ad.endDate && new Date(ad.endDate) < now) return { label: "منتهي", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    return { label: "نشط", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-amber-500" />
            إدارة الإعلانات
          </h2>
          <p className="text-sm text-muted-foreground mt-1">إدارة الإعلانات المعروضة للمستخدمين في التطبيق</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" data-testid="button-add-ad">
          <Plus className="h-4 w-4" />
          إعلان جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adsList.length}</p>
                <p className="text-xs text-muted-foreground">إجمالي الإعلانات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">إعلانات نشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">إجمالي المشاهدات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <MousePointer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgCTR}%</p>
                <p className="text-xs text-muted-foreground">معدل النقر CTR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Sort & Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">ترتيب:</span>
        {([
          { key: "date", label: "الأحدث", icon: Clock },
          { key: "priority", label: "الأولوية", icon: ArrowUpDown },
          { key: "views", label: "المشاهدات", icon: Eye },
          { key: "clicks", label: "النقرات", icon: MousePointer },
        ] as const).map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={sortBy === s.key ? "default" : "outline"}
            className="gap-1 h-8 text-xs"
            onClick={() => setSortBy(s.key)}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </Button>
        ))}
        <span className="text-sm text-muted-foreground mr-4">| فلتر:</span>
        <Button
          size="sm"
          variant={filterAudience === "all-filter" ? "default" : "outline"}
          className="h-8 text-xs"
          onClick={() => setFilterAudience("all-filter")}
        >
          الكل
        </Button>
        {AUDIENCE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={filterAudience === opt.value ? "default" : "outline"}
            className="h-8 text-xs gap-1"
            onClick={() => setFilterAudience(opt.value)}
          >
            <opt.icon className="h-3 w-3" />
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Ads List */}
      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filteredAds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">لا توجد إعلانات بعد</p>
            <p className="text-sm text-muted-foreground mb-4">أضف إعلانك الأول ليظهر للمستخدمين</p>
            <Button onClick={() => setShowModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة أول إعلان
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAds.map((ad) => {
            const status = getStatusInfo(ad);
            const ctr = ad.viewCount > 0 ? ((ad.clickCount / ad.viewCount) * 100).toFixed(1) : "0";
            return (
              <Card key={ad.id} className={`transition-all ${!ad.isActive ? "opacity-60 hover:opacity-80" : "hover:shadow-md"}`}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex gap-4">
                    {/* Image thumbnail */}
                    {ad.imageUrl && (
                      <div className="shrink-0">
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          className="w-24 h-16 sm:w-32 sm:h-20 object-cover rounded-lg ring-1 ring-gray-200 dark:ring-gray-700"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = "none";
                            if (img.parentElement) {
                              img.parentElement.innerHTML = '<div class="w-24 h-16 sm:w-32 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><span class="text-gray-400 text-xs">صورة غير متاحة</span></div>';
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="font-bold text-base truncate">{ad.title}</h3>
                            {getAudienceBadge(ad.targetAudience)}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                            {ad.priority > 0 && (
                              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                ⬆ أولوية {ad.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ad.content}</p>

                          {/* Stats row */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              {ad.viewCount.toLocaleString()} مشاهدة
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointer className="h-3.5 w-3.5" />
                              {ad.clickCount.toLocaleString()} نقرة
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3.5 w-3.5" />
                              CTR: {ctr}%
                            </span>
                            {ad.linkUrl && (
                              <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="h-3 w-3" />
                                رابط
                              </a>
                            )}
                            {(ad.startDate || ad.endDate) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {ad.startDate ? new Date(ad.startDate).toLocaleDateString("ar") : "∞"}
                                {" → "}
                                {ad.endDate ? new Date(ad.endDate).toLocaleDateString("ar") : "∞"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={ad.isActive}
                            onCheckedChange={() => toggleMutation.mutate(ad.id)}
                            data-testid={`switch-ad-${ad.id}`}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(ad)} title="تعديل" data-testid={`button-edit-ad-${ad.id}`}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateMutation.mutate(ad)} title="نسخ" data-testid={`button-duplicate-ad-${ad.id}`}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من حذف هذا الإعلان؟")) {
                                deleteMutation.mutate(ad.id);
                              }
                            }}
                            title="حذف"
                            data-testid={`button-delete-ad-${ad.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Create/Edit Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-amber-500" />
                  {editingAd ? "تعديل الإعلان" : "إنشاء إعلان جديد"}
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={resetForm} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Title */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Megaphone className="h-3.5 w-3.5 text-amber-500" />
                  عنوان الإعلان <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-background"
                  placeholder="مثال: عرض خاص — خصم 50% لفترة محدودة!"
                  data-testid="input-ad-title"
                />
              </div>

              {/* Content */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  📝 محتوى الإعلان <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none bg-background"
                  rows={3}
                  placeholder="اكتب وصف الإعلان هنا..."
                  data-testid="input-ad-content"
                />
                <p className="text-xs text-muted-foreground mt-1">{form.content.length}/500 حرف</p>
              </div>

              {/* Image URL with Upload & Preview */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Image className="h-3.5 w-3.5 text-blue-500" />
                  صورة الإعلان
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-background"
                    placeholder="https://example.com/banner.jpg"
                    dir="ltr"
                    data-testid="input-ad-image"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? "جاري الرفع..." : "رفع صورة"}
                  </Button>
                  {form.imageUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setPreviewImage(!previewImage)}
                    >
                      {previewImage ? "إخفاء" : "معاينة"}
                    </Button>
                  )}
                </div>
                {previewImage && form.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
                    <img src={form.imageUrl} alt="معاينة" className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">يُفضل صورة أفقية بأبعاد 1200×400 بكسل — يمكنك رفع صورة أو لصق رابط مباشر</p>
              </div>

              {/* Link URL */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Link2 className="h-3.5 w-3.5 text-green-500" />
                  رابط عند النقر
                </label>
                <input
                  type="url"
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all bg-background"
                  placeholder="https://example.com/offer"
                  dir="ltr"
                  data-testid="input-ad-link"
                />
                <p className="text-xs text-muted-foreground mt-1">يُفتح في نافذة جديدة عند نقر المستخدم</p>
              </div>

              {/* Target Audience — Visual Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                  الجمهور المستهدف
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {AUDIENCE_OPTIONS.map((opt) => {
                    const isSelected = form.targetAudience === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, targetAudience: opt.value })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                        data-testid={`audience-${opt.value}`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${isSelected ? "text-amber-600" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${isSelected ? "text-amber-700 dark:text-amber-400" : ""}`}>{opt.label}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority — Visual Selector */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
                  الأولوية
                </label>
                <div className="flex gap-2 items-center flex-wrap">
                  {PRIORITY_PRESETS.map((p) => (
                    <Button
                      key={p.value}
                      type="button"
                      size="sm"
                      variant={form.priority === p.value ? "default" : "outline"}
                      className="gap-1"
                      onClick={() => setForm({ ...form, priority: p.value })}
                    >
                      {p.label}
                    </Button>
                  ))}
                  <span className="text-muted-foreground mx-2">أو</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border rounded-lg text-sm text-center bg-background"
                    data-testid="input-ad-priority"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">الأعلى أولوية يظهر أولاً. القيمة من 0 إلى 100</p>
              </div>

              {/* Schedule — Date Range */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  جدولة العرض
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">تاريخ البدء</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background"
                      data-testid="input-ad-start-date"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm bg-background"
                      data-testid="input-ad-end-date"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">اتركها فارغة ليظهر الإعلان بدون قيود زمنية</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${form.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                    {form.isActive ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{form.isActive ? "الإعلان نشط" : "الإعلان متوقف"}</p>
                    <p className="text-xs text-muted-foreground">{form.isActive ? "سيظهر للمستخدمين فوراً" : "لن يظهر حتى التفعيل"}</p>
                  </div>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  data-testid="switch-ad-active"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  data-testid="button-save-ad"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "جاري الحفظ..." : editingAd ? "💾 تحديث الإعلان" : "🚀 نشر الإعلان"}
                </Button>
                <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-cancel-ad">
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
