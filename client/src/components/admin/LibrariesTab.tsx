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
import { Plus, Edit, Trash2, Store, MapPin, Link, Settings, Copy, Eye, Package, Users, CheckCircle2, XCircle, Wallet } from "lucide-react";

interface Library {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  username: string;
  referralCode: string;
  activityScore: number;
  totalProducts: number;
  totalSales: number;
  isActive: boolean;
  createdAt: string;
  commissionRatePct: number;
}

interface LibraryOrder {
  id: string;
  libraryId: string;
  status: string;
  quantity: number;
  subtotal: string;
  productTitle?: string;
  parentName?: string;
  libraryName?: string;
  createdAt: string;
}

interface LibraryWithdrawal {
  id: string;
  libraryId: string;
  libraryName?: string;
  amount: string;
  paymentMethod: string;
  status: string;
  requestedAt: string;
}

export default function LibrariesTab() {
  const { toast } = useToast();
  const token = localStorage.getItem("adminToken");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [libraryDetails, setLibraryDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    imageUrl: "",
    username: "",
    password: "",
    commissionRatePct: "10",
  });

  const { data: libraries, isLoading, error } = useQuery({
    queryKey: ["admin-libraries"],
    queryFn: async () => {
      const res = await fetch("/api/admin/libraries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.data || [];
    },
  });

  const { data: referralSettings } = useQuery({
    queryKey: ["admin-library-referral-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/library-referral-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.data;
    },
  });

  const { data: libraryOrders } = useQuery({
    queryKey: ["admin-library-orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/library-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch library orders");
      const data = await res.json();
      return (data.data || []) as LibraryOrder[];
    },
  });

  const { data: libraryWithdrawals } = useQuery({
    queryKey: ["admin-library-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/library-withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch library withdrawals");
      const data = await res.json();
      return (data.data || []) as LibraryWithdrawal[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/libraries", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم إضافة المكتبة بنجاح" });
      setShowAddModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل إضافة المكتبة", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/libraries/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث المكتبة" });
      setShowEditModal(false);
      setSelectedLibrary(null);
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل تحديث المكتبة", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/libraries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم حذف المكتبة" });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: () => {
      toast({ title: "فشل حذف المكتبة", variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/library-referral-settings", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث الإعدادات" });
      queryClient.invalidateQueries({ queryKey: ["admin-library-referral-settings"] });
    },
    onError: () => {
      toast({ title: "فشل تحديث الإعدادات", variant: "destructive" });
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/admin/library-orders/${orderId}/confirm`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to confirm order");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تم تأكيد الطلب وإرساله للمكتبة" });
      queryClient.invalidateQueries({ queryKey: ["admin-library-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل تأكيد الطلب", variant: "destructive" });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/admin/library-orders/${orderId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: "تم رفض الطلب من الأدمن" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to reject order");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تم رفض الطلب" });
      queryClient.invalidateQueries({ queryKey: ["admin-library-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل رفض الطلب", variant: "destructive" });
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const res = await fetch(`/api/admin/library-withdrawals/${withdrawalId}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to approve withdrawal");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تمت الموافقة على طلب السحب" });
      queryClient.invalidateQueries({ queryKey: ["admin-library-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل الموافقة على السحب", variant: "destructive" });
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const res = await fetch(`/api/admin/library-withdrawals/${withdrawalId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: "تم رفض طلب السحب" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to reject withdrawal");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تم رفض طلب السحب وإرجاع الرصيد" });
      queryClient.invalidateQueries({ queryKey: ["admin-library-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل رفض السحب", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", location: "", imageUrl: "", username: "", password: "", commissionRatePct: "10" });
  };

  const openEditModal = (lib: Library) => {
    setSelectedLibrary(lib);
    setFormData({
      name: lib.name,
      description: lib.description || "",
      location: lib.location || "",
      imageUrl: lib.imageUrl || "",
      username: lib.username,
      password: "",
      commissionRatePct: (lib.commissionRatePct ?? 10).toString(),
    });
    setShowEditModal(true);
  };

  const openDetailsModal = async (lib: Library) => {
    setSelectedLibrary(lib);
    try {
      const res = await fetch(`/api/admin/libraries/${lib.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryDetails(data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setShowDetailsModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  const filteredLibraries = (libraries || []).filter((lib: Library) =>
    lib.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lib.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loginUrl = `${window.location.origin}/library/login`;

  if (isLoading) {
    return <div className="flex justify-center p-8">جاري التحميل...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">فشل تحميل البيانات</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Input
            placeholder="بحث بالاسم أو اسم المستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
            data-testid="input-search-libraries"
          />
          <Badge variant="secondary">
            {filteredLibraries.length} مكتبة
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettingsModal(true)} data-testid="button-library-settings">
            <Settings className="h-4 w-4 ml-2" />
            إعدادات الإحالة
          </Button>
          <Button onClick={() => setShowAddModal(true)} data-testid="button-add-library">
            <Plus className="h-4 w-4 ml-2" />
            إضافة مكتبة
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLibraries.map((lib: Library) => (
          <Card key={lib.id} className={!lib.isActive ? "opacity-60" : ""} data-testid={`card-library-${lib.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {lib.imageUrl ? (
                    <img src={lib.imageUrl} alt={lib.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">{lib.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">@{lib.username}</p>
                  </div>
                </div>
                {!lib.isActive && <Badge variant="secondary">غير نشط</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {lib.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" /> {lib.location}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm mb-3">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" /> {lib.totalProducts} منتج
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> {lib.totalSales} مبيعات
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="outline">نقاط: {lib.activityScore}</Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">عمولة: {lib.commissionRatePct ?? 10}%</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openDetailsModal(lib)} data-testid={`button-view-library-${lib.id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEditModal(lib)} data-testid={`button-edit-library-${lib.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => {
                      if (confirm("هل تريد حذف هذه المكتبة؟")) {
                        deleteMutation.mutate(lib.id);
                      }
                    }}
                    data-testid={`button-delete-library-${lib.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>طلبات المكتبات</span>
            <Badge variant="secondary">
              {(libraryOrders || []).filter((o) => o.status === "pending_admin").length} بانتظار التأكيد
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {(libraryOrders || []).slice(0, 30).map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{order.productTitle || "منتج"} - {order.libraryName || "مكتبة"}</p>
                <p className="text-sm text-muted-foreground truncate">المشتري: {order.parentName || "-"} • الكمية: {order.quantity}</p>
                <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("ar")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={order.status === "pending_admin" ? "secondary" : "outline"}>{order.status}</Badge>
                {order.status === "pending_admin" && (
                  <>
                    <Button size="sm" onClick={() => confirmOrderMutation.mutate(order.id)}>
                      <CheckCircle2 className="h-4 w-4 ml-1" /> تأكيد
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectOrderMutation.mutate(order.id)}>
                      <XCircle className="h-4 w-4 ml-1" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!libraryOrders || libraryOrders.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد طلبات مكتبات حالياً</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> طلبات سحب الأموال</span>
            <Badge variant="secondary">
              {(libraryWithdrawals || []).filter((w) => w.status === "pending").length} بانتظار المراجعة
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {(libraryWithdrawals || []).slice(0, 30).map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{request.libraryName || "مكتبة"}</p>
                <p className="text-sm text-muted-foreground truncate">المبلغ: {request.amount} • الطريقة: {request.paymentMethod}</p>
                <p className="text-xs text-muted-foreground">{new Date(request.requestedAt).toLocaleString("ar")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={request.status === "pending" ? "secondary" : "outline"}>{request.status}</Badge>
                {request.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => approveWithdrawalMutation.mutate(request.id)}>
                      <CheckCircle2 className="h-4 w-4 ml-1" /> موافقة
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectWithdrawalMutation.mutate(request.id)}>
                      <XCircle className="h-4 w-4 ml-1" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!libraryWithdrawals || libraryWithdrawals.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد طلبات سحب حالياً</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مكتبة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المكتبة *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-library-name"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-library-description"
              />
            </div>
            <div>
              <Label>الموقع</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                data-testid="input-library-location"
              />
            </div>
            <div>
              <Label>رابط الصورة</Label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                data-testid="input-library-image"
              />
            </div>
            <div>
              <Label>اسم المستخدم *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                data-testid="input-library-username"
              />
            </div>
            <div>
              <Label>كلمة المرور *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                data-testid="input-library-password"
              />
            </div>
            <div>
              <Label>نسبة العمولة اليومية (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.commissionRatePct}
                onChange={(e) => setFormData({ ...formData, commissionRatePct: e.target.value })}
                data-testid="input-library-commission"
              />
              <p className="text-xs text-gray-500 mt-1">نسبة العمولة المستقطعة من المبيعات اليومية</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending}
              data-testid="button-submit-library"
            >
              {createMutation.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المكتبة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المكتبة</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>الموقع</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <Label>رابط الصورة</Label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>اسم المستخدم</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <Label>كلمة المرور الجديدة (اتركها فارغة للإبقاء)</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <Label>نسبة العمولة اليومية (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.commissionRatePct}
                onChange={(e) => setFormData({ ...formData, commissionRatePct: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">نسبة العمولة المستقطعة من المبيعات اليومية</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={selectedLibrary?.isActive}
                onCheckedChange={(checked) => {
                  if (selectedLibrary) {
                    updateMutation.mutate({ 
                      id: selectedLibrary.id, 
                      data: { isActive: checked } 
                    });
                  }
                }}
              />
              <Label>نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>إلغاء</Button>
            <Button 
              onClick={() => {
                if (selectedLibrary) {
                  const data: any = { ...formData };
                  if (!data.password) delete data.password;
                  updateMutation.mutate({ id: selectedLibrary.id, data });
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "جاري التحديث..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المكتبة: {selectedLibrary?.name}</DialogTitle>
          </DialogHeader>
          {libraryDetails && (
            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">المعلومات</TabsTrigger>
                <TabsTrigger value="products">المنتجات ({libraryDetails.products?.length || 0})</TabsTrigger>
                <TabsTrigger value="activity">النشاط</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">اسم المستخدم</Label>
                    <p className="font-medium">@{libraryDetails.username}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الموقع</Label>
                    <p className="font-medium">{libraryDetails.location || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">نقاط النشاط</Label>
                    <p className="font-medium">{libraryDetails.activityScore}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">نسبة العمولة</Label>
                    <p className="font-medium">{libraryDetails.commissionRatePct ?? 10}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">إجمالي المبيعات</Label>
                    <p className="font-medium">{libraryDetails.totalSales}</p>
                  </div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">كود الإحالة:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded">{libraryDetails.referralCode}</code>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(libraryDetails.referralCode)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">رابط تسجيل الدخول:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded text-xs">{loginUrl}</code>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(loginUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">{libraryDetails.stats?.totalProducts || 0}</p>
                      <p className="text-muted-foreground">إجمالي المنتجات</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">{libraryDetails.stats?.totalReferrals || 0}</p>
                      <p className="text-muted-foreground">الإحالات</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="products">
                {libraryDetails.products?.length > 0 ? (
                  <div className="space-y-2">
                    {libraryDetails.products.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {p.imageUrl && <img src={p.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />}
                          <div>
                            <p className="font-medium">{p.title}</p>
                            <p className="text-sm text-muted-foreground">{p.price} ج.م</p>
                          </div>
                        </div>
                        <Badge variant={p.isActive ? "default" : "secondary"}>
                          {p.stock} في المخزون
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد منتجات</p>
                )}
              </TabsContent>
              
              <TabsContent value="activity">
                {libraryDetails.activityLogs?.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {libraryDetails.activityLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-2 border-b">
                        <span className="text-sm">{log.action}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">+{log.points}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString("ar")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا يوجد نشاط</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعدادات إحالات المكتبات</DialogTitle>
          </DialogHeader>
          {referralSettings && (
            <div className="space-y-4">
              <div>
                <Label>نقاط لكل إحالة</Label>
                <Input
                  type="number"
                  defaultValue={referralSettings.pointsPerReferral}
                  onChange={(e) => updateSettingsMutation.mutate({ pointsPerReferral: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>نقاط لكل عملية بيع</Label>
                <Input
                  type="number"
                  defaultValue={referralSettings.pointsPerSale}
                  onChange={(e) => updateSettingsMutation.mutate({ pointsPerSale: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>نقاط لكل منتج مضاف</Label>
                <Input
                  type="number"
                  defaultValue={referralSettings.pointsPerProductAdd}
                  onChange={(e) => updateSettingsMutation.mutate({ pointsPerProductAdd: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={referralSettings.isActive}
                  onCheckedChange={(checked) => updateSettingsMutation.mutate({ isActive: checked })}
                />
                <Label>تفعيل نظام الإحالات</Label>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
