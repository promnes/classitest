import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { getDateLocale } from "@/i18n/config";
import { queryClient } from "@/lib/queryClient";
import { 
  Store, Package, Users, TrendingUp, Plus, Edit, Trash2, 
  Copy, LogOut, Link, Share2, Activity, Truck, ShieldCheck, Wallet
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  discountPercent: number;
  discountMinQuantity: number;
  stock: number;
  isActive: boolean;
}

interface LibraryOrder {
  id: string;
  status: string;
  quantity: number;
  subtotal: string;
  shippingAddress: string | null;
  holdDays: number;
  protectionExpiresAt: string | null;
  deliveryCode: string | null;
  productTitle?: string;
  buyerName?: string;
  buyerEmail?: string;
  createdAt: string;
}

interface LibraryBalance {
  availableBalance: string;
  pendingBalance: string;
  totalSalesAmount: string;
  totalCommissionAmount: string;
}

interface LibraryWithdrawal {
  id: string;
  amount: string;
  paymentMethod: string;
  status: string;
  requestedAt: string;
}

interface LibraryInvoice {
  id: string;
  invoiceDate: string;
  totalOrders: number;
  grossSalesAmount: string;
  totalCommissionAmount: string;
  netAmount: string;
  status: string;
}

export default function LibraryDashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem("libraryToken");
  const libraryData = JSON.parse(localStorage.getItem("libraryData") || "{}");

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [deliveryCodes, setDeliveryCodes] = useState<Record<string, string>>({});
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [withdrawDetails, setWithdrawDetails] = useState("");
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    price: "",
    discountPercent: 0,
    discountMinQuantity: 1,
    stock: 0,
  });

  useEffect(() => {
    if (!token) {
      setLocation("/library/login");
    }
  }, [token, setLocation]);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["library-profile"],
    queryFn: async () => {
      const res = await fetch("/api/library/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data;
    },
    enabled: !!token,
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["library-products"],
    queryFn: async () => {
      const res = await fetch("/api/library/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!token,
  });

  const { data: referrals } = useQuery({
    queryKey: ["library-referrals"],
    queryFn: async () => {
      const res = await fetch("/api/library/referrals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!token,
  });

  const { data: activityLogs } = useQuery({
    queryKey: ["library-activity"],
    queryFn: async () => {
      const res = await fetch("/api/library/activity", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!token,
  });

  const { data: orders } = useQuery({
    queryKey: ["library-orders"],
    queryFn: async () => {
      const res = await fetch("/api/library/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return (data.data || []) as LibraryOrder[];
    },
    enabled: !!token,
  });

  const { data: balanceData } = useQuery({
    queryKey: ["library-balance"],
    queryFn: async () => {
      const res = await fetch("/api/library/balance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.data as LibraryBalance;
    },
    enabled: !!token,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["library-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/library/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return (data.data || []) as LibraryWithdrawal[];
    },
    enabled: !!token,
  });

  const { data: invoices } = useQuery({
    queryKey: ["library-daily-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/library/invoices/daily", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return (data.data || []) as LibraryInvoice[];
    },
    enabled: !!token,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const res = await fetch("/api/library/products", {
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
      toast({ title: "تم إضافة المنتج بنجاح" });
      setShowProductModal(false);
      resetProductForm();
      queryClient.invalidateQueries({ queryKey: ["library-products"] });
      queryClient.invalidateQueries({ queryKey: ["library-profile"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل إضافة المنتج", variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/library/products/${id}`, {
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
      toast({ title: "تم تحديث المنتج" });
      setShowProductModal(false);
      setEditingProduct(null);
      resetProductForm();
      queryClient.invalidateQueries({ queryKey: ["library-products"] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "فشل تحديث المنتج", variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/library/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم حذف المنتج" });
      queryClient.invalidateQueries({ queryKey: ["library-products"] });
      queryClient.invalidateQueries({ queryKey: ["library-profile"] });
    },
    onError: () => {
      toast({ title: "فشل حذف المنتج", variant: "destructive" });
    },
  });

  const shipOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/library/orders/${orderId}/ship`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to ship order");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تم تحديث الطلب إلى: تم الشحن" });
      queryClient.invalidateQueries({ queryKey: ["library-orders"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل تحديث حالة الشحن", variant: "destructive" });
    },
  });

  const verifyDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, code }: { orderId: string; code: string }) => {
      const res = await fetch(`/api/library/orders/${orderId}/verify-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to verify delivery");
      return body;
    },
    onSuccess: (_, variables) => {
      toast({ title: "تم تأكيد التسليم بنجاح" });
      setDeliveryCodes((prev) => ({ ...prev, [variables.orderId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["library-orders"] });
      queryClient.invalidateQueries({ queryKey: ["library-balance"] });
      queryClient.invalidateQueries({ queryKey: ["library-daily-invoices"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل التحقق من كود التسليم", variant: "destructive" });
    },
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        amount: withdrawAmount,
        paymentMethod: withdrawMethod,
        paymentDetails: { details: withdrawDetails },
      };
      const res = await fetch("/api/library/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to request withdrawal");
      return body;
    },
    onSuccess: () => {
      toast({ title: "تم إرسال طلب السحب بنجاح" });
      setWithdrawAmount("");
      setWithdrawMethod("");
      setWithdrawDetails("");
      queryClient.invalidateQueries({ queryKey: ["library-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["library-balance"] });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "فشل إنشاء طلب السحب", variant: "destructive" });
    },
  });

  const resetProductForm = () => {
    setProductForm({
      title: "",
      description: "",
      imageUrl: "",
      price: "",
      discountPercent: 0,
      discountMinQuantity: 1,
      stock: 0,
    });
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      price: product.price,
      discountPercent: product.discountPercent,
      discountMinQuantity: product.discountMinQuantity,
      stock: product.stock,
    });
    setShowProductModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("libraryToken");
    localStorage.removeItem("libraryData");
    setLocation("/library/login");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  const uploadProductImage = async (file: File) => {
    if (!token) return;

    setIsUploadingImage(true);
    try {
      const presignRes = await fetch("/api/library/uploads/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentType: file.type || "image/jpeg",
          size: file.size,
          purpose: "library_product_image",
          originalName: file.name,
        }),
      });

      const presignJson = await presignRes.json();
      if (!presignRes.ok || !presignJson?.data?.uploadURL || !presignJson?.data?.objectPath) {
        throw new Error(presignJson?.message || "فشل تجهيز رفع الصورة");
      }

      let putRes: Response | null = null;
      let directUploadError: unknown = null;

      try {
        putRes = await fetch(presignJson.data.uploadURL, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "image/jpeg",
          },
          body: file,
        });
      } catch (error) {
        directUploadError = error;
      }

      if (!putRes?.ok) {
        const isAbsoluteUploadURL = /^https?:\/\//i.test(String(presignJson.data.uploadURL || ""));

        if (isAbsoluteUploadURL) {
          const proxyRes = await fetch("/api/library/uploads/proxy", {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "image/jpeg",
              Authorization: `Bearer ${token}`,
              "x-upload-url": presignJson.data.uploadURL,
            },
            body: file,
          });

          if (!proxyRes.ok) {
            const proxyJson = await proxyRes.json().catch(() => ({}));
            throw new Error(proxyJson?.message || "فشل رفع الصورة إلى التخزين");
          }
        } else {
          if (putRes) {
            throw new Error("فشل رفع الصورة إلى التخزين");
          }
          throw new Error((directUploadError as any)?.message || "فشل رفع الصورة إلى التخزين");
        }
      }

      const finalizeRes = await fetch("/api/library/uploads/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          objectPath: presignJson.data.objectPath,
          mimeType: file.type || "image/jpeg",
          size: file.size,
          originalName: file.name,
          purpose: "library_product_image",
          dedupeKey: `library-product-${file.name}-${file.size}-${file.lastModified}`,
        }),
      });

      const finalizeJson = await finalizeRes.json();
      if (!finalizeRes.ok || !finalizeJson?.data?.url) {
        throw new Error(finalizeJson?.message || "فشل تأكيد رفع الصورة");
      }

      setProductForm((prev) => ({ ...prev, imageUrl: finalizeJson.data.url }));
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch (error: any) {
      toast({
        title: error?.message || "فشل رفع الصورة",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const referralLink = `${window.location.origin}/?libraryRef=${profile?.referralCode || libraryData.referralCode}`;

  if (!token) return null;

  if (loadingProfile) {
    return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.imageUrl ? (
              <img src={profile.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold">{profile?.name || libraryData.name}</h1>
              <p className="text-sm text-muted-foreground">لوحة تحكم المكتبة</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.totalProducts || 0}</p>
                  <p className="text-muted-foreground">المنتجات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.totalSales || 0}</p>
                  <p className="text-muted-foreground">المبيعات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{referrals?.length || 0}</p>
                  <p className="text-muted-foreground">الإحالات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.activityScore || 0}</p>
                  <p className="text-muted-foreground">نقاط النشاط</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              رابط الإحالة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label>رابط الإحالة</Label>
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="text-sm" />
                  <Button variant="outline" onClick={() => copyToClipboard(referralLink)} data-testid="button-copy-referral-link">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>كود الإحالة</Label>
                <div className="flex gap-2">
                  <Input value={profile?.referralCode || ""} readOnly className="w-32" />
                  <Button variant="outline" onClick={() => copyToClipboard(profile?.referralCode || "")} data-testid="button-copy-referral-code">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">المنتجات</TabsTrigger>
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="referrals">الإحالات</TabsTrigger>
            <TabsTrigger value="activity">سجل النشاط</TabsTrigger>
            <TabsTrigger value="finance">الأرباح والسحب</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">منتجاتي ({products?.length || 0})</h2>
              <Button onClick={() => { resetProductForm(); setEditingProduct(null); setShowProductModal(true); }} data-testid="button-add-product">
                <Plus className="h-4 w-4 ml-2" />
                إضافة منتج
              </Button>
            </div>

            {loadingProducts ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : products?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product: Product) => (
                  <Card key={product.id} className={!product.isActive ? "opacity-60" : ""} data-testid={`card-product-${product.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex gap-4">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.title} className="w-20 h-20 rounded-lg object-cover" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium">{product.title}</h3>
                          <p className="text-lg font-bold text-primary">{product.price} ج.م</p>
                          {product.discountPercent > 0 && (
                            <Badge variant="secondary" className="mt-1">
                              خصم {product.discountPercent}% على {product.discountMinQuantity}+
                            </Badge>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">المخزون: {product.stock}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1 mt-3">
                        <Button size="sm" variant="ghost" onClick={() => openEditProduct(product)} data-testid={`button-edit-product-${product.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            if (confirm("هل تريد حذف هذا المنتج؟")) {
                              deleteProductMutation.mutate(product.id);
                            }
                          }}
                          data-testid={`button-delete-product-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد منتجات بعد</p>
                  <Button className="mt-4" onClick={() => setShowProductModal(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة أول منتج
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="referrals">
            {referrals?.length > 0 ? (
              <div className="space-y-2">
                {referrals.map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Badge variant={ref.status === "purchased" ? "default" : "secondary"}>
                        {ref.status === "clicked" ? "زيارة" : ref.status === "registered" ? "تسجيل" : "شراء"}
                      </Badge>
                      <span className="mr-2 text-sm text-muted-foreground">
                        {new Date(ref.createdAt).toLocaleDateString(getDateLocale())}
                      </span>
                    </div>
                    {ref.pointsAwarded > 0 && (
                      <Badge variant="outline">+{ref.pointsAwarded} نقطة</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد إحالات بعد</p>
                  <p className="text-sm text-muted-foreground mt-2">شارك رابط الإحالة لكسب النقاط</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {(orders || []).length > 0 ? (
              <div className="space-y-3">
                {(orders || []).map((order) => (
                  <Card key={order.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{order.productTitle || "منتج مكتبة"}</p>
                          <p className="text-sm text-muted-foreground">المشتري: {order.buyerName || "-"} ({order.buyerEmail || "-"})</p>
                          <p className="text-sm text-muted-foreground">الكمية: {order.quantity} • الإجمالي: {order.subtotal}</p>
                          {order.shippingAddress && <p className="text-sm text-muted-foreground">العنوان: {order.shippingAddress}</p>}
                        </div>
                        <Badge variant={order.status === "pending_admin" ? "secondary" : "outline"}>{order.status}</Badge>
                      </div>

                      {order.status === "pending_admin" && (
                        <div className="text-sm text-muted-foreground p-3 rounded-md bg-muted">
                          الطلب بانتظار تأكيد الأدمن.
                        </div>
                      )}

                      {order.status === "admin_confirmed" && (
                        <Button onClick={() => shipOrderMutation.mutate(order.id)} data-testid={`button-ship-${order.id}`}>
                          <Truck className="h-4 w-4 ml-2" /> تم الشحن
                        </Button>
                      )}

                      {order.status === "shipped" && (
                        <div className="space-y-2">
                          <p className="text-sm">أدخل كود التسليم الذي أعطاه المشتري لرجل التوصيل:</p>
                          <div className="flex gap-2">
                            <Input
                              value={deliveryCodes[order.id] || ""}
                              onChange={(e) => setDeliveryCodes((prev) => ({ ...prev, [order.id]: e.target.value }))}
                              placeholder="كود التسليم"
                            />
                            <Button
                              onClick={() => verifyDeliveryMutation.mutate({ orderId: order.id, code: deliveryCodes[order.id] || "" })}
                              data-testid={`button-deliver-${order.id}`}
                            >
                              <ShieldCheck className="h-4 w-4 ml-2" /> تم التسليم
                            </Button>
                          </div>
                        </div>
                      )}

                      {order.status === "delivered" && (
                        <div className="text-sm text-amber-700 bg-amber-50 rounded-md p-3">
                          تم التسليم، والأرباح معلّقة لمدة {order.holdDays || 15} يوم لحماية المستهلك.
                          {order.protectionExpiresAt && (
                            <span className="block mt-1">تاريخ الإتاحة: {new Date(order.protectionExpiresAt).toLocaleDateString(getDateLocale())}</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">لا توجد طلبات حالياً</CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {activityLogs?.length > 0 ? (
              <div className="space-y-2">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>{log.action === "product_added" ? "إضافة منتج" : log.action === "product_updated" ? "تحديث منتج" : log.action}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">+{log.points}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString(getDateLocale())}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا يوجد نشاط بعد</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="finance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
                  <p className="text-2xl font-bold">{balanceData?.availableBalance || "0.00"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">الرصيد المعلّق</p>
                  <p className="text-2xl font-bold">{balanceData?.pendingBalance || "0.00"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                  <p className="text-2xl font-bold">{balanceData?.totalSalesAmount || "0.00"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">إجمالي العمولة</p>
                  <p className="text-2xl font-bold">{balanceData?.totalCommissionAmount || "0.00"}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> طلب سحب أموال</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input
                    placeholder="المبلغ"
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <Input
                    placeholder="وسيلة الدفع (bank_transfer / vodafone_cash ...)"
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                  />
                  <Input
                    placeholder="تفاصيل الدفع (رقم الحساب/الهاتف...)"
                    value={withdrawDetails}
                    onChange={(e) => setWithdrawDetails(e.target.value)}
                  />
                </div>
                <Button onClick={() => createWithdrawalMutation.mutate()} disabled={createWithdrawalMutation.isPending}>
                  {createWithdrawalMutation.isPending ? "جاري الإرسال..." : "تأكيد طلب السحب"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>سجل طلبات السحب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(withdrawals || []).length > 0 ? (
                  (withdrawals || []).map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{w.amount} • {w.paymentMethod}</p>
                        <p className="text-xs text-muted-foreground">{new Date(w.requestedAt).toLocaleString(getDateLocale())}</p>
                      </div>
                      <Badge variant={w.status === "pending" ? "secondary" : "outline"}>{w.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات سحب بعد</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>فواتير المبيعات اليومية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(invoices || []).length > 0 ? (
                  (invoices || []).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString(getDateLocale())}</p>
                        <p className="text-sm text-muted-foreground">طلبات: {invoice.totalOrders} • إجمالي: {invoice.grossSalesAmount} • صافي: {invoice.netAmount}</p>
                      </div>
                      <Badge variant={invoice.status === "pending" ? "secondary" : "outline"}>{invoice.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد فواتير يومية بعد</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? t("libraryDashboard.editProduct") : t("libraryDashboard.addNewProduct")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>العنوان *</Label>
              <Input
                value={productForm.title}
                onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                data-testid="input-product-title"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                data-testid="input-product-description"
              />
            </div>
            <div>
              <Label>رابط الصورة</Label>
              <Input
                value={productForm.imageUrl}
                onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                data-testid="input-product-image"
              />
              <div className="mt-2 flex items-center gap-2">
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await uploadProductImage(file);
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                  <span className={`inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer ${isUploadingImage ? "opacity-60 pointer-events-none" : ""}`}>
                    {isUploadingImage ? "جاري الرفع..." : "اختيار من المعرض / الكاميرا"}
                  </span>
                </label>
              </div>
              {productForm.imageUrl && (
                <img
                  src={productForm.imageUrl}
                  alt="preview"
                  className="mt-2 h-20 w-20 rounded-md object-cover border"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>السعر *</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  data-testid="input-product-price"
                />
              </div>
              <div>
                <Label>المخزون</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                  data-testid="input-product-stock"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>نسبة الخصم %</Label>
                <Input
                  type="number"
                  value={productForm.discountPercent}
                  onChange={(e) => setProductForm({ ...productForm, discountPercent: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>الحد الأدنى للخصم</Label>
                <Input
                  type="number"
                  value={productForm.discountMinQuantity}
                  onChange={(e) => setProductForm({ ...productForm, discountMinQuantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)}>إلغاء</Button>
            <Button 
              onClick={() => {
                if (editingProduct) {
                  updateProductMutation.mutate({ id: editingProduct.id, data: productForm });
                } else {
                  createProductMutation.mutate(productForm);
                }
              }}
              disabled={createProductMutation.isPending || updateProductMutation.isPending}
              data-testid="button-submit-product"
            >
              {createProductMutation.isPending || updateProductMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
