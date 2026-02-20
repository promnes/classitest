import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { authenticatedFetch, apiRequest } from "@/lib/queryClient";
import { Bell, X, Check, Copy, Loader2, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDateLocale } from "@/i18n/config";

type NotificationItem = {
  id: string;
  type: string;
  title?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any> | null;
};

type NotificationPage = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "deposit_approved": case "deposit_rejected": case "deposit_request": return "💳";
    case "purchase_request": case "purchase_approved": case "purchase_rejected": case "purchase_paid": return "🛍️";
    case "task": case "task_assigned": case "task_completed": case "task_reminder": return "📝";
    case "points_earned": case "points_adjustment": case "referral_reward": return "⭐";
    case "order_placed": case "order_confirmed": case "order_shipped": case "order_delivered": case "order_rejected": case "shipment_requested": case "shipping_update": return "📦";
    case "security_alert": case "login_code_request": case "login_rejected": return "🔐";
    case "gift_unlocked": case "gift_activated": case "product_assigned": case "reward": case "reward_unlocked": return "🎁";
    case "child_linked": case "child_activity": case "child_logout": return "👨‍👩‍👧";
    case "broadcast": case "system_alert": return "📢";
    case "new_referral": return "👥";
    case "withdrawal_approved": case "withdrawal_rejected": return "💰";
    default: return "🔔";
  }
};

const getNavigationTarget = (type: string): string | null => {
  switch (type) {
    case "deposit_approved": case "deposit_rejected": case "deposit_request":
    case "withdrawal_approved": case "withdrawal_rejected":
      return "/wallet";
    case "purchase_request": case "purchase_approved": case "purchase_rejected": case "purchase_paid":
    case "order_placed": case "order_confirmed": case "order_shipped": case "order_delivered": case "order_rejected":
    case "shipment_requested": case "shipping_update":
      return "/parent-store";
    case "task": case "task_assigned": case "task_completed": case "task_reminder":
      return "/parent-tasks";
    case "points_earned": case "points_adjustment": case "referral_reward": case "new_referral":
    case "child_linked": case "child_activity": case "child_logout":
    case "low_points_warning":
      return "/parent-dashboard";
    case "gift_unlocked": case "gift_activated": case "product_assigned": case "reward": case "reward_unlocked":
      return "/parent-dashboard";
    case "security_alert": case "login_rejected":
      return "/settings";
    default:
      return null;
  }
};

export function ParentNotificationBell() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");

  const { data: notificationsPage } = useQuery<NotificationPage>({
    queryKey: ["/api/parent/notifications", 1, 20],
    queryFn: () => authenticatedFetch<NotificationPage>("/api/parent/notifications?includeMeta=1&limit=20&offset=0"),
    enabled: !!token,
    refetchInterval: token ? 5000 : false,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/parent/notifications/unread-count"],
    queryFn: () => authenticatedFetch<{ count: number }>("/api/parent/notifications/unread-count"),
    enabled: !!token,
    refetchInterval: token ? 5000 : false,
  });

  const unreadCount = unreadCountData?.count || 0;
  const notifications = notificationsPage?.items || [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/parent/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/parent/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      toast({ title: "تم تعليم الكل كمقروء ✅" });
    },
  });

  const respondToLoginMutation = useMutation({
    mutationFn: ({ notificationId, action }: { notificationId: string; action: "approve" | "reject" }) =>
      apiRequest("POST", `/api/parent/notifications/${notificationId}/respond-login`, { action }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      toast({
        title: variables.action === "approve" ? "تم القبول ✅" : "تم الرفض ❌",
        description: variables.action === "approve" ? "تم إرسال الكود للطفل" : "تم رفض طلب تسجيل الدخول",
      });
    },
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notification: NotificationItem) => {
    markReadMutation.mutate(notification.id);
    const target = getNavigationTarget(notification.type);
    if (target) {
      setIsOpen(false);
      navigate(target);
    }
  };

  const copyCode = (code: string, notificationId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(notificationId);
    toast({ title: "تم نسخ الكود" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
        data-testid="button-notifications"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay Panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={() => setIsOpen(false)} role="presentation" />
          
          <div
            ref={panelRef}
            className={`fixed sm:absolute left-4 right-4 sm:ltr:left-auto sm:ltr:right-0 sm:rtl:right-auto sm:rtl:left-0 top-16 sm:top-full sm:mt-2 z-50 w-auto sm:w-[420px] max-h-[80vh] rounded-2xl shadow-2xl border overflow-hidden ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <h3 className="font-bold text-base flex items-center gap-2">
                🔔 الإشعارات
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${isDark ? "text-blue-400 hover:bg-gray-700" : "text-blue-600 hover:bg-blue-50"}`}
                    title="قراءة الكل"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[65vh] divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>لا توجد إشعارات ✨</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const metadata = notification.metadata || {};
                  const isLogin = notification.type === "login_code_request";
                  const parentCode = metadata.parentCode;
                  const navTarget = getNavigationTarget(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 transition-colors ${
                        !notification.isRead
                          ? isDark ? "bg-blue-900/20" : "bg-blue-50/70"
                          : ""
                      } ${navTarget && !isLogin ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : ""}`}
                      onClick={() => {
                        if (!isLogin && navTarget) handleNotificationClick(notification);
                      }}
                    >
                      <div className="flex gap-3">
                        <span className="text-xl shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
                              {notification.title || notification.message?.split('\n')[0]}
                            </p>
                            {!notification.isRead && (
                              <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {notification.message}
                          </p>
                          <p className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {new Date(notification.createdAt).toLocaleDateString(getDateLocale(), {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>

                          {/* Login request with code + approve/reject */}
                          {isLogin && parentCode && (
                            <div className="mt-2 space-y-2">
                              <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                                <span className={isDark ? "text-gray-300" : "text-gray-600"}>{t("notificationBell.code")}</span>
                                <span className="font-mono font-bold text-orange-500">{parentCode}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyCode(parentCode, notification.id); }}
                                  className={`p-1.5 rounded-md ${copiedCode === notification.id ? "bg-green-500 text-white" : isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"}`}
                                >
                                  {copiedCode === notification.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); respondToLoginMutation.mutate({ notificationId: notification.id, action: "approve" }); }}
                                  disabled={respondToLoginMutation.isPending}
                                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  {respondToLoginMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> موافقة</>}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); respondToLoginMutation.mutate({ notificationId: notification.id, action: "reject" }); }}
                                  disabled={respondToLoginMutation.isPending}
                                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                >
                                  {respondToLoginMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3" /> رفض</>}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Clickable navigation hint */}
                          {!isLogin && navTarget && (
                            <p className={`text-[10px] mt-1 ${isDark ? "text-blue-400" : "text-blue-500"}`}>
                              اضغط للانتقال ←
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer — View All */}
            <div className={`px-4 py-2.5 border-t text-center ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <button
                onClick={() => { setIsOpen(false); navigate("/notifications"); }}
                className={`text-sm font-semibold ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
              >
                عرض كل الإشعارات
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
