import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Gift, ArrowRight, Truck, Star, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending_admin_approval: { label: "بانتظار موافقة الإدارة", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  active: { label: "متاح للتعيين", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  assigned_to_child: { label: "مُعيّن لطفل", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Gift },
  exhausted: { label: "مستخدَم", color: "bg-gray-100 text-gray-500 border-gray-200", icon: Package },
};

export default function ParentInventory() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const token = localStorage.getItem("token");

  const [assignDialog, setAssignDialog] = useState<any>(null);
  const [selectedChild, setSelectedChild] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/parent/owned-products"],
    enabled: !!token,
  });

  const { data: childrenData } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, childId, requiredPoints }: { id: string; childId: string; requiredPoints: number }) => {
      return await apiRequest("POST", `/api/parent/owned-products/${id}/assign-to-child`, { childId, requiredPoints });
    },
    onSuccess: () => {
      setAssignDialog(null);
      setSelectedChild("");
      setRequiredPoints("");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/owned-products"] });
    },
  });

  const products: any[] = Array.isArray(data) ? data : (data as any)?.data || [];
  const children: any[] = Array.isArray(childrenData) ? childrenData : (childrenData as any)?.data || [];

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} flex items-center justify-center`} dir="rtl">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>جاري تحميل المنتجات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`} dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-7 h-7" />
                منتجاتي المملوكة
              </h1>
              <p className="text-white/80 text-sm mt-1">
                {products.length} منتج{products.length !== 1 ? "ات" : ""}
              </p>
            </div>
            <button
              onClick={() => navigate("/parent-dashboard")}
              className="flex items-center gap-1 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              الرئيسية
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {products.length === 0 ? (
          <Card className={`text-center py-16 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
            <CardContent>
              <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
              <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>لا توجد منتجات بعد</h3>
              <p className={`mb-6 ${isDark ? "text-gray-500" : "text-gray-400"}`}>اشترِ منتجات من المتجر لتظهر هنا</p>
              <Button onClick={() => navigate("/parent-store")} className="bg-orange-500 hover:bg-orange-600">
                تصفح المتجر
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {products.map((p: any) => {
              const product = p.product || {};
              const productName = product.nameAr || product.name || "منتج غير معروف";
              const sCfg = statusConfig[p.status] || statusConfig.active;
              const StatusIcon = sCfg.icon;

              return (
                <Card key={p.id} className={`overflow-hidden hover:shadow-md transition-shadow ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      {/* Product Image */}
                      <div className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${isDark ? "bg-gray-700" : "bg-gradient-to-br from-gray-100 to-gray-50"}`}>
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className={`w-8 h-8 ${isDark ? "text-gray-500" : "text-gray-300"}`} />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-lg truncate ${isDark ? "text-white" : "text-gray-800"}`}>{productName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {product.price && (
                            <span className="text-orange-600 font-bold">{product.price} ج.م</span>
                          )}
                          {product.pointsPrice > 0 && (
                            <span className={`text-sm flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              {product.pointsPrice} نقطة
                            </span>
                          )}
                        </div>
                        <Badge className={`mt-2 text-xs border ${sCfg.color}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {sCfg.label}
                        </Badge>
                      </div>

                      {/* Action */}
                      <div className="flex-shrink-0">
                        {p.status === "active" ? (
                          <Button
                            onClick={() => setAssignDialog(p)}
                            className="bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
                          >
                            <Gift className="w-4 h-4" />
                            تعيين كهدية
                          </Button>
                        ) : p.status === "assigned_to_child" ? (
                          <Button
                            variant="outline"
                            className="text-blue-600 border-blue-200"
                            disabled
                          >
                            <Truck className="w-4 h-4 ml-1" />
                            تم التعيين
                          </Button>
                        ) : p.status === "pending_admin_approval" ? (
                          <Button variant="outline" className="text-yellow-600 border-yellow-200" disabled>
                            <Clock className="w-4 h-4 ml-1" />
                            بانتظار الموافقة
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setSelectedChild(""); setRequiredPoints(""); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <Gift className="w-5 h-5 text-orange-500" />
              تعيين كهدية للطفل
            </DialogTitle>
          </DialogHeader>

          {assignDialog && (
            <div className="space-y-5">
              {/* Product Preview */}
                <div className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? "bg-gray-700" : "bg-gradient-to-r from-orange-50 to-yellow-50"}`}>
                <div className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm ${isDark ? "bg-gray-600" : "bg-white"}`}>
                  {assignDialog.product?.image ? (
                    <img src={assignDialog.product.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                    {assignDialog.product?.nameAr || assignDialog.product?.name || "منتج"}
                  </h4>
                  {assignDialog.product?.price && (
                    <p className="text-orange-600 font-bold">{assignDialog.product.price} ج.م</p>
                  )}
                </div>
              </div>

              {/* Child Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">اختر الطفل</label>
                {children.length === 0 ? (
                  <p className="text-sm text-red-500">لا يوجد أطفال مرتبطين بحسابك</p>
                ) : (
                  <Select value={selectedChild} onValueChange={setSelectedChild}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر طفلاً..." />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child: any) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.name} ({child.totalPoints || 0} نقطة)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Required Points */}
              <div>
                <label className="block text-sm font-medium mb-2">النقاط المطلوبة للحصول على الهدية</label>
                <Input
                  type="number"
                  min="1"
                  value={requiredPoints}
                  onChange={(e) => setRequiredPoints(e.target.value)}
                  placeholder="مثال: 100"
                />
                <p className="text-xs text-gray-400 mt-1">
                  سيحتاج الطفل جمع هذا العدد من النقاط للحصول على الهدية
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  disabled={!selectedChild || !requiredPoints || assignMutation.isPending}
                  onClick={() => {
                    assignMutation.mutate({
                      id: assignDialog.id,
                      childId: selectedChild,
                      requiredPoints: parseInt(requiredPoints),
                    });
                  }}
                >
                  {assignMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التعيين...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      تعيين كهدية
                    </span>
                  )}
                </Button>
                <Button variant="outline" onClick={() => { setAssignDialog(null); setSelectedChild(""); setRequiredPoints(""); }}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
