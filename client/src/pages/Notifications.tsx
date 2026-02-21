import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest, authenticatedFetch } from "@/lib/queryClient";
import { getRelativeTimeAr, getLoginRequestStatusInfo } from "@/lib/relativeTime";
import { Check, X, Copy, Loader2, ChevronRight, ArrowRight } from "lucide-react";
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

/* ─── Icon config ─── */
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

export const Notifications = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const { data: notificationsPage } = useQuery<NotificationPage>({
    queryKey: ["/api/parent/notifications", page, pageSize],
    queryFn: () =>
      authenticatedFetch<NotificationPage>(
        `/api/parent/notifications?includeMeta=1&limit=${pageSize}&offset=${offset}`
      ),
    enabled: !!token,
    refetchInterval: token ? 5000 : false,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/parent/notifications/unread-count"],
    queryFn: () => authenticatedFetch<{ count: number }>("/api/parent/notifications/unread-count"),
    enabled: !!token,
    refetchInterval: token ? 5000 : false,
  });

  const allNotifications = Array.isArray(notificationsPage?.items) ? notificationsPage!.items : [];
  const displayNotifications = filter === "unread"
    ? allNotifications.filter(n => !n.isRead)
    : allNotifications;
  const total = notificationsPage?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const unreadCount = unreadCountData?.count || 0;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/parent/notifications/${id}/read`),
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

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/parent/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      toast({ title: t("notifications.markedAllRead") });
    },
  });

  // IntersectionObserver: auto-mark-read when notifications become visible
  const listRef = useRef<HTMLDivElement>(null);
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
      { threshold: 0.5 }
    );

    return observerRef.current;
  }, []);

  useEffect(() => {
    const obs = setupObserver();
    const timer = setTimeout(() => {
      const items = listRef.current?.querySelectorAll("[data-notif-id]");
      items?.forEach((el) => obs.observe(el));
    }, 150);
    return () => { clearTimeout(timer); obs.disconnect(); };
  }, [displayNotifications, setupObserver]);

  const copyCode = (code: string, notificationId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(notificationId);
    toast({ title: t("notifications.codeCopied") });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    const target = NAV_MAP[notification.type];
    if (target) navigate(target);
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#18191a]" : "bg-gray-100"}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
              className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-[#3a3b3c]" : "hover:bg-gray-200"}`}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("notifications.title")}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                isDark ? "text-blue-400 hover:bg-[#3a3b3c]" : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              {markAllReadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("notifications.markAllAsRead")}
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setFilter("all"); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === "all"
                ? isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white"
                : isDark ? "bg-[#3a3b3c] text-gray-300 hover:bg-[#4e4f50]" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {t("notifications.all")}
          </button>
          <button
            onClick={() => { setFilter("unread"); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === "unread"
                ? isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white"
                : isDark ? "bg-[#3a3b3c] text-gray-300 hover:bg-[#4e4f50]" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {t("notifications.unread")} {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Notifications list */}
        <div ref={listRef} className={`rounded-xl overflow-hidden ${isDark ? "bg-[#242526]" : "bg-white"} shadow-sm`}>
          {displayNotifications.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-5xl mb-4">🔔</div>
              <p className={`text-base font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {filter === "unread" ? t("notifications.noUnreadNotifications") : t("notifications.noNotifications")}
              </p>
            </div>
          ) : (
            displayNotifications.map((notification) => {
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
                  className={`flex items-start gap-3 px-4 py-3 transition-colors duration-150 border-b last:border-b-0 ${
                    isDark ? "border-gray-700/50" : "border-gray-100"
                  } ${!notification.isRead
                    ? isDark ? "bg-[#263951]" : "bg-blue-50/60"
                    : ""
                  } ${isClickable ? "cursor-pointer" : ""} ${
                    isDark ? "hover:bg-[#3a3b3c]" : "hover:bg-gray-50"
                  }`}
                  onClick={() => isClickable && handleNotificationClick(notification)}
                >
                  {/* Avatar icon */}
                  <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ${iconCfg.bg}`}>
                    {iconCfg.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${
                      !notification.isRead ? "font-semibold" : "font-normal"
                    } ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                      {notification.title && (
                        <span className={`${isDark ? "text-white" : "text-gray-900"}`}>
                          {notification.title}
                        </span>
                      )}
                      {notification.title && " — "}
                      <span className={isDark ? "text-gray-300" : "text-gray-600"}>
                        {notification.message}
                      </span>
                    </p>

                    {/* Relative time */}
                    <p className={`text-xs mt-1 ${
                      !notification.isRead
                        ? "text-blue-500 font-semibold"
                        : isDark ? "text-gray-500" : "text-gray-400"
                    }`}>
                      {getRelativeTimeAr(notification.createdAt)}
                    </p>

                    {/* Login request status badge */}
                    {isLogin && loginStatus !== "pending" && (
                      <div className="mt-2">
                        {(() => {
                          const statusInfo = getLoginRequestStatusInfo(loginStatus);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.color} ${statusInfo.bgColor}`}>
                              {statusInfo.icon} {statusInfo.label}
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    {/* Login request: approve/reject buttons (only when pending) */}
                    {isLogin && canRespond && (
                      <div className="mt-3 space-y-2">
                        {parentCode && (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                            isDark ? "bg-[#3a3b3c]" : "bg-gray-100"
                          }`}>
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("notifications.linkCode")}</span>
                            <span className="font-mono font-bold text-lg text-orange-500">{parentCode}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyCode(parentCode, notification.id); }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                copiedCode === notification.id
                                  ? "bg-green-500 text-white"
                                  : isDark ? "bg-gray-600 hover:bg-gray-500 text-gray-300" : "bg-gray-200 hover:bg-gray-300"
                              }`}
                            >
                              {copiedCode === notification.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); respondToLoginMutation.mutate({ notificationId: notification.id, action: "approve" }); }}
                            disabled={respondToLoginMutation.isPending}
                            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {respondToLoginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> {t("notifications.approve")}</>}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); respondToLoginMutation.mutate({ notificationId: notification.id, action: "reject" }); }}
                            disabled={respondToLoginMutation.isPending}
                            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {respondToLoginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> {t("notifications.reject")}</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Navigation hint */}
                    {isClickable && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isDark ? "text-blue-400" : "text-blue-500"}`}>
                        <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                        <span>{t("notifications.clickToNavigate")}</span>
                      </div>
                    )}
                  </div>

                  {/* Unread blue dot */}
                  {!notification.isRead && (
                    <div className="shrink-0 mt-5">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 ${
                isDark
                  ? "bg-[#3a3b3c] text-white hover:bg-[#4e4f50]"
                  : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              }`}
            >
              {t("notifications.previous")}
            </button>

            <span className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 ${
                isDark
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
              }`}
            >
              {t("notifications.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
