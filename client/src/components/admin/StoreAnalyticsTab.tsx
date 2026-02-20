import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Package, TrendingUp, ShoppingCart, Users, Star, AlertTriangle,
  DollarSign, Gift, BarChart3, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StoreAnalyticsTabProps {
  token: string;
}

export function StoreAnalyticsTab({ token }: StoreAnalyticsTabProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [days, setDays] = useState("30");

  const { data, isLoading, error } = useQuery({
    queryKey: ["store-analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/store/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-red-500">فشل في تحميل تحليلات المتجر</p>
      </div>
    );
  }

  const { overview, revenue, childPurchases: childPurchaseData, topProducts, categoryBreakdown, recentOrders, dailyRevenue, gifts, activeBuyers, lowStockProducts } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            تحليلات المتجر
          </h2>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            نظرة شاملة على أداء المتجر وسلوك المستخدمين
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 3 أشهر</SelectItem>
            <SelectItem value="365">آخر سنة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
          label="إجمالي الإيرادات"
          value={`${Number(revenue?.totalRevenue || 0).toLocaleString("ar-EG")} ج.م`}
          subtext={`${revenue?.totalOrders || 0} طلب`}
          isDark={isDark}
          color="green"
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-blue-500" />}
          label="متوسط قيمة الطلب"
          value={`${Number(revenue?.averageOrderValue || 0).toLocaleString("ar-EG")} ج.م`}
          subtext={`${activeBuyers || 0} مشتري نشط`}
          isDark={isDark}
          color="blue"
        />
        <StatCard
          icon={<Package className="w-5 h-5 text-purple-500" />}
          label="المنتجات النشطة"
          value={`${overview?.activeProducts || 0}`}
          subtext={`${overview?.outOfStock || 0} نفذ من المخزون`}
          isDark={isDark}
          color="purple"
        />
        <StatCard
          icon={<Gift className="w-5 h-5 text-orange-500" />}
          label="الهدايا المعيّنة"
          value={`${gifts?.totalAssigned || 0}`}
          subtext={`${gifts?.completed || 0} مكتملة • ${gifts?.active || 0} نشطة`}
          isDark={isDark}
          color="orange"
        />
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              مشتريات الأولياء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {Number(revenue?.parentPurchases?.total || 0).toLocaleString("ar-EG")} ج.م
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {revenue?.parentPurchases?.count || 0} عملية شراء
            </p>
          </CardContent>
        </Card>
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-500" />
              طلبات المتجر (Stripe)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {Number(revenue?.storeOrders?.total || 0).toLocaleString("ar-EG")} ج.م
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {revenue?.storeOrders?.count || 0} طلب
            </p>
          </CardContent>
        </Card>
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              مشتريات الأطفال (نقاط)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {Number(childPurchaseData?.totalPointsSpent || 0).toLocaleString("ar-EG")} نقطة
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {childPurchaseData?.count || 0} عملية شراء
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue Chart */}
      {dailyRevenue && dailyRevenue.length > 0 && (
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              اتجاه الإيرادات اليومية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
                {dailyRevenue.map((day: any, idx: number) => {
                  const maxRev = Math.max(...dailyRevenue.map((d: any) => Number(d.revenue)));
                  const height = maxRev > 0 ? (Number(day.revenue) / maxRev) * 100 : 0;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1 min-w-[32px]" title={`${day.date}: ${Number(day.revenue).toLocaleString("ar-EG")} ج.م (${day.orders} طلب)`}>
                      <div
                        className="w-6 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className={`text-[9px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{dailyRevenue[0]?.date}</span>
                <span>{dailyRevenue[dailyRevenue.length - 1]?.date}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two columns: Top Products + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              أكثر المنتجات مبيعاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((p: any, idx: number) => (
                  <div key={p.productId} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3 ? "bg-yellow-100 text-yellow-700" : isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nameAr || p.name}</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {p.totalQuantity} عملية بيع
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {Number(p.totalRevenue).toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">لا توجد مبيعات في هذه الفترة</p>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              توزيع المنتجات حسب الفئة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown && categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {categoryBreakdown.map((cat: any) => {
                  const totalCats = categoryBreakdown.reduce((s: number, c: any) => s + c.productCount, 0);
                  const pct = totalCats > 0 ? (cat.productCount / totalCats) * 100 : 0;
                  return (
                    <div key={cat.categoryId || "uncategorized"} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{cat.categoryNameAr || cat.categoryName || "بدون فئة"}</span>
                        <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                          {cat.productCount} منتج ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alert */}
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              تنبيه المخزون المنخفض
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {lowStockProducts.map((p: any) => (
                  <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? "bg-red-900/20" : "bg-red-50"}`}>
                    <div className="w-8 h-8 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-sm truncate">{p.nameAr || p.name}</span>
                    <Badge variant={p.stock === 0 ? "destructive" : "outline"} className="text-xs">
                      {p.stock === 0 ? "نفذ" : `${p.stock} متبقي`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-green-500 py-8">✅ جميع المنتجات في مخزون كافي</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              آخر الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    <div>
                      <p className="text-sm font-medium">
                        {Number(order.totalAmount).toLocaleString("ar-EG")} ج.م
                      </p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        order.paymentStatus === "paid"
                          ? "border-green-500 text-green-600"
                          : order.paymentStatus === "failed"
                          ? "border-red-500 text-red-600"
                          : "border-yellow-500 text-yellow-600"
                      }`}
                    >
                      {order.paymentStatus === "paid" ? "مدفوع" : order.paymentStatus === "failed" ? "فشل" : "معلق"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">لا توجد طلبات حديثة</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Behavior Insights */}
      <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            رؤى سلوك المستخدم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-700" : "bg-indigo-50"}`}>
              <Users className="w-6 h-6 mx-auto text-indigo-500 mb-2" />
              <p className="text-2xl font-bold text-indigo-600">{activeBuyers || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>مشتري نشط</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-700" : "bg-green-50"}`}>
              <ShoppingCart className="w-6 h-6 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-green-600">{revenue?.totalOrders || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>إجمالي الطلبات</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-700" : "bg-orange-50"}`}>
              <Gift className="w-6 h-6 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-orange-600">{gifts?.active || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>هدايا نشطة</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-700" : "bg-yellow-50"}`}>
              <Star className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{childPurchaseData?.count || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>شراء بالنقاط</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper stat card component
function StatCard({ icon, label, value, subtext, isDark, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  isDark: boolean;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    green: isDark ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200",
    blue: isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200",
    purple: isDark ? "bg-purple-900/20 border-purple-800" : "bg-purple-50 border-purple-200",
    orange: isDark ? "bg-orange-900/20 border-orange-800" : "bg-orange-50 border-orange-200",
  };
  return (
    <Card className={`border ${bgMap[color] || ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{subtext}</p>
      </CardContent>
    </Card>
  );
}
