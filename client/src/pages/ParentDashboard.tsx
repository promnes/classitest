import { useEffect, useState, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest, authenticatedFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { ChildGamesControl } from "@/components/parent/ChildGamesControl";
import { GovernorateSelect } from "@/components/ui/GovernorateSelect";
import { ACADEMIC_GRADES } from "@shared/constants";

// Lazy-load heavy chart library (recharts ~200KB + framer-motion ~30KB)
const AnnualReportChart = lazy(() => import("@/components/AnnualReportChart").then(m => ({ default: m.AnnualReportChart })));
// Lazy-load QR code library
const QRCodeSVG = lazy(() => import("qrcode.react").then(m => ({ default: m.QRCodeSVG })));
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Package,
  Megaphone,
  ExternalLink,
  MousePointer,
  KeyRound,
  Search,
  User,
  X,
  School,
  GraduationCap,
  Heart
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

// Parse error message from apiRequest errors (format: "statusCode: {json}")
function extractErrorMessage(err: any): string {
  const raw = err?.message || "";
  try {
    const jsonPart = raw.substring(raw.indexOf("{"));
    if (jsonPart) {
      const parsed = JSON.parse(jsonPart);
      return parsed?.message || parsed?.error || raw;
    }
  } catch {}
  return raw;
}

export const ParentDashboard = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const [cartCount, setCartCount] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showLinkCode, setShowLinkCode] = useState(false);
  const [gamesChild, setGamesChild] = useState<any>(null);
  const [selectedReportChild, setSelectedReportChild] = useState<string>("all");
  
  // PIN management state
  const [showAddChildPin, setShowAddChildPin] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildPin, setNewChildPin] = useState("");
  const [newChildBirthday, setNewChildBirthday] = useState("");
  const [newChildGovernorate, setNewChildGovernorate] = useState("");
  const [newChildGrade, setNewChildGrade] = useState("");
  const [addChildStep, setAddChildStep] = useState(1);
  const [newChildSchoolSearch, setNewChildSchoolSearch] = useState("");
  const [newChildSchoolId, setNewChildSchoolId] = useState("");
  const [newChildSchoolName, setNewChildSchoolName] = useState("");
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [pinTargetChild, setPinTargetChild] = useState<any>(null);
  const [childPinValue, setChildPinValue] = useState("");
  const [showSetMyPin, setShowSetMyPin] = useState(false);
  const [myPinValue, setMyPinValue] = useState("");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // School search for child creation
  const { data: schoolSuggestions } = useQuery({
    queryKey: ["/api/public/schools", newChildGovernorate, newChildSchoolSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (newChildGovernorate) params.set("governorate", newChildGovernorate);
      if (newChildSchoolSearch) params.set("search", newChildSchoolSearch);
      params.set("limit", "10");
      const res = await fetch(`/api/public/schools?${params}`);
      const json = await res.json();
      return json.data?.schools || [];
    },
    enabled: addChildStep === 2 && (!!newChildGovernorate || newChildSchoolSearch.length >= 2),
    staleTime: 30000,
  });

  // Dashboard search
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["/api/search", dashboardSearch],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/search?q=${encodeURIComponent(dashboardSearch)}&type=all&limit=8`);
      const json = await res.json();
      return json.data || { schools: [], teachers: [], tasks: [] };
    },
    enabled: dashboardSearch.length >= 2,
    staleTime: 15000,
  });

  // Optimized polling: reduced frequencies to minimize network load
  // Critical data: 30s | Secondary data: 60s | Rarely changing: 5min
  const { data: parentInfo } = useQuery({
    queryKey: ["/api/parent/info"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: children } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: wallet } = useQuery({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/parent/notifications", "dashboard", 3],
    queryFn: () => authenticatedFetch("/api/parent/notifications?includeMeta=1&limit=3&offset=0"),
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: unreadNotificationsData } = useQuery<{ count: number }>({
    queryKey: ["/api/parent/notifications/unread-count"],
    queryFn: () => authenticatedFetch<{ count: number }>("/api/parent/notifications/unread-count"),
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: childrenStatus } = useQuery({
    queryKey: ["/api/parent/children/status"],
    enabled: !!token,
    refetchInterval: token ? 300000 : false,
    staleTime: 300000,
  });

  const { data: referralStats } = useQuery({
    queryKey: ["/api/parent/referral-stats"],
    enabled: !!token,
    refetchInterval: token ? 120000 : false,
    staleTime: 120000,
  });

  const { data: parentAds } = useQuery({
    queryKey: ["/api/parent/ads"],
    enabled: !!token,
    refetchInterval: token ? 300000 : false,
    staleTime: 300000,
  });

  const { data: familyPinStatus } = useQuery({
    queryKey: ["/api/auth/family-pin-status"],
    enabled: !!token,
    staleTime: 60000,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["/api/parent/store/orders"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: ownedProducts } = useQuery({
    queryKey: ["/api/parent/owned-products"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/parent/tasks"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!token,
    refetchInterval: token ? 300000 : false,
    staleTime: 300000,
  });

  const { data: tasksBySubject } = useQuery({
    queryKey: ["/api/parent/tasks/by-subject"],
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
    staleTime: 60000,
  });

  const { data: purchaseRequests } = useQuery({
    queryKey: ["/api/parent/purchase-requests"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { toast } = useToast();

  const purchaseDecisionMutation = useMutation({
    mutationFn: async ({ requestId, decision, shippingAddress }: { requestId: string; decision: "approve" | "reject"; shippingAddress?: string }) => {
      return apiRequest("PATCH", `/api/parent/purchase-requests/${requestId}/decision`, {
        decision,
        shippingAddress,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
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

  // PIN mutations
  const addChildWithPinMutation = useMutation({
    mutationFn: async ({ childName, pin }: { childName: string; pin: string }) => {
      const res = await apiRequest("POST", "/api/auth/add-child-with-pin", {
        childName,
        pin,
        birthday: newChildBirthday || undefined,
        governorate: newChildGovernorate || undefined,
        academicGrade: newChildGrade || undefined,
        schoolId: newChildSchoolId || undefined,
        schoolName: newChildSchoolName || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/family-pin-status"] });
      setShowAddChildPin(false);
      setNewChildName("");
      setNewChildPin("");
      setNewChildBirthday("");
      setNewChildGovernorate("");
      setNewChildGrade("");
      setNewChildSchoolSearch("");
      setNewChildSchoolId("");
      setNewChildSchoolName("");
      setAddChildStep(1);
      toast({ title: "تم إضافة الطفل بنجاح ✅", description: "يمكنه الآن الدخول برمز PIN" });
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      toast({ title: "خطأ", description: msg || "فشل إضافة الطفل", variant: "destructive" });
    },
  });

  const setChildPinMutation = useMutation({
    mutationFn: async ({ childId, pin }: { childId: number; pin: string }) => {
      const res = await apiRequest("PUT", "/api/auth/set-child-pin", { childId, pin });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/family-pin-status"] });
      setShowSetPinModal(false);
      setPinTargetChild(null);
      setChildPinValue("");
      toast({ title: "تم تعيين رمز PIN ✅" });
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      toast({ title: "خطأ", description: msg || "فشل تعيين الرمز", variant: "destructive" });
    },
  });

  const setMyPinMutation = useMutation({
    mutationFn: async ({ pin }: { pin: string }) => {
      const res = await apiRequest("PUT", "/api/auth/set-pin", { pin });
      return res.json();
    },
    onSuccess: (data: any) => {
      const payload = data?.data || data;
      if (payload?.familyCode) {
        localStorage.setItem("familyCode", payload.familyCode);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/family-pin-status"] });
      setShowSetMyPin(false);
      setMyPinValue("");
      toast({ title: "تم تعيين رمز PIN الخاص بك ✅" });
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      toast({ title: "خطأ", description: msg || "فشل تعيين الرمز", variant: "destructive" });
    },
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const notificationsList = Array.isArray((notifications as any)?.items)
    ? (notifications as any).items
    : Array.isArray(notifications)
    ? notifications
    : [];
  const childrenList = Array.isArray(children) ? children : [];
  const tasksList = Array.isArray(tasks) ? tasks : [];
  const subjectsList = Array.isArray(subjects) ? subjects : [];
  const tasksBySubjectList = Array.isArray(tasksBySubject) ? tasksBySubject : [];
  const ordersList = Array.isArray(recentOrders) ? recentOrders : (recentOrders as any)?.data || [];
  const ownedProductsList = Array.isArray(ownedProducts) ? ownedProducts : (ownedProducts as any)?.data || [];
  const purchaseRequestsList = Array.isArray(purchaseRequests) ? purchaseRequests : [];
  const availableInventoryCount = ownedProductsList.filter((p: any) => p.status === "active").length;
  const activeOrdersCount = ordersList.filter((o: any) => !["FAILED", "REFUNDED"].includes(o.status)).length;
  const pendingPurchaseRequests = purchaseRequestsList.filter((r: any) => r.status === "pending");
  const parentData = parentInfo as any || {};
  const walletData = wallet as any || {};
  const referralData = (referralStats as any)?.data || referralStats as any || {};
  const parentAdsList = Array.isArray((parentAds as any)?.data) ? (parentAds as any).data : Array.isArray(parentAds) ? parentAds : [];
  const statusData = childrenStatus as any || {};
  const pinData = (familyPinStatus as any)?.data || familyPinStatus as any || {};

  const unreadNotifications = typeof unreadNotificationsData?.count === "number"
    ? unreadNotificationsData.count
    : notificationsList.filter((n: any) => !n.isRead).length || 0;
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
            <ParentNotificationBell />
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <LanguageSelector />
            <PWAInstallButton variant="ghost" size="icon" showText={false} />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} data-testid="button-settings">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/parent-profile")} data-testid="button-profile">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowLogoutConfirm(true)} className="text-red-500 hover:text-red-600" data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>

            <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('parentDashboard.logoutTitle', 'تسجيل الخروج')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('parentDashboard.logoutConfirm', 'هل أنت متأكد أنك تريد تسجيل الخروج؟')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel', 'إلغاء')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
                    {t('parentDashboard.logout', 'تسجيل الخروج')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Search Box */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="relative">
          <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
          <input
            type="text"
            value={dashboardSearch}
            onChange={(e) => {
              setDashboardSearch(e.target.value);
              setShowSearchResults(e.target.value.length >= 2);
            }}
            onFocus={() => dashboardSearch.length >= 2 && setShowSearchResults(true)}
            placeholder="ابحث عن مدارس، معلمين، مهام..."
            className={`w-full pr-10 pl-10 py-2.5 rounded-xl border-2 text-sm focus:outline-none focus:border-blue-400 transition-colors ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"}`}
          />
          {dashboardSearch && (
            <button onClick={() => { setDashboardSearch(""); setShowSearchResults(false); }} className="absolute left-3 top-1/2 -translate-y-1/2">
              <X className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && dashboardSearch.length >= 2 && (
          <div className={`mt-1 rounded-xl border shadow-2xl max-h-80 overflow-y-auto z-50 relative ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
            {searchLoading && (
              <p className={`text-center py-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>جارٍ البحث...</p>
            )}

            {/* Schools */}
            {searchResults?.schools?.length > 0 && (
              <div>
                <p className={`px-3 pt-2 pb-1 text-xs font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>🏫 مدارس</p>
                {searchResults.schools.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => { navigate(`/school/${s.id}`); setShowSearchResults(false); setDashboardSearch(""); }}
                    className={`w-full text-right px-3 py-2.5 flex items-center gap-3 hover:bg-blue-500 hover:text-white transition-colors ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    <School className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs opacity-70">{s.governorate || ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Teachers */}
            {searchResults?.teachers?.length > 0 && (
              <div>
                <p className={`px-3 pt-2 pb-1 text-xs font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>👨‍🏫 معلمون</p>
                {searchResults.teachers.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => { navigate(`/teacher/${t.id}`); setShowSearchResults(false); setDashboardSearch(""); }}
                    className={`w-full text-right px-3 py-2.5 flex items-center gap-3 hover:bg-blue-500 hover:text-white transition-colors ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    <GraduationCap className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs opacity-70">{t.subject || ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Tasks */}
            {searchResults?.tasks?.length > 0 && (
              <div>
                <p className={`px-3 pt-2 pb-1 text-xs font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>📝 مهام</p>
                {searchResults.tasks.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => { navigate(`/teacher/${t.teacherId}`); setShowSearchResults(false); setDashboardSearch(""); }}
                    className={`w-full text-right px-3 py-2.5 flex items-center gap-3 hover:bg-blue-500 hover:text-white transition-colors ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    <BookOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs opacity-70">{t.subjectLabel || ""} • {t.price} ر.س</p>
                    </div>
                    <Heart className="h-3 w-3 opacity-50 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {!searchLoading && searchResults && !searchResults.schools?.length && !searchResults.teachers?.length && !searchResults.tasks?.length && (
              <p className={`text-center py-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>لا توجد نتائج لـ "{dashboardSearch}"</p>
            )}
          </div>
        )}
      </div>

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                            {request.product?.image ? (
                              <img src={request.product.image} alt="" className="h-10 w-10 object-cover rounded" />
                            ) : (
                              <Package className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {request.child?.name}
                              </span>
                              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {t('parentDashboard.wantsToBuy')}
                              </span>
                            </div>
                            <p className={`font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                              {request.product?.nameAr || request.product?.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <Star className="h-3 w-3 ml-1" />
                                {request.pointsPrice} {t('parentDashboard.points')}
                              </Badge>
                              {request.libraryProductId && (
                                <Badge className="bg-purple-100 text-purple-700">
                                  {t('parentDashboard.library')}
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
                              decision: "approve",
                              shippingAddress: parentData.address || "منزل"
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
                              decision: "reject"
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
                          ["task_completed", "task", "task_assigned", "task_reminder"].includes(notif.type) ? "bg-green-100 text-green-600" :
                          ["gift_activated", "gift_unlocked", "reward", "reward_unlocked", "product_assigned"].includes(notif.type) ? "bg-purple-100 text-purple-600" :
                          ["points_earned", "points_adjustment", "referral_reward"].includes(notif.type) ? "bg-yellow-100 text-yellow-600" :
                          "bg-blue-100 text-blue-600"
                        }`}>
                          {["task_completed", "task", "task_assigned", "task_reminder"].includes(notif.type) ? <Trophy className="h-5 w-5" /> :
                           ["gift_activated", "gift_unlocked", "reward", "reward_unlocked", "product_assigned"].includes(notif.type) ? <Gift className="h-5 w-5" /> :
                           ["points_earned", "points_adjustment", "referral_reward"].includes(notif.type) ? <Star className="h-5 w-5" /> :
                           <Bell className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{notif.title}</p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"} truncate`}>{notif.message || notif.body}</p>
                        </div>
                        {!notif.isRead && <Badge variant="secondary" className="bg-blue-500 text-white text-xs">{t('parentDashboard.new')}</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="children" className="mt-6 space-y-4">
            {/* PIN Status Card */}
            <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-amber-500" />
                    <span className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                      رمز PIN العائلي
                    </span>
                    {pinData?.parentHasPin ? (
                      <Badge variant="default" className="bg-green-500 text-xs">✓ مفعّل</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">غير مفعّل</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowSetMyPin(true)} 
                      variant={pinData?.parentHasPin ? "outline" : "default"} 
                      size="sm" 
                      className="gap-1"
                    >
                      <KeyRound className="h-3 w-3" />
                      {pinData?.parentHasPin ? "تغيير PIN" : "تعيين PIN"}
                    </Button>
                    <Button onClick={() => setShowAddChildPin(true)} size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />
                      إضافة طفل
                    </Button>
                  </div>
                </div>
                {pinData?.familyCode && (
                  <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    رمز العائلة: {pinData.familyCode}
                  </p>
                )}
              </CardContent>
            </Card>

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
                                {(() => {
                                  const pinChild = pinData?.children?.find((c: any) => c.id === child.id);
                                  return pinChild?.hasPin ? (
                                    <Badge variant="outline" className="text-xs gap-1 border-amber-400 text-amber-600">
                                      <KeyRound className="h-2.5 w-2.5" /> PIN
                                    </Badge>
                                  ) : null;
                                })()}
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
                            <Button 
                              onClick={() => { setPinTargetChild(child); setChildPinValue(""); setShowSetPinModal(true); }}
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              data-testid={`button-pin-${child.id}`}
                            >
                              <KeyRound className="h-4 w-4" />
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
                  {/* Visit Store */}
                  <button
                    onClick={() => navigate("/parent-store")}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white shadow-lg shadow-green-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98]"
                    data-testid="button-shop-now"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                        <ShoppingBag className="h-7 w-7" />
                      </div>
                      <span className="text-sm font-semibold tracking-wide">{t('parentDashboard.shopNow')}</span>
                    </div>
                  </button>

                  {/* My Inventory */}
                  <button
                    onClick={() => navigate("/parent-inventory")}
                    className={`group relative overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ring-1 ${isDark ? "bg-gray-800/80 ring-gray-700/50 hover:bg-gray-800" : "bg-white ring-gray-200/80 hover:ring-purple-200"}`}
                    data-testid="button-my-inventory"
                  >
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${isDark ? "bg-purple-500/15 group-hover:bg-purple-500/25" : "bg-purple-50 group-hover:bg-purple-100"}`}>
                          <Package className={`h-7 w-7 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                        </div>
                        {availableInventoryCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-violet-500 px-1.5 text-[11px] font-bold text-white shadow-lg shadow-purple-500/30 ring-2 ring-white dark:ring-gray-800">
                            {availableInventoryCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{t('parentDashboard.myInventory')}</span>
                    </div>
                  </button>

                  {/* Cart */}
                  <button
                    onClick={() => navigate("/parent-store?view=cart")}
                    className={`group relative overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ring-1 ${isDark ? "bg-gray-800/80 ring-gray-700/50 hover:bg-gray-800" : "bg-white ring-gray-200/80 hover:ring-blue-200"}`}
                    data-testid="button-cart"
                  >
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${isDark ? "bg-blue-500/15 group-hover:bg-blue-500/25" : "bg-blue-50 group-hover:bg-blue-100"}`}>
                          <ShoppingBag className={`h-7 w-7 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                        </div>
                        {cartCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-1.5 text-[11px] font-bold text-white shadow-lg shadow-blue-500/30 ring-2 ring-white dark:ring-gray-800">
                            {cartCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{t('parentDashboard.cart')}</span>
                    </div>
                  </button>

                  {/* My Orders */}
                  <button
                    onClick={() => navigate("/parent-store?view=orders")}
                    className={`group relative overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ring-1 ${isDark ? "bg-gray-800/80 ring-gray-700/50 hover:bg-gray-800" : "bg-white ring-gray-200/80 hover:ring-amber-200"}`}
                    data-testid="button-orders"
                  >
                    <div className="relative flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300 ${isDark ? "bg-amber-500/15 group-hover:bg-amber-500/25" : "bg-amber-50 group-hover:bg-amber-100"}`}>
                          <Clock className={`h-7 w-7 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                        </div>
                        {activeOrdersCount > 0 && (
                          <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 text-[11px] font-bold text-white shadow-lg shadow-amber-500/30 ring-2 ring-white dark:ring-gray-800">
                            {activeOrdersCount}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{t('parentDashboard.myOrders')}</span>
                    </div>
                  </button>
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

          <TabsContent value="referral" className="mt-6 space-y-6">
            {/* Referral Code & Share Section */}
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
                      <h3 className="text-xl font-bold">
                        {t('parentDashboard.earn100Points').replace('100', String(referralData?.settings?.pointsPerReferral || 100))}
                      </h3>
                      <p className="text-sm opacity-90">{t('parentDashboard.perFriendSignup')}</p>
                    </div>
                  </div>
                  {/* Referral Code */}
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3 mb-3">
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
                  {/* Referral Link - Visible */}
                  {referralData?.shareLink && (
                    <div className="bg-white/10 rounded-lg p-3 mb-3">
                      <p className="text-xs opacity-70 mb-1">{isRTL ? "رابط الإحالة الخاص بك:" : "Your referral link:"}</p>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 font-mono text-sm break-all select-all text-yellow-200" dir="ltr">
                          {referralData.shareLink}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(referralData.shareLink);
                            toast({ title: t('parentDashboard.linkCopied') || (isRTL ? "تم نسخ الرابط!" : "Link copied!") });
                          }}
                          data-testid="button-copy-referral-link"
                        >
                          {<Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Share Referral Link on Social Media */}
                  {referralData?.shareLink && (
                    <div className="space-y-2">
                      <p className="text-xs opacity-80">{t('parentDashboard.shareReferralCode')}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 bg-green-500 hover:bg-green-600 text-white border-0"
                          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(t('parentDashboard.referralShareText') + ' ' + referralData.shareLink)}`, '_blank')}
                        >
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 bg-blue-600 hover:bg-blue-700 text-white border-0"
                          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralData.shareLink)}`, '_blank')}
                        >
                          Facebook
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 bg-sky-500 hover:bg-sky-600 text-white border-0"
                          onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('parentDashboard.referralShareText') + ' ' + referralData.shareLink)}`, '_blank')}
                        >
                          X / Twitter
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 bg-blue-400 hover:bg-blue-500 text-white border-0"
                          onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralData.shareLink)}&text=${encodeURIComponent(t('parentDashboard.referralShareText'))}`, '_blank')}
                        >
                          Telegram
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(referralData.shareLink);
                            toast({ title: t('parentDashboard.linkCopied') });
                          }}
                        >
                          <Copy className="h-3 w-3" /> {t('parentDashboard.copyLink')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-2xl font-bold text-blue-500">{referralData?.totalReferrals || 0}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.totalReferrals')}</p>
                  </div>
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-2xl font-bold text-green-500">{referralData?.activeReferrals || 0}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.activeReferrals')}</p>
                  </div>
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-2xl font-bold text-purple-500">{referralData?.pointsEarned || 0}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.earnedFromReferrals')}</p>
                  </div>
                  <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} p-4 rounded-xl text-center`}>
                    <p className="text-2xl font-bold text-amber-500">{referralData?.totalAdSharePoints || 0}</p>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t('parentDashboard.adSharePoints')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ads Section */}
            {parentAdsList.length > 0 && (
              <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-500" />
                    {t('parentDashboard.adsToShare')}
                    <Badge variant="secondary" className="text-xs">
                      +{referralData?.settings?.pointsPerAdShare || 10} {t('parentDashboard.pointsPerShare')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parentAdsList.map((ad: any) => (
                      <div
                        key={ad.id}
                        className={`rounded-xl border p-4 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                      >
                        <div className="flex items-start gap-4">
                          {ad.imageUrl && (
                            <img
                              src={ad.imageUrl}
                              alt={ad.title}
                              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base mb-1">{ad.title}</h4>
                            <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {ad.content?.length > 120 ? ad.content.substring(0, 120) + "..." : ad.content}
                            </p>
                            {ad.linkUrl && (
                              <a
                                href={/^https?:\/\//i.test(ad.linkUrl) ? ad.linkUrl : `https://${ad.linkUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-3"
                                onClick={() => {
                                  fetch(`/api/ads/${ad.id}/click`, {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                }}
                              >
                                <ExternalLink className="h-3 w-3" /> {t('parentDashboard.viewAd')}
                              </a>
                            )}
                            {/* Share Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const safeLink = ad.linkUrl ? (/^https?:\/\//i.test(ad.linkUrl) ? ad.linkUrl : `https://${ad.linkUrl}`) : '';
                                return [
                                  { platform: "whatsapp", label: "WhatsApp", color: "bg-green-500 hover:bg-green-600", url: `https://wa.me/?text=${encodeURIComponent(ad.title + (safeLink ? ' ' + safeLink : ''))}` },
                                  { platform: "facebook", label: "Facebook", color: "bg-blue-600 hover:bg-blue-700", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(safeLink || window.location.origin)}` },
                                  { platform: "twitter", label: "X", color: "bg-gray-800 hover:bg-gray-900", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(ad.title + (safeLink ? ' ' + safeLink : ''))}` },
                                  { platform: "telegram", label: "Telegram", color: "bg-blue-400 hover:bg-blue-500", url: `https://t.me/share/url?url=${encodeURIComponent(safeLink || window.location.origin)}&text=${encodeURIComponent(ad.title)}` },
                                ];
                              })().map(({ platform, label, color, url }) => (
                                <Button
                                  key={platform}
                                  size="sm"
                                  className={`text-xs text-white border-0 ${color}`}
                                  onClick={() => {
                                    window.open(url, '_blank');
                                    fetch(`/api/parent/ads/${ad.id}/share`, {
                                      method: "POST",
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({ platform }),
                                    }).then(() => {
                                      queryClient.invalidateQueries({ queryKey: ["/api/parent/referral-stats"] });
                                      queryClient.invalidateQueries({ queryKey: ["/api/parent/ads"] });
                                      toast({ title: `+${referralData?.settings?.pointsPerAdShare || 10} ${t('parentDashboard.pointsEarned')}` });
                                    });
                                  }}
                                >
                                  {label}
                                </Button>
                              ))}
                            </div>
                            {ad.myShares > 0 && (
                              <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                {t('parentDashboard.sharedTimes', { count: ad.myShares })} — +{ad.mySharePoints} {t('parentDashboard.points')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
                  <Suspense fallback={<div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
                    <AnnualReportChart childId={selectedReportChild} isParentView={true} />
                  </Suspense>
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
              <Suspense fallback={<div className="w-[180px] h-[180px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
                <QRCodeSVG value={parentData?.uniqueCode || "PARENT"} size={180} />
              </Suspense>
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

      {/* Add Child with PIN Modal - Multi-Step */}
      {showAddChildPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <Plus className="h-5 w-5 text-blue-500" /> إضافة طفل جديد
            </h3>

            {/* Step indicators */}
            <div className="flex gap-2 mb-4">
              {[1, 2].map(step => (
                <div key={step} className={`flex-1 h-1.5 rounded-full transition-colors ${
                  step <= addChildStep ? "bg-blue-500" : isDark ? "bg-gray-700" : "bg-gray-200"
                }`} />
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {addChildStep === 1 && (
              <div className="space-y-4">
                <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>الخطوة 1: البيانات الأساسية</p>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    اسم الطفل *
                  </label>
                  <input
                    type="text"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="مثال: أحمد"
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    🔑 رمز PIN (4 أرقام) *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={newChildPin}
                    onChange={(e) => setNewChildPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    maxLength={4}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 text-center text-xl tracking-widest font-mono ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    سيستخدم الطفل هذا الرمز لدخول حسابه
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setAddChildStep(2)}
                    disabled={!newChildName.trim() || newChildPin.length < 4}
                    className="flex-1"
                  >
                    التالي →
                  </Button>
                  <Button variant="outline" onClick={() => { setShowAddChildPin(false); setNewChildName(""); setNewChildPin(""); setAddChildStep(1); }}>
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Academic Info (Optional) */}
            {addChildStep === 2 && (
              <div className="space-y-4">
                <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>الخطوة 2: معلومات إضافية (اختياري)</p>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    🎂 تاريخ الميلاد
                  </label>
                  <input
                    type="date"
                    value={newChildBirthday}
                    onChange={(e) => setNewChildBirthday(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    🏢 المحافظة
                  </label>
                  <GovernorateSelect
                    value={newChildGovernorate}
                    onChange={setNewChildGovernorate}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    🎓 السنة الدراسية
                  </label>
                  <select
                    value={newChildGrade}
                    onChange={(e) => setNewChildGrade(e.target.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    <option value="">اختر السنة الدراسية</option>
                    {ACADEMIC_GRADES.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    🏫 المدرسة
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newChildSchoolName || newChildSchoolSearch}
                      onChange={(e) => {
                        setNewChildSchoolSearch(e.target.value);
                        setNewChildSchoolId("");
                        setNewChildSchoolName("");
                      }}
                      placeholder={newChildGovernorate ? "ابحث عن المدرسة..." : "اختر المحافظة أولاً أو اكتب اسم المدرسة"}
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    />
                    {newChildSchoolId && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                    )}
                  </div>
                  {/* School suggestions dropdown */}
                  {newChildSchoolSearch && !newChildSchoolId && schoolSuggestions && schoolSuggestions.length > 0 && (
                    <div className={`mt-1 rounded-lg border shadow-lg max-h-32 overflow-y-auto ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                      {schoolSuggestions.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setNewChildSchoolId(s.id);
                            setNewChildSchoolName(s.name);
                            setNewChildSchoolSearch("");
                          }}
                          className={`w-full text-right px-3 py-2 text-sm hover:bg-blue-500 hover:text-white transition-colors ${isDark ? "text-gray-200" : "text-gray-800"}`}
                        >
                          {s.name} {s.governorate ? `(${s.governorate})` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    اكتب اسم المدرسة أو اختر من القائمة
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => addChildWithPinMutation.mutate({ childName: newChildName, pin: newChildPin })}
                    disabled={addChildWithPinMutation.isPending}
                    className="flex-1"
                  >
                    {addChildWithPinMutation.isPending ? "جاري الإضافة..." : "إضافة ✅"}
                  </Button>
                  <Button variant="outline" onClick={() => setAddChildStep(1)}>
                    ← رجوع
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Set Child PIN Modal */}
      {showSetPinModal && pinTargetChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <KeyRound className="h-5 w-5 text-amber-500" /> تعيين PIN لـ {pinTargetChild.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  رمز PIN جديد (4 أرقام)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={childPinValue}
                  onChange={(e) => setChildPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 text-center text-xl tracking-widest font-mono ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setChildPinMutation.mutate({ childId: pinTargetChild.id, pin: childPinValue })}
                  disabled={childPinValue.length < 4 || setChildPinMutation.isPending}
                  className="flex-1"
                >
                  {setChildPinMutation.isPending ? "جاري التعيين..." : "تعيين ✅"}
                </Button>
                <Button variant="outline" onClick={() => { setShowSetPinModal(false); setPinTargetChild(null); setChildPinValue(""); }}>
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set My PIN Modal */}
      {showSetMyPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <KeyRound className="h-5 w-5 text-amber-500" /> تعيين رمز PIN الخاص بك
            </h3>
            <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              رمز PIN يسمح لك بالدخول لحسابك بسرعة من نفس الجهاز
            </p>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  رمز PIN (4 أرقام)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={myPinValue}
                  onChange={(e) => setMyPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-400 text-center text-xl tracking-widest font-mono ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setMyPinMutation.mutate({ pin: myPinValue })}
                  disabled={myPinValue.length < 4 || setMyPinMutation.isPending}
                  className="flex-1"
                >
                  {setMyPinMutation.isPending ? "جاري التعيين..." : "تعيين ✅"}
                </Button>
                <Button variant="outline" onClick={() => { setShowSetMyPin(false); setMyPinValue(""); }}>
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
