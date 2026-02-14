import React, { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";

import { AdminDashboardTab } from "@/components/admin/DashboardTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { SymbolsTab } from "@/components/admin/SymbolsTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { WalletsTab } from "@/components/admin/WalletsTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { DepositsTab } from "@/components/admin/DepositsTab";
import { ActivityLogTab } from "@/components/admin/ActivityLogTab";
import { WalletAnalytics } from "@/components/admin/WalletAnalytics";
import { PaymentMethodsTab } from "@/components/admin/PaymentMethodsTab";
import { SubjectsTab } from "@/components/admin/SubjectsTab";
import { NotificationsTab } from "@/components/admin/NotificationsTab";
import { ReferralsTab } from "@/components/admin/ReferralsTab";
import { AdsTab } from "@/components/admin/AdsTab";
import { ParentsTab } from "@/components/admin/ParentsTab";
import { ProfitSystemTab } from "@/components/admin/ProfitSystemTab";
import LibrariesTab from "@/components/admin/LibrariesTab";
import { SocialLoginTab } from "@/components/admin/SocialLoginTab";
import { OTPProvidersTab } from "@/components/admin/OTPProvidersTab";
import { SeoSettingsTab } from "@/components/admin/SeoSettingsTab";
import { SupportSettingsTab } from "@/components/admin/SupportSettingsTab";
import { GiftsTab } from "@/components/admin/GiftsTab";
import { NotificationSettingsTab } from "@/components/admin/NotificationSettingsTab";
import { GamesTab } from "@/components/admin/GamesTab";
import { TasksTab } from "@/components/admin/TasksTab";
import { TaskNotificationLevelsTab } from "@/components/admin/TaskNotificationLevelsTab";

type TabType = "dashboard" | "products" | "categories" | "symbols" | "users" | "settings" | "wallets" | "orders" | "deposits" | "activity" | "analytics" | "payment-methods" | "subjects" | "notifications" | "notification-settings" | "task-notification-levels" | "gifts" | "referrals" | "ads" | "parents" | "profits" | "libraries" | "games" | "tasks" | "social-login" | "otp-providers" | "seo" | "support";

export const AdminDashboard = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("adminToken");

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const isRTL = i18n.language === 'ar';

  if (!token) {
    navigate("/admin");
    return <div>Redirecting...</div>;
  }

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin");
  };

  const tabs: { id: TabType; labelKey: string; icon: string }[] = [
    { id: "dashboard", labelKey: "admin.dashboard", icon: "📊" },
    { id: "profits", labelKey: "admin.profitSystem", icon: "💹" },
    { id: "parents", labelKey: "admin.parentsManagement", icon: "👨‍👩‍👧‍👦" },
    { id: "subjects", labelKey: "admin.subjects", icon: "📚" },
    { id: "categories", labelKey: "admin.storeCategories", icon: "📁" },
    { id: "symbols", labelKey: "admin.symbolsLibrary", icon: "⭐" },
    { id: "products", labelKey: "admin.products", icon: "🛍️" },
    { id: "users", labelKey: "admin.children", icon: "👥" },
    { id: "games", labelKey: "admin.games", icon: "🎮" },
    { id: "tasks", labelKey: "admin.tasks", icon: "📝" },
    { id: "wallets", labelKey: "admin.wallets", icon: "💰" },
    { id: "orders", labelKey: "admin.orders", icon: "📦" },
    { id: "deposits", labelKey: "admin.deposits", icon: "💳" },
    { id: "payment-methods", labelKey: "admin.paymentMethods", icon: "💳" },
    { id: "analytics", labelKey: "admin.walletAnalytics", icon: "📈" },
    { id: "activity", labelKey: "admin.activityLog", icon: "📋" },
    { id: "notifications", labelKey: "admin.notifications", icon: "🔔" },
    { id: "notification-settings", labelKey: "admin.notificationSettings", icon: "🧩" },
    { id: "task-notification-levels", labelKey: "admin.taskNotificationLevels", icon: "🚨" },
    { id: "gifts", labelKey: "admin.gifts", icon: "🎁" },
    { id: "referrals", labelKey: "admin.referrals", icon: "🤝" },
    { id: "ads", labelKey: "admin.ads", icon: "📢" },
    { id: "libraries", labelKey: "admin.libraries", icon: "📖" },
    { id: "social-login", labelKey: "admin.socialLogin", icon: "🔐" },
    { id: "otp-providers", labelKey: "admin.otpProviders", icon: "📱" },
    { id: "seo", labelKey: "admin.seoSettings", icon: "🔍" },
    { id: "support", labelKey: "admin.supportSettings", icon: "📞" },
    { id: "settings", labelKey: "admin.settings", icon: "⚙️" },
  ];

  return (
    <div className={`flex h-screen ${isDark ? "bg-gray-900 text-white" : "bg-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } ${isDark ? "bg-gray-800" : "bg-gray-100"} ${isRTL ? "border-l" : "border-r"} transition-all duration-300 flex flex-col h-screen`}
      >
        <div className="p-4 flex items-center justify-between shrink-0">
          {sidebarOpen && <h1 className="text-xl font-bold">{t("admin.title")}</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-200"}`}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="space-y-2 p-4 flex-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? isDark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isDark
                  ? "hover:bg-gray-700"
                  : "hover:bg-gray-200"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {sidebarOpen && <span>{t(tab.labelKey)}</span>}
            </button>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors mt-4"
            data-testid="button-logout"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>{t("admin.logout")}</span>}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Header with Language and Theme Toggle */}
        <div className={`flex items-center justify-end gap-2 p-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <LanguageSelector />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === "dashboard" && <AdminDashboardTab token={token} />}
          {activeTab === "subjects" && <SubjectsTab token={token} />}
          {activeTab === "categories" && <CategoriesTab token={token} />}
          {activeTab === "symbols" && <SymbolsTab token={token} />}
          {activeTab === "products" && <ProductsTab token={token} />}
          {activeTab === "users" && <UsersTab token={token} />}
          {activeTab === "wallets" && <WalletsTab token={token} />}
          {activeTab === "orders" && <OrdersTab token={token} />}
          {activeTab === "deposits" && <DepositsTab token={token} />}
          {activeTab === "payment-methods" && <PaymentMethodsTab token={token} />}
          {activeTab === "analytics" && <WalletAnalytics token={token} />}
          {activeTab === "activity" && <ActivityLogTab token={token} />}
          {activeTab === "notifications" && <NotificationsTab token={token} />}
          {activeTab === "notification-settings" && <NotificationSettingsTab token={token} />}
          {activeTab === "task-notification-levels" && <TaskNotificationLevelsTab token={token} />}
          {activeTab === "gifts" && <GiftsTab token={token} />}
          {activeTab === "referrals" && <ReferralsTab token={token} />}
          {activeTab === "ads" && <AdsTab token={token} />}
          {activeTab === "parents" && <ParentsTab token={token} />}
          {activeTab === "profits" && <ProfitSystemTab token={token} />}
          {activeTab === "libraries" && <LibrariesTab />}
          {activeTab === "games" && <GamesTab token={token} />}
          {activeTab === "tasks" && <TasksTab token={token} />}
          {activeTab === "social-login" && <SocialLoginTab />}
          {activeTab === "otp-providers" && <OTPProvidersTab />}
          {activeTab === "seo" && <SeoSettingsTab />}
          {activeTab === "support" && <SupportSettingsTab />}
          {activeTab === "settings" && <SettingsTab token={token} />}
        </div>
      </div>
    </div>
  );
};
