import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { ChildGamesControl } from "@/components/parent/ChildGamesControl";
import { AnnualReportChart } from "@/components/AnnualReportChart";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Wallet, 
  Bell, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  QrCode, 
  Plus, 
  Gift, 
  Target, 
  Star, 
  Trophy,
  Copy,
  Check,
  BookOpen,
  Gamepad2,
  Share2,
  Clock,
  ChevronRight,
  Zap,
  Sparkles,
  Moon,
  Sun,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Package
} from "lucide-react";

function ChildReportCard({ child, token, isDark, t }: { child: any; token: string | null; isDark: boolean; t: (key: string, options?: any) => string }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/parent/children", child.id, "reports", period],
    queryFn: async () => {
      const res = await fetch(`/api/parent/children/${child.id}/reports?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !!child.id,
  });

  const report = reportData?.data || null;

  return (
    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold ${
            isDark ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-600"
          }`}>
            {child.name?.charAt(0) || "👤"}
          </div>
          <div>
            <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {child.name}
            </h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {child.totalPoints || 0} {t('parentDashboard.points')} • {t('parentDashboard.level')} {child.level || 1}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                period === p
                  ? "bg-blue-500 text-white"
                  : isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
              data-testid={`button-period-${p}-${child.id}`}
            >
              {p === "daily" ? t('parentDashboard.daily') : p === "weekly" ? t('parentDashboard.weekly') : t('parentDashboard.monthly')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : report ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className={`p-3 rounded-lg text-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <p className="text-2xl font-bold text-blue-500">{report.summary?.totalTasks || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.total')}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <p className="text-2xl font-bold text-green-500">{report.summary?.completedTasks || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.completed')}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <p className="text-2xl font-bold text-yellow-500">{report.summary?.pendingTasks || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.pending')}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
              <p className="text-2xl font-bold text-purple-500">{report.summary?.pointsEarned || 0}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.points')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.completionRate')}:</span>
            <div className="flex-1">
              <Progress value={report.summary?.completionRate || 0} className="h-2" />
            </div>
            <span className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {report.summary?.completionRate || 0}%
            </span>
          </div>

          {report.bySubject?.length > 0 && (
            <div className="space-y-2">
              <p className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{t('parentDashboard.bySubject')}:</p>
              <div className="grid gap-2">
                {report.bySubject.map((subj: any) => (
                  <div
                    key={subj.subjectId}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isDark ? "bg-gray-700" : "bg-white"
                    }`}
                  >
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {subj.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {subj.completed}/{subj.total}
                      </span>
                      <Badge variant={subj.rate >= 70 ? "default" : subj.rate >= 40 ? "secondary" : "outline"}>
                        {subj.rate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>{t('parentDashboard.noDataAvailable')}</p>
        </div>
      )}
    </div>
  );
}

export const ParentDashboard = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const [cartCount, setCartCount] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showLinkCode, setShowLinkCode] = useState(false);
  const [gamesChild, setGamesChild] = useState<any>(null);
  const [selectedReportChild, setSelectedReportChild] = useState<string>("all");

  const { data: parentInfo } = useQuery({
    queryKey: ["/api/parent/info"],
    enabled: !!token,
  });

  const { data: children } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const { data: wallet } = useQuery({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/parent/notifications"],
    enabled: !!token,
    refetchInterval: token ? 5000 : false, // Stop polling when no token
  });

  const { data: childrenStatus } = useQuery({
    queryKey: ["/api/parent/children/status"],
    enabled: !!token,
    refetchInterval: token ? 300000 : false, // Stop polling when no token
  });

  const { data: referralStats } = useQuery({
    queryKey: ["/api/parent/referrals"],
    enabled: !!token,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["/api/parent/store/orders"],
    enabled: !!token,
  });

  const { data: ownedProducts } = useQuery({
    queryKey: ["/api/parent/owned-products"],
    enabled: !!token,
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/parent/tasks"],
    enabled: !!token,
  });

  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!token,
  });

  const { data: tasksBySubject } = useQuery({
    queryKey: ["/api/parent/tasks/by-subject"],
    enabled: !!token,
  });

  const { data: purchaseRequests } = useQuery({
    queryKey: ["/api/parent/purchase-requests"],
    enabled: !!token,
    refetchInterval: token ? 10000 : false,
  });

  const { toast } = useToast();

  const purchaseDecisionMutation = useMutation({
    mutationFn: async ({ requestId, decision, shippingAddress }: { requestId: string; decision: "approved" | "rejected"; shippingAddress?: string }) => {
      return apiRequest("PATCH", `/api/parent/purchase-requests/${requestId}/decision`, {
        decision,
        shippingAddress,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      toast({
        title: t("parentDashboard.purchaseRequestUpdated"),
        description: t("parentDashboard.purchaseRequestUpdatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("errors.error"),
        description: t("errors.somethingWentWrong"),
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("deviceTrusted");
    navigate("/");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const notificationsList = Array.isArray(notifications) ? notifications : [];
  const childrenList = Array.isArray(children) ? children : [];
  const tasksList = Array.isArray(tasks) ? tasks : [];
  const subjectsList = Array.isArray(subjects) ? subjects : [];
  const tasksBySubjectList = Array.isArray(tasksBySubject) ? tasksBySubject : [];
  const ordersList = Array.isArray(recentOrders) ? recentOrders : (recentOrders as any)?.data || [];
  const ownedProductsList = Array.isArray(ownedProducts) ? ownedProducts : (ownedProducts as any)?.data || [];
  const purchaseRequestsList = Array.isArray(purchaseRequests) ? purchaseRequests : [];
  const pendingPurchaseRequests = purchaseRequestsList.filter((r: any) => r.status === "pending_parent_approval");
  const parentData = parentInfo as any || {};
  const walletData = wallet as any || {};
  const referralData = referralStats as any || {};
  const statusData = childrenStatus as any || {};

  const unreadNotifications = notificationsList.filter((n: any) => !n.isRead).length || 0;
  const totalChildrenPoints = childrenList.reduce((sum: number, c: any) => sum + (c.totalPoints || 0), 0) || 0;
  const pendingTasks = tasksList.filter((t: any) => t.status === "pending").length || 0;
  const completedTasks = tasksList.filter((t: any) => t.status === "completed").length || 0;

  useEffect(() => {
    const updateCartCount = () => {
      try {
        const rawCart = localStorage.getItem("parent-store-cart");
        if (!rawCart) {
          setCartCount(0);
          return;
        }
        const parsedCart = JSON.parse(rawCart);
        if (!Array.isArray(parsedCart)) {
          setCartCount(0);
          return;
        }
        const totalItems = parsedCart.reduce((sum: number, item: any) => sum + (item?.quantity || 0), 0);
        setCartCount(totalItems);
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("parent-store-cart-updated", updateCartCount as EventListener);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("parent-store-cart-updated", updateCartCount as EventListener);
    };
  }, []);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-950" : "bg-gradient-to-br from-slate-50 to-blue-50"}`}>
      <header className={`sticky top-0 z-40 ${isDark ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-200"} border-b backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${isDark ? "bg-gradient-to-br from-purple-600 to-indigo-600" : "bg-gradient-to-br from-purple-500 to-indigo-500"} flex items-center justify-center shadow-lg`}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Classify</h1>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.welcomeUser', { name: parentData?.name || '' })}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/notifications")}
              className="relative"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <LanguageSelector />
            <PWAInstallButton variant="ghost" size="icon" showText={false} />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} data-testid="button-settings">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-500 hover:text-red-600" data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={`${isDark ? "bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50" : "bg-gradient-to-br from-blue-500 to-blue-600"} text-white border-0`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-80">{t('parentDashboard.children')}</p>
                  <p className="text-2xl font-bold">{childrenList.length}</p>
                </div>
                <Users className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDark ? "bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50" : "bg-gradient-to-br from-green-500 to-green-600"} text-white border-0`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-80">{t('parentDashboard.walletBalance')}</p>
                  <p className="text-2xl font-bold">₪{Number(walletData?.balance || 0).toFixed(0)}</p>
                </div>
                <Wallet className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDark ? "bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50" : "bg-gradient-to-br from-purple-500 to-purple-600"} text-white border-0`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-80">{t('parentDashboard.totalPoints')}</p>
                  <p className="text-2xl font-bold">{totalChildrenPoints}</p>
                </div>
                <Star className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className={`${isDark ? "bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-700/50" : "bg-gradient-to-br from-orange-500 to-orange-600"} text-white border-0`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-80">{t('parentDashboard.notifications')}</p>
                  <p className="text-2xl font-bold">{unreadNotifications}</p>
                </div>
                <Bell className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className={`w-full justify-start overflow-x-auto ${isDark ? "bg-gray-800" : "bg-white"} p-1 rounded-xl shadow-sm`}>
            <TabsTrigger value="overview" className="gap-2 flex-shrink-0" data-testid="tab-overview">
              <Target className="h-4 w-4" />
              {t('parentDashboard.overview')}
            </TabsTrigger>
            <TabsTrigger value="children" className="gap-2 flex-shrink-0" data-testid="tab-children">
              <Users className="h-4 w-4" />
              {t('parentDashboard.children')}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2 flex-shrink-0" data-testid="tab-tasks">
              <Trophy className="h-4 w-4" />
              {t('parentDashboard.tasks')}
            </TabsTrigger>
            <TabsTrigger value="store" className="gap-2 flex-shrink-0" data-testid="tab-store">
              <ShoppingBag className="h-4 w-4" />
              {t('parentDashboard.store')}
            </TabsTrigger>
            <TabsTrigger value="referral" className="gap-2 flex-shrink-0" data-testid="tab-referral">
              <Share2 className="h-4 w-4" />
              {t('parentDashboard.referrals')}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 flex-shrink-0" data-testid="tab-reports">
              <BookOpen className="h-4 w-4" />
              {t('parentDashboard.reports')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-blue-500" />
                    {t('parentDashboard.linkChildren')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-100"} p-4 rounded-xl text-center`}>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"} mb-2`}>{t('parentDashboard.yourLinkCode')}</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-3xl font-mono font-bold text-blue-500 tracking-widest">
                        {showLinkCode 
                          ? (parentData?.uniqueCode || "...") 
                          : (parentData?.uniqueCode ? "●".repeat(parentData.uniqueCode.length) : "...")}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setShowLinkCode(!showLinkCode)}
                        data-testid="button-toggle-code"
                      >
                        {showLinkCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => copyCode(parentData?.uniqueCode || "")}
                        data-testid="button-copy-code"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowQR(true)} 
                    className="w-full gap-2"
                    variant="outline"
                    data-testid="button-show-qr"
                  >
                    <QrCode className="h-4 w-4" />
                    {t('parentDashboard.showQRCode')}
                  </Button>
                </CardContent>
              </Card>

              <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    {t('parentDashboard.quickActions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => navigate("/parent-tasks")} 
                      className="h-auto py-4 flex-col gap-2 bg-blue-500 hover:bg-blue-600"
                      data-testid="button-create-task"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-xs">{t('parentDashboard.createTask')}</span>
                    </Button>
                    <Button 
                      onClick={() => navigate("/parent-store")} 
                      className="h-auto py-4 flex-col gap-2 bg-green-500 hover:bg-green-600"
                      data-testid="button-go-store"
                    >
                      <ShoppingBag className="h-5 w-5" />
                      <span className="text-xs">{t('parentDashboard.store')}</span>
                    </Button>
                    <Button 
                      onClick={() => navigate("/wallet")} 
                      className="h-auto py-4 flex-col gap-2 bg-purple-500 hover:bg-purple-600"
                      data-testid="button-wallet"
                    >
                      <Wallet className="h-5 w-5" />
                      <span className="text-xs">{t('parentDashboard.wallet')}</span>
                    </Button>
                    <Button 
                      onClick={() => navigate("/subjects")} 
                      className="h-auto py-4 flex-col gap-2 bg-indigo-500 hover:bg-indigo-600"
                      data-testid="button-subjects"
                    >
                      <BookOpen className="h-5 w-5" />
                      <span className="text-xs">{t('parentDashboard.subjects')}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {pendingPurchaseRequests.length > 0 && (
              <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-purple-500" />
                    {t('parentDashboard.pendingPurchaseRequests')}
                    <Badge variant="secondary" className="bg-purple-500 text-white">{pendingPurchaseRequests.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingPurchaseRequests.map((request: any) => (
                      <div 
                        key={request.id} 
                        className={`p-4 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-purple-50 border-purple-200"}`}
                        data-testid={`purchase-request-${request.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-white"}`}>
                            {request.productImage ? (
                              <img src={request.productImage} alt="" className="h-10 w-10 object-cover rounded" />
                            ) : (
                              <Package className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {request.childName}
                              </span>
                              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {t('parentDashboard.wantsToBuy')}
                              </span>
                            </div>
                            <p className={`font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                              {request.productName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <Star className="h-3 w-3 ml-1" />
                                {request.totalPoints} {t('parentDashboard.points')}
                              </Badge>
                              {request.isLibraryProduct && (
                                <Badge className="bg-purple-100 text-purple-700">
                                  {request.libraryName || t('parentDashboard.library')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            className="flex-1 bg-green-500 hover:bg-green-600"
                            onClick={() => purchaseDecisionMutation.mutate({ 
                              requestId: request.id, 
                              decision: "approved",
                              shippingAddress: parentData.address || ""
                            })}
                            disabled={purchaseDecisionMutation.isPending}
                            data-testid={`button-approve-${request.id}`}
                          >
                            <CheckCircle className="h-4 w-4 ml-2" />
                            {t('parentDashboard.approve')}
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => purchaseDecisionMutation.mutate({ 
                              requestId: request.id, 
                              decision: "rejected"
                            })}
                            disabled={purchaseDecisionMutation.isPending}
                            data-testid={`button-reject-${request.id}`}
                          >
                            <XCircle className="h-4 w-4 ml-2" />
                            {t('parentDashboard.reject')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {notificationsList.length > 0 && (
              <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-500" />
                    {t('parentDashboard.latestNotifications')}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/notifications")} data-testid="button-view-all-notifications">
                    {t('parentDashboard.viewAll')}
                    <ChevronRight className="h-4 w-4 mr-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notificationsList.slice(0, 3).map((notif: any) => (
                      <div 
                        key={notif.id} 
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          isDark 
                            ? notif.isRead ? "bg-gray-800" : "bg-gray-800/80 border border-blue-700/50" 
                            : notif.isRead ? "bg-gray-50" : "bg-blue-50 border border-blue-200"
                        }`}
                        data-testid={`notification-item-${notif.id}`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          notif.type === "task_completed" ? "bg-green-100 text-green-600" :
                          notif.type === "gift_claimed" ? "bg-purple-100 text-purple-600" :
                          notif.type === "points_earned" ? "bg-yellow-100 text-yellow-600" :
                          "bg-blue-100 text-blue-600"
                        }`}>
                          {notif.type === "task_completed" ? <Trophy className="h-5 w-5" /> :
                           notif.type === "gift_claimed" ? <Gift className="h-5 w-5" /> :
                           notif.type === "points_earned" ? <Star className="h-5 w-5" /> :
                           <Bell className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{notif.title}</p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"} truncate`}>{notif.body}</p>
                        </div>
                        {!notif.isRead && <Badge variant="secondary" className="bg-blue-500 text-white text-xs">{t('parentDashboard.new')}</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="children" className="mt-6">
            <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  {t('parentDashboard.linkedChildren')} ({childrenList.length})
                </CardTitle>
                <Button onClick={() => navigate("/parent-tasks")} size="sm" className="gap-2" data-testid="button-new-task">
                  <Plus className="h-4 w-4" />
                  {t('parentDashboard.createTask')}
                </Button>
              </CardHeader>
              <CardContent>
                {childrenList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {childrenList.map((child: any) => {
                      const childrenStatusList = statusData?.children || [];
                      const status = childrenStatusList.find((s: any) => s.id === child.id);
                      const progressPercent = status?.points ? Math.min((status.points / 1000) * 100, 100) : 0;
                      
                      return (
                        <div 
                          key={child.id}
                          className={`p-4 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-sm`}
                          data-testid={`card-child-${child.id}`}
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className={`h-14 w-14 rounded-full ${isDark ? "bg-gray-700" : "bg-gradient-to-br from-blue-100 to-purple-100"} flex items-center justify-center`}>
                              <span className="text-2xl">👧</span>
                            </div>
                            <div className="flex-1">
                              <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{child.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={status?.status === "excellent" ? "default" : status?.status === "needs_attention" ? "destructive" : "secondary"} className="text-xs">
                                  {status?.statusMessage || t('parentDashboard.active')}
                                </Badge>
                                {status?.speedLevel && (
                                  <span className="text-xs text-gray-500">
                                    {status.speedLevel === "superfast" ? "🚀" : status.speedLevel === "fast" ? "⚡" : status.speedLevel === "moderate" ? "📈" : "🌱"}
                                    {status.pointsPerDay} {t('parentDashboard.pointsPerDay')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-yellow-500">{status?.points || child.totalPoints || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.points')}</p>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span className={isDark ? "text-gray-400" : "text-gray-500"}>{t('parentDashboard.progressTo1000')}</span>
                              <span className={isDark ? "text-gray-400" : "text-gray-500"}>{progressPercent.toFixed(0)}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className={`${isDark ? "bg-gray-700" : "bg-blue-50"} p-2 rounded-lg text-center`}>
                              <Trophy className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                              <p className="text-sm font-bold">{status?.tasksCompleted || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.tasks')}</p>
                            </div>
                            <div className={`${isDark ? "bg-gray-700" : "bg-green-50"} p-2 rounded-lg text-center`}>
                              <Gamepad2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
                              <p className="text-sm font-bold">{status?.gamesPlayed || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.games')}</p>
                            </div>
                            <div className={`${isDark ? "bg-gray-700" : "bg-pink-50"} p-2 rounded-lg text-center`}>
                              <Gift className="h-4 w-4 mx-auto text-pink-500 mb-1" />
                              <p className="text-sm font-bold">{status?.pendingGifts || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.gifts')}</p>
                            </div>
                            <div className={`${isDark ? "bg-gray-700" : "bg-yellow-50"} p-2 rounded-lg text-center`}>
                              <Clock className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                              <p className="text-sm font-bold">{status?.daysSinceJoined || 0}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.days')}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              onClick={() => navigate("/assign-task")}
                              variant="default"
                              size="sm"
                              className="flex-1 gap-1"
                              data-testid={`button-send-task-${child.id}`}
                            >
                              <Target className="h-4 w-4" />
                              {t('parentDashboard.sendTask')}
                            </Button>
                            <Button 
                              onClick={() => setGamesChild(child)}
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-1"
                              data-testid={`button-games-${child.id}`}
                            >
                              <Gamepad2 className="h-4 w-4" />
                              {t('parentDashboard.games')}
                            </Button>
                            <Button 
                              onClick={() => navigate("/parent-inventory")}
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-1"
                              data-testid={`button-inventory-${child.id}`}
                            >
                              <Gift className="h-4 w-4" />
                              {t('parentDashboard.gifts')}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-center py-12 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                    <Users className={`h-16 w-16 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                    <p className={`text-lg font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t('parentDashboard.noChildren')}</p>
                    <p className={`text-sm mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{t('parentDashboard.noChildrenDesc')}</p>
                    <Button onClick={() => setShowQR(true)} className="mt-4 gap-2" data-testid="button-show-qr-empty">
                      <QrCode className="h-4 w-4" />
                      {t('parentDashboard.showQRCode')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6 space-y-6">
            <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  {t('parentDashboard.taskManagement')}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {pendingTasks} {t('parentDashboard.pending')}
                  </Badge>
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                    <Check className="h-3 w-3" />
                    {completedTasks} {t('parentDashboard.completed')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Button 
                    onClick={() => navigate("/parent-tasks")}
                    className="h-auto py-6 flex-col gap-2 bg-gradient-to-br from-blue-500 to-blue-600"
                    data-testid="button-tasks-section"
                  >
                    <BookOpen className="h-8 w-8" />
                    <span>{t('parentDashboard.tasksSection')}</span>
                  </Button>
                  <Button 
                    onClick={() => navigate("/parent-tasks")}
                    variant="outline"
                    className="h-auto py-6 flex-col gap-2"
                    data-testid="button-create-new-task"
                  >
                    <Plus className="h-8 w-8" />
                    <span>{t('parentDashboard.createDirectTask')}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {subjectsList.length > 0 && (
              <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-500" />
                    {t('parentDashboard.subjects')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {subjectsList.map((subject: any) => (
                      <div
                        key={subject.id}
                        className={`p-4 rounded-xl text-center cursor-pointer transition-all hover:scale-105 ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100"}`}
                        style={{ borderLeft: `4px solid ${subject.color}` }}
                        onClick={() => navigate(`/subject-tasks?subject=${subject.id}`)}
                        data-testid={`subject-card-${subject.id}`}
                      >
                        <span className="text-3xl block mb-2">{subject.emoji}</span>
                        <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{subject.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {tasksBySubjectList.length > 0 ? (
              <div className="space-y-4">
                {tasksBySubjectList.map((group: any) => (
                  <Card key={group.subject?.id || "none"} className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{group.subject?.emoji || "📋"}</span>
                        {group.subject?.name || t('parentDashboard.noSubject')}
                        <Badge variant="outline" className="mr-auto">{group.tasks?.length || 0} {t('parentDashboard.task')}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {group.tasks?.slice(0, 5).map((task: any) => (
                          <div 
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                            data-testid={`task-item-${task.id}`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              task.status === "completed" ? "bg-green-100" :
                              task.status === "pending" ? "bg-yellow-100" :
                              "bg-blue-100"
                            }`}>
                              {task.status === "completed" ? <Check className="h-4 w-4 text-green-600" /> :
                               task.status === "pending" ? <Clock className="h-4 w-4 text-yellow-600" /> :
                               <Target className="h-4 w-4 text-blue-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>{task.question}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {task.child?.name || t('parentDashboard.child')} - {task.pointsReward} {t('parentDashboard.points')}
                              </p>
                            </div>
                            <Badge variant={task.status === "completed" ? "default" : task.status === "pending" ? "secondary" : "outline"}>
                              {task.status === "completed" ? t('parentDashboard.completed') : task.status === "pending" ? t('parentDashboard.pending') : t('parentDashboard.inProgress')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Trophy className={`h-12 w-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{t('parentDashboard.noTasks')}</p>
                    <p className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t('parentDashboard.createFirstTask')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="store" className="mt-6">
            <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-green-500" />
                  {t('parentDashboard.storeAndPurchases')}
                </CardTitle>
                <Button onClick={() => navigate("/parent-store")} variant="outline" size="sm" className="gap-2" data-testid="button-go-to-store">
                  {t('parentDashboard.visitStore')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Button 
                    onClick={() => navigate("/parent-store")}
                    className="h-auto py-6 flex-col gap-2 bg-gradient-to-br from-green-500 to-green-600"
                    data-testid="button-shop-now"
                  >
                    <ShoppingBag className="h-8 w-8" />
                    <span>{t('parentDashboard.shopNow')}</span>
                  </Button>
                  <Button 
                    onClick={() => navigate("/parent-inventory")}
                    variant="outline"
                    className="h-auto py-6 flex-col gap-2"
                    data-testid="button-my-inventory"
                  >
                    <Gift className="h-8 w-8" />
                    <span>{t('parentDashboard.myInventory')} ({ownedProductsList.length})</span>
                  </Button>
                  <Button 
                    onClick={() => navigate("/parent-store?view=cart")}
                    variant="outline"
                    className="h-auto py-6 flex-col gap-2"
                    data-testid="button-cart"
                  >
                    <ShoppingBag className="h-8 w-8" />
                    <span>{t('parentDashboard.cart')} ({cartCount})</span>
                  </Button>
                  <Button 
                    onClick={() => navigate("/parent-store?view=orders")}
                    variant="outline"
                    className="h-auto py-6 flex-col gap-2"
                    data-testid="button-orders"
                  >
                    <Clock className="h-8 w-8" />
                    <span>{t('parentDashboard.myOrders')} ({ordersList.length})</span>
                  </Button>
                </div>

                {ordersList.length > 0 && (
                  <>
                    <h3 className={`font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>{t('parentDashboard.recentOrders')}</h3>
                    <div className="space-y-2">
                      {ordersList.slice(0, 3).map((order: any) => (
                        <div 
                          key={order.id}
                          className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                          data-testid={`order-item-${order.id}`}
                        >
                          <div className={`h-10 w-10 rounded-lg ${isDark ? "bg-gray-700" : "bg-white"} flex items-center justify-center`}>
                            <ShoppingBag className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{t('parentDashboard.order')} #{order.id?.slice(0, 8)}</p>
                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>₪{order.totalAmount}</p>
                          </div>
                          <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                            {order.status === "completed" ? t('parentDashboard.completed') : t('parentDashboard.processing')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referral" className="mt-6">
            <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-purple-500" />
                  {t('parentDashboard.referralProgram')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${isDark ? "bg-gradient-to-br from-purple-900/50 to-indigo-900/50" : "bg-gradient-to-br from-purple-500 to-indigo-600"} rounded-xl p-6 text-white mb-6`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                      <Gift className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{t('parentDashboard.earn100Points')}</h3>
                      <p className="text-sm opacity-90">{t('parentDashboard.perFriendSignup')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3">
                    <p className="flex-1 font-mono text-lg">{referralData?.referralCode || parentData?.uniqueCode || "..."}</p>
                    <Button 
                      variant="secondary"
                      size="sm"
                      onClick={() => copyCode(referralData?.referralCode || parentData?.uniqueCode || "")}
                      data-testid="button-copy-referral"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-3xl font-bold text-blue-500">{referralData?.totalReferrals || 0}</p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.totalReferrals')}</p>
                  </div>
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-3xl font-bold text-green-500">{referralData?.activeReferrals || 0}</p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.activeReferrals')}</p>
                  </div>
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-3xl font-bold text-purple-500">{referralData?.pointsEarned || 0}</p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.earnedFromReferrals')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-6 space-y-6">
            {/* Child Selector */}
            {childrenList.length > 1 && (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border"}`}>
                <Users className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span className={`text-sm font-medium flex-shrink-0 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t('parentDashboard.selectChild')}
                </span>
                <select
                  value={selectedReportChild}
                  onChange={(e) => setSelectedReportChild(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                  data-testid="select-report-child"
                >
                  <option value="all">{t('parentDashboard.allChildren')}</option>
                  {childrenList.map((child: any) => (
                    <option key={child.id} value={String(child.id)}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  {t('parentDashboard.childReports')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {childrenList.length > 0 ? (
                  <div className="space-y-6">
                    {(selectedReportChild === "all"
                      ? childrenList
                      : childrenList.filter((c: any) => String(c.id) === selectedReportChild)
                    ).map((child: any) => (
                      <ChildReportCard key={child.id} child={child} token={token} isDark={isDark} t={t} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                      {t('parentDashboard.noChildren')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Annual Report Chart - shown when a single child is selected */}
            {selectedReportChild !== "all" && (
              <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    {t('parentDashboard.annualReport')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnnualReportChart childId={selectedReportChild} isParentView={true} />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowQR(false)}>
          <div 
            className={`${isDark ? "bg-gray-900" : "bg-white"} rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{t('parentDashboard.qrCode')}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowQR(false)}>
                <span className="text-xl">&times;</span>
              </Button>
            </div>
            <div className={`${isDark ? "bg-white" : "bg-gray-100"} p-6 rounded-xl inline-block mb-4`}>
              <QRCodeSVG value={parentData?.uniqueCode || "PARENT"} size={180} />
            </div>
            <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t('parentDashboard.scanWithChild')}
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <p className="text-2xl font-mono font-bold text-blue-500 tracking-widest">
                {showLinkCode 
                  ? (parentData?.uniqueCode || "...") 
                  : (parentData?.uniqueCode ? "●".repeat(parentData.uniqueCode.length) : "...")}
              </p>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowLinkCode(!showLinkCode)}
                data-testid="button-toggle-code-modal"
              >
                {showLinkCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => copyCode(parentData?.uniqueCode || "")}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={() => setShowQR(false)} className="w-full" data-testid="button-close-qr">
              {t('parentDashboard.closeQR')}
            </Button>
          </div>
        </div>
      )}

      {/* Child Games Control Dialog */}
      {gamesChild && (
        <ChildGamesControl
          childId={gamesChild.id}
          childName={gamesChild.name}
          token={token || ""}
          onClose={() => setGamesChild(null)}
        />
      )}
    </div>
  );
};
