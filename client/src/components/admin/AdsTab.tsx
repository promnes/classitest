import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Megaphone, Eye, MousePointer, Users, Baby } from "lucide-react";

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

export function AdsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
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
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/ads/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
    },
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingAd(null);
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
    if (editingAd) {
      updateMutation.mutate({ id: editingAd.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case "parents":
        return <Badge className="bg-blue-500"><Users className="h-3 w-3 ml-1" />الآباء</Badge>;
      case "children":
        return <Badge className="bg-pink-500"><Baby className="h-3 w-3 ml-1" />الأطفال</Badge>;
      default:
        return <Badge className="bg-purple-500">الكل</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          إدارة الإعلانات
        </h2>
        <Button onClick={() => setShowModal(true)} data-testid="button-add-ad">
          <Plus className="h-4 w-4 ml-2" />
          إضافة إعلان
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : !ads?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد إعلانات بعد</p>
            <Button className="mt-4" onClick={() => setShowModal(true)}>
              إضافة أول إعلان
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ads.map((ad) => (
            <Card key={ad.id} className={!ad.isActive ? "opacity-60" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{ad.title}</h3>
                      {getAudienceBadge(ad.targetAudience)}
                      {!ad.isActive && <Badge variant="secondary">متوقف</Badge>}
                    </div>
                    <p className="text-muted-foreground mb-3">{ad.content}</p>
                    {ad.imageUrl && (
                      <img src={ad.imageUrl} alt={ad.title} className="w-32 h-20 object-cover rounded mb-3" />
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {ad.viewCount} مشاهدة
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointer className="h-4 w-4" />
                        {ad.clickCount} نقرة
                      </span>
                      <span>الأولوية: {ad.priority}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ad.isActive}
                      onCheckedChange={() => toggleMutation.mutate(ad.id)}
                      data-testid={`switch-ad-${ad.id}`}
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(ad)} data-testid={`button-edit-ad-${ad.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا الإعلان؟")) {
                          deleteMutation.mutate(ad.id);
                        }
                      }}
                      data-testid={`button-delete-ad-${ad.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingAd ? "تعديل الإعلان" : "إضافة إعلان جديد"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">العنوان *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="عنوان الإعلان"
                  data-testid="input-ad-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">المحتوى *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  placeholder="محتوى الإعلان"
                  data-testid="input-ad-content"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">رابط الصورة</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-ad-image"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">رابط الإعلان</label>
                <input
                  type="url"
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="https://example.com"
                  data-testid="input-ad-link"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الجمهور المستهدف</label>
                <select
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  data-testid="select-ad-audience"
                >
                  <option value="all">الكل</option>
                  <option value="parents">الآباء فقط</option>
                  <option value="children">الأطفال فقط</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الأولوية</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-lg"
                  data-testid="input-ad-priority"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    data-testid="input-ad-start-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    data-testid="input-ad-end-date"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  data-testid="switch-ad-active"
                />
                <label>نشط</label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} className="flex-1" data-testid="button-save-ad">
                  {editingAd ? "تحديث" : "إضافة"}
                </Button>
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel-ad">
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
