import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { getDateLocale } from "@/i18n/config";
import { MandatoryTaskModal } from "@/components/MandatoryTaskModal";
import { Bell, Gift, Star, Trophy, Target, CheckCircle, Clock, Gamepad2, ShoppingBag } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string | null;
  message: string;
  style: string;
  priority: string;
  soundAlert: boolean;
  vibration: boolean;
  relatedId: string | null;
  ctaAction: string | null;
  ctaTarget: string | null;
  metadata: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

const getNotificationConfig = (type: string, priority: string) => {
  const configs: Record<string, { icon: JSX.Element; bgColor: string; iconBg: string }> = {
    points_earned: { 
      icon: <Star className="w-6 h-6 text-white" />, 
      bgColor: "from-yellow-500 to-amber-500", 
      iconBg: "bg-yellow-500" 
    },
    reward_unlocked: { 
      icon: <Trophy className="w-6 h-6 text-white" />, 
      bgColor: "from-purple-500 to-pink-500", 
      iconBg: "bg-purple-500" 
    },
    product_assigned: { 
      icon: <Gift className="w-6 h-6 text-white" />, 
      bgColor: "from-pink-500 to-rose-500", 
      iconBg: "bg-pink-500" 
    },
    task_reminder: { 
      icon: <Clock className="w-6 h-6 text-white" />, 
      bgColor: "from-blue-500 to-cyan-500", 
      iconBg: "bg-blue-500" 
    },
    achievement: { 
      icon: <Trophy className="w-6 h-6 text-white" />, 
      bgColor: "from-green-500 to-emerald-500", 
      iconBg: "bg-green-500" 
    },
    daily_challenge: { 
      icon: <Target className="w-6 h-6 text-white" />, 
      bgColor: "from-orange-500 to-red-500", 
      iconBg: "bg-orange-500" 
    },
    goal_progress: { 
      icon: <Target className="w-6 h-6 text-white" />, 
      bgColor: "from-indigo-500 to-blue-500", 
      iconBg: "bg-indigo-500" 
    },
    gift_assigned: { 
      icon: <Gift className="w-6 h-6 text-white" />, 
      bgColor: "from-pink-500 to-rose-500", 
      iconBg: "bg-pink-500" 
    },
  };
  
  return configs[type] || { 
    icon: <Bell className="w-6 h-6 text-white" />, 
    bgColor: "from-gray-500 to-gray-600", 
    iconBg: "bg-gray-500" 
  };
};

export const ChildNotifications = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const token = localStorage.getItem("childToken");
  const queryClient = useQueryClient();

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["child-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/child/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/child/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
    } catch (err) {
      console.error("Mark read error", err);
    }
  };

  const resolveNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/child/notifications/${id}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.success) {
        queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["child-tasks"] });
      }
    } catch (err) {
      console.error("Resolve notification error", err);
    }
  };

  const handleCTA = (notification: Notification) => {
    if (notification.ctaTarget) {
      navigate(notification.ctaTarget);
    } else if (notification.relatedId) {
      switch (notification.type) {
        case "product_assigned":
        case "gift_assigned":
          navigate("/child-gifts");
          break;
        case "task_reminder":
          navigate("/child-tasks");
          break;
        case "daily_challenge":
          navigate("/child-games");
          break;
        default:
          break;
      }
    }
    markAsRead(notification.id);
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const currentPoints = childInfo?.totalPoints || 0;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-orange-300 to-orange-500"} p-4 md:p-8`}>
      {childInfo?.id && <MandatoryTaskModal childId={childInfo.id} />}
      
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Bell className="w-10 h-10" />
              الإشعارات
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                  {unreadCount} جديد
                </span>
              )}
            </h1>
            <p className="text-white text-opacity-80 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              النقاط: {currentPoints}
            </p>
          </div>
          <button
            onClick={() => navigate("/child-games")}
            className={`px-6 py-3 ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-white bg-opacity-30 hover:bg-opacity-40"} text-white font-bold rounded-xl transition-all`}
            data-testid="button-back"
          >
            رجوع
          </button>
        </div>

        <div className="space-y-4">
          {notificationsLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notification) => {
              const config = getNotificationConfig(notification.type, notification.priority);
              const isUrgent = notification.priority === "urgent" || notification.priority === "blocking";
              const isUnread = !notification.isRead;
              
              return (
                <div
                  key={notification.id}
                  className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl overflow-hidden shadow-lg transition-all hover:shadow-xl ${isUnread ? "ring-2 ring-offset-2 ring-yellow-500" : ""} ${isUrgent ? "animate-pulse" : ""}`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className={`h-2 bg-gradient-to-r ${config.bgColor}`} />
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                            {notification.title || notification.type.replace(/_/g, " ")}
                          </h4>
                          {isUnread && (
                            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                          )}
                        </div>
                        <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mb-3`}>
                          {notification.message}
                        </p>
                        
                        {notification.metadata && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {notification.metadata.pointsEarned && (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold">
                                +{notification.metadata.pointsEarned} نقطة
                              </span>
                            )}
                            {notification.metadata.requiredPoints && (
                              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-bold">
                                الهدف: {notification.metadata.requiredPoints} نقطة
                              </span>
                            )}
                            {notification.metadata.percentage && (
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                                التقدم: {notification.metadata.percentage}%
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {notification.ctaAction && (
                            <button 
                              onClick={() => handleCTA(notification)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-blue-700 transition-all text-sm"
                              data-testid={`button-cta-${notification.id}`}
                            >
                              {notification.ctaAction === "view_goal" ? t("childNotifications.viewGoal") :
                               notification.ctaAction === "view_reward" ? t("childNotifications.viewReward") :
                               notification.ctaAction === "view_task" ? t("childNotifications.viewTask") :
                               notification.ctaAction === "start_challenge" ? t("childNotifications.startChallenge") :
                               t("view")}
                            </button>
                          )}
                          {!notification.isRead && (
                            <button 
                              onClick={() => markAsRead(notification.id)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all text-sm flex items-center gap-1"
                              data-testid={`button-mark-read-${notification.id}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                              تم القراءة
                            </button>
                          )}
                        </div>
                        
                        <p className={`text-xs mt-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          {new Date(notification.createdAt).toLocaleDateString(getDateLocale(), {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-12 text-center`}>
              <Bell className={`w-20 h-20 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
              <h3 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                لا توجد إشعارات
              </h3>
              <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
                ستظهر هنا إشعاراتك عند حصولك على نقاط جديدة أو هدايا
              </p>
            </div>
          )}
          
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 shadow-lg`}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                  مرحباً {childInfo?.name || ""}!
                </h3>
                <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  استمر في جمع النقاط للحصول على هدايا رائعة! لديك {currentPoints} نقطة.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/child-games")}
            className="p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition-all flex flex-col items-center gap-2"
            data-testid="button-games"
          >
            <Gamepad2 className="w-8 h-8" />
            العب
          </button>
          <button
            onClick={() => navigate("/child-store")}
            className="p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold transition-all flex flex-col items-center gap-2"
            data-testid="button-store"
          >
            <ShoppingBag className="w-8 h-8" />
            المتجر
          </button>
          <button
            onClick={() => navigate("/child-gifts")}
            className="p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition-all flex flex-col items-center gap-2"
            data-testid="button-gifts"
          >
            <Gift className="w-8 h-8" />
            الهدايا
          </button>
          <button
            onClick={() => navigate("/child-tasks")}
            className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex flex-col items-center gap-2"
            data-testid="button-tasks"
          >
            <Target className="w-8 h-8" />
            المهام
          </button>
        </div>
      </div>
    </div>
  );
};
