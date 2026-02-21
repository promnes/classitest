import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { authenticatedFetch, apiRequest } from "@/lib/queryClient";
import { getRelativeTimeAr, getLoginRequestStatusInfo } from "@/lib/relativeTime";
import { Bell, X, Check, Copy, Loader2, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NotificationItem = {
  id: string;
  type: string;
  title?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any> | null;
  loginRequestStatus?: string;
};

type NotificationPage = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

/* ─── Icon config with colored circular backgrounds (Facebook-style) ─── */
const ICON_CONFIG: Record<string, { emoji: string; bg: string }> = {
  deposit_approved: { emoji: "💳", bg: "bg-emerald-500" },
  deposit_rejected: { emoji: "💳", bg: "bg-red-500" },
  deposit_request: { emoji: "💳", bg: "bg-yellow-500" },
  purchase_request: { emoji: "🛍️", bg: "bg-purple-500" },
  purchase_approved: { emoji: "🛍️", bg: "bg-emerald-500" },
  purchase_rejected: { emoji: "🛍️", bg: "bg-red-500" },
  purchase_paid: { emoji: "🛍️", bg: "bg-emerald-500" },
  task: { emoji: "📝", bg: "bg-blue-500" },
  task_assigned: { emoji: "📝", bg: "bg-blue-500" },
  task_completed: { emoji: "✅", bg: "bg-emerald-500" },
  task_reminder: { emoji: "⏰", bg: "bg-orange-500" },
  points_earned: { emoji: "⭐", bg: "bg-yellow-500" },
  points_adjustment: { emoji: "⭐", bg: "bg-yellow-500" },
  referral_reward: { emoji: "🎉", bg: "bg-pink-500" },
  order_placed: { emoji: "📦", bg: "bg-blue-500" },
  order_confirmed: { emoji: "📦", bg: "bg-emerald-500" },
  order_shipped: { emoji: "🚚", bg: "bg-indigo-500" },
  order_delivered: { emoji: "📦", bg: "bg-emerald-500" },
  order_rejected: { emoji: "📦", bg: "bg-red-500" },
  shipment_requested: { emoji: "📦", bg: "bg-indigo-500" },
  shipping_update: { emoji: "🚚", bg: "bg-indigo-500" },
  security_alert: { emoji: "🛡️", bg: "bg-red-500" },
  login_code_request: { emoji: "🔐", bg: "bg-amber-500" },
  login_rejected: { emoji: "🚫", bg: "bg-red-500" },
  gift_unlocked: { emoji: "🎁", bg: "bg-pink-500" },
  gift_activated: { emoji: "🎁", bg: "bg-pink-500" },
  product_assigned: { emoji: "🎁", bg: "bg-purple-500" },
  reward: { emoji: "🏆", bg: "bg-yellow-500" },
  reward_unlocked: { emoji: "🏆", bg: "bg-yellow-500" },
  child_linked: { emoji: "👨‍👩‍👧", bg: "bg-blue-500" },
  child_activity: { emoji: "👧", bg: "bg-cyan-500" },
  child_logout: { emoji: "👋", bg: "bg-gray-500" },
  broadcast: { emoji: "📢", bg: "bg-blue-600" },
  system_alert: { emoji: "⚙️", bg: "bg-gray-600" },
  new_referral: { emoji: "👥", bg: "bg-teal-500" },
  withdrawal_approved: { emoji: "💰", bg: "bg-emerald-500" },
  withdrawal_rejected: { emoji: "💰", bg: "bg-red-500" },
  low_points_warning: { emoji: "⚠️", bg: "bg-orange-500" },
  game_shared: { emoji: "🎮", bg: "bg-purple-500" },
};

const getIconConfig = (type: string) => ICON_CONFIG[type] || { emoji: "🔔", bg: "bg-gray-500" };

const NAV_MAP: Record<string, string> = {
  deposit_approved: "/wallet", deposit_rejected: "/wallet", deposit_request: "/wallet",
  withdrawal_approved: "/wallet", withdrawal_rejected: "/wallet",
  purchase_request: "/parent-store", purchase_approved: "/parent-store", purchase_rejected: "/parent-store",
  purchase_paid: "/parent-store", order_placed: "/parent-store", order_confirmed: "/parent-store",
  order_shipped: "/parent-store", order_delivered: "/parent-store", order_rejected: "/parent-store",
  shipment_requested: "/parent-store", shipping_update: "/parent-store",
  task: "/parent-tasks", task_assigned: "/parent-tasks", task_completed: "/parent-tasks",
  task_reminder: "/parent-tasks",
  points_earned: "/parent-dashboard", points_adjustment: "/parent-dashboard",
  referral_reward: "/parent-dashboard", new_referral: "/parent-dashboard",
  child_linked: "/parent-dashboard", child_activity: "/parent-dashboard",
  child_logout: "/parent-dashboard", low_points_warning: "/parent-dashboard",
  gift_unlocked: "/parent-dashboard", gift_activated: "/parent-dashboard",
  product_assigned: "/parent-dashboard", reward: "/parent-dashboard",
  reward_unlocked: "/parent-dashboard",
  security_alert: "/settings", login_rejected: "/settings",
  game_shared: "/child-profile",
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
    },
  });

  const respondToLoginMutation = useMutation({
    mutationFn: ({ notificationId, action }: { notificationId: string; action: "approve" | "reject" }) =>
      apiRequest("POST", `/api/parent/notifications/${notificationId}/respond-login`, { action }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      toast({
        title: variables.action === "approve" ? t("notifications.approved") : t("notifications.rejected"),
        description: variables.action === "approve" ? t("notifications.loginApproved") : t("notifications.loginRejected"),
      });
    },
    onError: () => {
      toast({ title: t("notifications.error"), description: t("notifications.tryAgain"), variant: "destructive" });
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

  // IntersectionObserver: auto-mark-read when notification scrolls into viewport
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedIds = useRef<Set<string>>(new Set());

  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observedIds.current.clear();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.notifId;
            const isRead = (entry.target as HTMLElement).dataset.notifRead === "true";
            if (id && !isRead && !observedIds.current.has(id)) {
              observedIds.current.add(id);
              markReadMutation.mutate(id);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    return observerRef.current;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const obs = setupObserver();
    // Small delay to allow DOM rendering
    const timer = setTimeout(() => {
      const items = panelRef.current?.querySelectorAll("[data-notif-id]");
      items?.forEach((el) => obs.observe(el));
    }, 100);
    return () => {
      clearTimeout(timer);
      obs.disconnect();
    };
  }, [isOpen, notifications, setupObserver]);

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    const target = NAV_MAP[notification.type];
    if (target) {
      setIsOpen(false);
      navigate(target);
    }
  };

  const copyCode = (code: string, notificationId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(notificationId);
    toast({ title: t("notifications.codeCopied") });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="relative">
      {/* Bell */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-all duration-200 ${
          isDark
            ? "hover:bg-gray-700 active:bg-gray-600"
            : "hover:bg-gray-100 active:bg-gray-200"
        }`}
        aria-label={t("notifications.title")}
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? "text-blue-500" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setIsOpen(false)} />

          <div
            ref={panelRef}
            className={`fixed sm:absolute left-2 right-2 sm:ltr:left-auto sm:ltr:right-0 sm:rtl:right-auto sm:rtl:left-0 top-14 sm:top-full sm:mt-2 z-50 w-auto sm:w-[380px] max-h-[85vh] rounded-xl overflow-hidden transition-all duration-200 ${
              isDark
                ? "bg-[#242526] border border-gray-700 shadow-[0_12px_28px_0_rgba(0,0,0,0.6)]"
                : "bg-white border border-gray-200 shadow-[0_12px_28px_0_rgba(0,0,0,0.15),0_2px_4px_0_rgba(0,0,0,0.08)]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("notifications.title")}
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      isDark
                        ? "text-blue-400 hover:bg-[#3a3b3c]"
                        : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {markAllReadMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <CheckCheck className="h-3.5 w-3.5" />
                        {t("notifications.markAllAsRead")}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1.5 rounded-full ${isDark ? "hover:bg-[#3a3b3c]" : "hover:bg-gray-100"}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto max-h-[70vh]">
              {notifications.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">🔔</div>
                  <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {t("notifications.noNotifications")}
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const isLogin = notification.type === "login_code_request";
                  const loginStatus = notification.loginRequestStatus || "pending";
                  const canRespond = isLogin && loginStatus === "pending";
                  const parentCode = notification.metadata?.parentCode;
                  const iconCfg = getIconConfig(notification.type);
                  const navTarget = NAV_MAP[notification.type];
                  const isClickable = !isLogin && !!navTarget;

                  return (
                    <div
                      key={notification.id}
                      data-notif-id={notification.id}
                      data-notif-read={String(notification.isRead)}
                      className={`flex items-start gap-3 px-4 py-2.5 transition-colors duration-150 ${
                        !notification.isRead
                          ? isDark ? "bg-[#263951]" : "bg-blue-50/80"
                          : ""
                      } ${isClickable ? "cursor-pointer" : ""} ${
                        isDark ? "hover:bg-[#3a3b3c]" : "hover:bg-gray-50"
                      }`}
                      onClick={() => isClickable && handleNotificationClick(notification)}
                    >
                      {/* Avatar icon */}
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${iconCfg.bg}`}>
                        {iconCfg.emoji}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-snug ${
                          !notification.isRead ? "font-semibold" : "font-normal"
                        } ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                          {notification.title && (
                            <span className={isDark ? "text-white" : "text-gray-900"}>
                              {notification.title}
                            </span>
                          )}
                          {notification.title && " — "}
                          <span className={isDark ? "text-gray-300" : "text-gray-600"}>
                            {notification.message}
                          </span>
                        </p>

                        {/* Relative time */}
                        <p className={`text-xs mt-0.5 ${
                          !notification.isRead
                            ? "text-blue-500 font-semibold"
                            : isDark ? "text-gray-500" : "text-gray-400"
                        }`}>
                          {getRelativeTimeAr(notification.createdAt)}
                        </p>

                        {/* Login request status badge */}
                        {isLogin && loginStatus !== "pending" && (
                          <div className="mt-1.5">
                            {(() => {
                              const statusInfo = getLoginRequestStatusInfo(loginStatus);
                              return (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color} ${statusInfo.bgColor}`}>
                                  {statusInfo.icon} {statusInfo.label}
                                </span>
                              );
                            })()}
                          </div>
                        )}

                        {/* Login request: approve/reject buttons (only when pending) */}
                        {isLogin && canRespond && (
                          <div className="mt-2 space-y-1.5">
                            {parentCode && (
                              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                                isDark ? "bg-[#3a3b3c]" : "bg-gray-100"
                              }`}>
                                <span className={isDark ? "text-gray-400" : "text-gray-500"}>{t("notifications.linkCode")}</span>
                                <span className="font-mono font-bold text-orange-500">{parentCode}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyCode(parentCode, notification.id); }}
                                  className={`p-1 rounded transition-colors ${
                                    copiedCode === notification.id
                                      ? "bg-green-500 text-white"
                                      : isDark ? "bg-gray-600 hover:bg-gray-500 text-gray-300" : "bg-gray-200 hover:bg-gray-300"
                                  }`}
                                >
                                  {copiedCode === notification.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); respondToLoginMutation.mutate({ notificationId: notification.id, action: "approve" }); }}
                                disabled={respondToLoginMutation.isPending}
                                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                              >
                                {respondToLoginMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> {t("notifications.approve")}</>}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); respondToLoginMutation.mutate({ notificationId: notification.id, action: "reject" }); }}
                                disabled={respondToLoginMutation.isPending}
                                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                              >
                                {respondToLoginMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3" /> {t("notifications.reject")}</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Unread blue dot */}
                      {!notification.isRead && (
                        <div className="shrink-0 mt-4">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className={`px-4 py-2.5 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <button
                onClick={() => { setIsOpen(false); navigate("/notifications"); }}
                className={`w-full text-center text-sm font-semibold py-1 rounded-lg transition-colors ${
                  isDark
                    ? "text-blue-400 hover:bg-[#3a3b3c]"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                {t("notifications.viewAll")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
