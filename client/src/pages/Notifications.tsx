import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { getDateLocale } from "@/i18n/config";
import { apiRequest, authenticatedFetch } from "@/lib/queryClient";
import { Check, X, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";

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

export const Notifications = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
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

  const notifications = Array.isArray(notificationsPage?.items) ? notificationsPage!.items : [];
  const total = notificationsPage?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("POST", `/api/parent/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
    },
  });

  const respondToLoginMutation = useMutation({
    mutationFn: async ({ notificationId, action }: { notificationId: string; action: "approve" | "reject" }) => {
      return apiRequest("POST", `/api/parent/notifications/${notificationId}/respond-login`, { action });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      toast({
        title: variables.action === "approve" ? t("notificationsPage.accepted") : "تم الرفض",
        description: variables.action === "approve" 
          ? "تم إرسال الكود للطفل. أخبره برمز PIN الخاص به."
          : "تم رفض طلب تسجيل الدخول.",
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/parent/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/notifications/unread-count"] });
      toast({
        title: t("notificationsPage.markedAsLearned"),
        description: "تم تعليم جميع الإشعارات كمقروءة",
      });
    },
  });

  const copyCode = (code: string, notificationId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(notificationId);
    toast({ title: "تم نسخ الكود" });
    setTimeout(() => setCopiedCode(null), 2000);
  };


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "deposit_approved":
      case "deposit_rejected":
      case "deposit_request":
        return "💳";
      case "purchase_request":
      case "purchase_approved":
      case "purchase_rejected":
      case "purchase_paid":
        return "🛍️";
      case "task":
      case "task_assigned":
      case "task_completed":
      case "task_reminder":
        return "📝";
      case "points_earned":
      case "points_adjustment":
      case "referral_reward":
        return "⭐";
      case "order_placed":
      case "order_confirmed":
      case "order_shipped":
      case "order_delivered":
      case "order_rejected":
      case "shipment_requested":
      case "shipping_update":
        return "📦";
      case "security_alert":
      case "login_code_request":
      case "login_rejected":
        return "🔐";
      case "gift_unlocked":
      case "gift_activated":
      case "product_assigned":
      case "reward":
      case "reward_unlocked":
        return "🎁";
      case "child_linked":
      case "child_activity":
      case "child_logout":
        return "👨‍👩‍👧";
      default:
        return "🔔";
    }
  };

  const isLoginRequest = (type: string) => type === "login_code_request";

  const handleNotificationClick = (notification: any) => {
    markReadMutation.mutate(notification.id);
    switch (notification.type) {
      case "deposit_approved":
      case "deposit_rejected":
      case "deposit_request":
        navigate("/wallet");
        break;
      case "purchase_request":
      case "purchase_approved":
      case "purchase_rejected":
      case "purchase_paid":
      case "order_placed":
      case "order_confirmed":
      case "order_shipped":
      case "order_delivered":
      case "order_rejected":
      case "shipment_requested":
      case "shipping_update":
        navigate("/parent-store");
        break;
      case "task":
      case "task_assigned":
      case "task_completed":
      case "task_reminder":
        navigate("/parent-tasks");
        break;
      case "points_earned":
      case "points_adjustment":
      case "referral_reward":
        navigate("/parent-dashboard");
        break;
      default:
        break;
    }
  };

  const unreadCount = typeof unreadCountData?.count === "number"
    ? unreadCountData.count
    : notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              🔔 الإشعارات
            </h1>
            {unreadCount > 0 && (
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                لديك {unreadCount} إشعارات جديدة
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <LanguageSelector />
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markAllReadMutation.isPending ? "جارٍ التعليم..." : "تعليم الكل كمقروء"}
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold"
            >
              ← رجوع
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification: any) => {
              const metadata = notification.metadata || {};
              const isLogin = isLoginRequest(notification.type);
              const parentCode = metadata.parentCode;
              
              return (
                <div
                  key={notification.id}
                  className={`${
                    isDark ? "bg-gray-800" : "bg-white"
                  } rounded-lg p-4 shadow transition-all ${
                    !notification.isRead ? (isDark ? "border-r-4 border-blue-500" : "border-r-4 border-blue-500") : ""
                  }`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex gap-3 sm:gap-4">
                    <span className="text-2xl sm:text-3xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p
                          className={`font-bold text-sm sm:text-base ${
                            isDark ? "text-white" : "text-gray-800"
                          }`}
                        >
                          {notification.title || notification.message?.split('\n')[0]}
                        </p>
                        {!notification.isRead && (
                          <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full shrink-0">
                            جديد
                          </span>
                        )}
                      </div>
                      
                      <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"} whitespace-pre-line`}>
                        {notification.message}
                      </p>
                      
                      <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"} mt-2`}>
                        {new Date(notification.createdAt).toLocaleDateString(getDateLocale(), {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      
                      {isLogin && parentCode && (
                        <div className="mt-4 space-y-3">
                          <div className={`flex items-center gap-2 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                            <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>كود الربط:</span>
                            <span className="font-mono font-bold text-lg text-orange-500">{parentCode}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyCode(parentCode, notification.id); }}
                              className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                copiedCode === notification.id 
                                  ? "bg-green-500 text-white" 
                                  : isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-200 hover:bg-gray-300"
                              }`}
                              data-testid={`button-copy-code-${notification.id}`}
                            >
                              {copiedCode === notification.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                respondToLoginMutation.mutate({ notificationId: notification.id, action: "approve" });
                              }}
                              disabled={respondToLoginMutation.isPending}
                              className="flex-1 min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                              data-testid={`button-approve-${notification.id}`}
                            >
                              {respondToLoginMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-5 h-5" />
                                  موافقة
                                </>
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                respondToLoginMutation.mutate({ notificationId: notification.id, action: "reject" });
                              }}
                              disabled={respondToLoginMutation.isPending}
                              className="flex-1 min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                              data-testid={`button-reject-${notification.id}`}
                            >
                              {respondToLoginMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <>
                                  <X className="w-5 h-5" />
                                  رفض
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {!isLogin && (
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className={`mt-3 text-sm ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                        >
                          اضغط للانتقال ←
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 text-center shadow`}>
              <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                لا توجد إشعارات حالياً ✨
              </p>
            </div>
          )}
        </div>

        {total > pageSize && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>

            <p className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium`}>
              صفحة {page} من {totalPages}
            </p>

            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
