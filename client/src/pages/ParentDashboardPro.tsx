import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AnnualReportChart } from "@/components/AnnualReportChart";
import { QRCodeSVG } from "qrcode.react";

export const ParentDashboard = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const [showQR, setShowQR] = useState(false);
  const [selectedChildForReport, setSelectedChildForReport] = useState<string | null>(null);

  const { data: parentInfoRaw } = useQuery({
    queryKey: ["/api/parent/info"],
    enabled: !!token,
  });

  const { data: childrenRaw } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const { data: walletRaw } = useQuery({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const { data: notificationsRaw } = useQuery({
    queryKey: ["/api/parent/notifications"],
    enabled: !!token,
    refetchInterval: token ? 5000 : false, // Stop polling when no token
  });

  const parentInfo = parentInfoRaw as any || {};
  const children = Array.isArray(childrenRaw) ? childrenRaw : [];
  const wallet = walletRaw as any || {};
  const notifications = Array.isArray(notificationsRaw) ? notificationsRaw : [];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    navigate("/");
  };

  const unreadNotifications = notifications.filter((n: any) => !n.isRead).length;
  
  const isRTL = i18n.language === 'ar';

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 text-white p-4 md:p-6 shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.jpg" 
              alt="Classify" 
              className="h-14 w-14 rounded-full shadow-lg border-4 border-yellow-400 object-cover"
            />
            <div>
              <h1 className="text-3xl font-bold">📊 Classify</h1>
              <p className="text-sm opacity-90">{t("parent.hello")} {parentInfo?.name}</p>
            </div>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => navigate("/wallet")}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all"
              title="Wallet"
            >
              💰
            </button>
            <button
              onClick={() => navigate("/subjects")}
              className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all"
              title="Subjects"
            >
              📚
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className="relative px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all"
              title="Notifications"
            >
              🔔
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadNotifications}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/parent-store")}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all"
              title="Store"
            >
              🛍️
            </button>
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all"
            >
              ⚙️
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-lg shadow-md hover:shadow-lg transition-all"
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${isDark ? "bg-gradient-to-br from-blue-900 to-blue-800" : "bg-gradient-to-br from-blue-500 to-blue-600"} rounded-2xl p-6 shadow-lg text-white`}>
            <p className="text-sm opacity-90">{t("parent.linkedChildren")}</p>
            <p className="text-4xl font-bold mt-2">{children.length}</p>
            <p className="text-sm mt-2">👶 {t("parent.childrenLabel")}</p>
          </div>
          
          <div className={`${isDark ? "bg-gradient-to-br from-green-900 to-green-800" : "bg-gradient-to-br from-green-500 to-green-600"} rounded-2xl p-6 shadow-lg text-white`}>
            <p className="text-sm opacity-90">{t("parent.walletBalance")}</p>
            <p className="text-4xl font-bold mt-2">₪ {Number(wallet?.balance || 0).toFixed(2)}</p>
            <p className="text-sm mt-2">💳 {t("parent.availableBalance")}</p>
          </div>

          <div className={`${isDark ? "bg-gradient-to-br from-purple-900 to-purple-800" : "bg-gradient-to-br from-purple-500 to-purple-600"} rounded-2xl p-6 shadow-lg text-white`}>
            <p className="text-sm opacity-90">{t("parent.newNotifications")}</p>
            <p className="text-4xl font-bold mt-2">{unreadNotifications}</p>
            <p className="text-sm mt-2">🔔 {t("parent.awaitingReview")}</p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 md:p-8 shadow-lg mb-8`}>
          <div className="flex justify-between items-center mb-6 gap-2 flex-wrap">
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              🔗 {t("parent.linkChildren")}
            </h2>
            <button
              onClick={() => setShowQR(!showQR)}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              📱 {t("parent.showQRCode")}
            </button>
          </div>
          <div className={`${isDark ? "bg-gray-700" : "bg-gray-100"} p-6 rounded-lg text-center`}>
            <p className="text-sm opacity-70 mb-3">{t("parent.shareCodeWithChildren")}</p>
            <p className="text-4xl font-mono font-bold text-blue-500 mb-2">
              {parentInfo?.uniqueCode || "..."}
            </p>
            <p className="text-xs opacity-70">{t("parent.pressShowQR")}</p>
          </div>
        </div>

        {/* Children Management */}
        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 md:p-8 shadow-lg mb-8`}>
          <div className="flex justify-between items-center mb-6 gap-2 flex-wrap">
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              👶 {t("parent.manageChildren")}
            </h2>
            <button
              onClick={() => navigate("/parent-tasks")}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              ✨ {t("parent.createTask")}
            </button>
          </div>

          {children && children.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {children.map((child: any) => (
                <div
                  key={child.id}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    isDark
                      ? "border-gray-600 bg-gray-700 hover:border-blue-400 hover:bg-gray-600"
                      : "border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        👧 {child.name}
                      </h3>
                      <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {t("parent.childId")}: {child.id.substring(0, 8)}...
                      </p>
                    </div>
                    <span className="text-3xl">⭐</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className={`${isDark ? "bg-gray-600" : "bg-blue-100"} p-3 rounded-lg`}>
                      <p className="text-xs opacity-70">{t("parent.points")}</p>
                      <p className={`text-xl font-bold ${isDark ? "text-blue-300" : "text-blue-600"}`}>
                        {child.totalPoints}
                      </p>
                    </div>
                    <div className={`${isDark ? "bg-gray-600" : "bg-green-100"} p-3 rounded-lg`}>
                      <p className="text-xs opacity-70">{t("parent.completedTasks")}</p>
                      <p className={`text-xl font-bold ${isDark ? "text-green-300" : "text-green-600"}`}>
                        0
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-all">
                      📝 {t("parent.sendTask")}
                    </button>
                    <button className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold rounded-lg transition-all">
                      🎮 {t("parent.games")}
                    </button>
                    <button 
                      onClick={() => setSelectedChildForReport(selectedChildForReport === child.id ? null : child.id)}
                      className={`flex-1 px-3 py-2 ${selectedChildForReport === child.id ? 'bg-yellow-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white text-sm font-bold rounded-lg transition-all`}
                      data-testid={`button-annual-report-${child.id}`}
                    >
                      📊 {t("annualReport")}
                    </button>
                  </div>
                  {selectedChildForReport === child.id && (
                    <div className="mt-4">
                      <AnnualReportChart childId={child.id} isParentView={true} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDark ? "bg-gray-700 rounded-lg" : "bg-gray-100 rounded-lg"}`}>
              <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t("parent.noChildrenLinked")}
              </p>
              <p className={`text-sm mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {t("parent.useCodeToLink")}
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 md:p-8 shadow-lg`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
            ⚡ {t("parent.quickActions")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate("/subjects")}
              className="p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold text-center transition-all shadow-md hover:shadow-lg"
            >
              📚 {t("parent.subjects")}
            </button>
            <button
              onClick={() => navigate("/wallet")}
              className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-center transition-all shadow-md hover:shadow-lg"
            >
              💳 {t("parent.depositMoney")}
            </button>
            <button
              onClick={() => navigate("/parent-store")}
              className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-center transition-all shadow-md hover:shadow-lg"
            >
              🛍️ {t("parent.myStore")}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-center transition-all shadow-md hover:shadow-lg"
            >
              ⚙️ {t("parent.settings")}
            </button>
          </div>
        </div>
      </main>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-8 text-center max-w-md w-full`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              📱 {t("parent.qrCode")}
            </h2>
            <div className={`${isDark ? "bg-gray-700" : "bg-gray-100"} p-6 rounded-lg inline-block mb-6`}>
              <QRCodeSVG value={parentInfo?.uniqueCode || "PARENT"} size={200} />
            </div>
            <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("parent.scanQRToLink")}
            </p>
            <button
              onClick={() => setShowQR(false)}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-all"
            >
              {t("parent.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
