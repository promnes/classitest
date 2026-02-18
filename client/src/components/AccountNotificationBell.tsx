import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, X, CheckCheck } from "lucide-react";
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
    case "broadcast": case "system_alert": return "📢";
    case "new_user": case "new_registration": return "👤";
    case "new_order": return "🛒";
    case "payment_received": return "💰";
    default: return "🔔";
  }
};

interface AccountNotificationBellProps {
  tokenKey: string;
  apiBase: string;
  queryKeyPrefix: string;
  bellColorClass?: string;
}

function AccountNotificationBell({ tokenKey, apiBase, queryKeyPrefix, bellColorClass }: AccountNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem(tokenKey);

  const { data: notificationsPage } = useQuery<NotificationPage>({
    queryKey: [queryKeyPrefix + "-notifications"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?limit=20&offset=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || { items: [], total: 0, limit: 20, offset: 0, hasMore: false };
    },
    enabled: !!token,
    refetchInterval: token ? 5000 : false,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: [queryKeyPrefix + "-notifications-unread-count"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || { count: 0 };
    },
    enabled: !!token,
    refetchInterval: token ? 5000 : false,
  });

  const unreadCount = unreadCountData?.count || 0;
  const notifications = notificationsPage?.items || [];

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${apiBase}/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications-unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${apiBase}/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications"] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix + "-notifications-unread-count"] });
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

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
      >
        <Bell className={`h-5 w-5 ${bellColorClass || ""}`} />
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
          <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={() => setIsOpen(false)} />

          <div
            ref={panelRef}
            className={`fixed sm:absolute left-4 right-4 sm:ltr:left-auto sm:ltr:right-0 sm:rtl:right-auto sm:rtl:left-0 top-16 sm:top-full sm:mt-2 z-50 w-auto sm:w-[400px] max-h-[80vh] rounded-2xl shadow-2xl border overflow-hidden ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`}>
              <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
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
                  className={`p-1 rounded-lg ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
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
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 transition-colors cursor-pointer ${
                      !notification.isRead
                        ? isDark ? "bg-blue-900/20" : "bg-blue-50/70"
                        : ""
                    } hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                    onClick={() => markReadMutation.mutate(notification.id)}
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
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// === Exported Named Bells ===

export function LibraryNotificationBell() {
  return (
    <AccountNotificationBell
      tokenKey="libraryToken"
      apiBase="/api/library/notifications"
      queryKeyPrefix="library"
    />
  );
}

export function SchoolNotificationBell() {
  return (
    <AccountNotificationBell
      tokenKey="schoolToken"
      apiBase="/api/school/notifications"
      queryKeyPrefix="school"
    />
  );
}

export function TeacherNotificationBell() {
  return (
    <AccountNotificationBell
      tokenKey="teacherToken"
      apiBase="/api/teacher/notifications"
      queryKeyPrefix="teacher"
    />
  );
}

export function AdminNotificationBell() {
  return (
    <AccountNotificationBell
      tokenKey="adminToken"
      apiBase="/api/admin/own-notifications"
      queryKeyPrefix="admin"
    />
  );
}
