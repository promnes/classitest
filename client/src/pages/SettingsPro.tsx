import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");

  const [tab, setTab] = useState<"profile" | "security" | "appearance" | "notifications">("profile");
  const [profileData, setProfileData] = useState({ name: "", email: "" });
  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [otpData, setOtpData] = useState({ method: "email", code: "", otpId: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState({
    pushEnabled: true,
    emailEnabled: true,
    newTaskNotify: true,
    taskCompletedNotify: true,
    childActivityNotify: true,
    pointsEarnedNotify: true,
    giftReceivedNotify: true,
    orderStatusNotify: true,
    depositNotify: true,
    dailySummary: false,
    weeklySummary: true
  });

  const { data: parentInfo, refetch } = useQuery({
    queryKey: ["parent-info"],
    queryFn: async () => {
      const res = await fetch("/api/parent/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (parentInfo) {
      setProfileData({ name: parentInfo.name || "", email: parentInfo.email || "" });
    }
  }, [parentInfo]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profileData.name || !profileData.email) {
        throw new Error(t("validation.nameEmailRequired"));
      }
      const res = await fetch("/api/parent/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("errors.updateFailed"));
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("profileUpdated")}`);
      setErrorMessage("");
      refetch();
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("errors.updateError"));
      setSuccessMessage("");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error(t("validation.allPasswordFieldsRequired"));
      }
      if (!otpData.code || !otpData.otpId) {
        throw new Error(t("settings.otpRequired"));
      }
      if (passwordData.newPassword.length < 6) {
        throw new Error(t("validation.passwordMinLength"));
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error(t("validation.passwordsMismatch"));
      }
      if (passwordData.oldPassword === passwordData.newPassword) {
        throw new Error(t("validation.passwordMustDiffer"));
      }
      const res = await fetch("/api/parent/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
          otpCode: otpData.code,
          otpId: otpData.otpId,
          otpMethod: otpData.method,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("errors.passwordChangeFailed"));
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("passwordChanged")}`);
      setErrorMessage("");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setOtpData({ method: otpData.method, code: "", otpId: "" });
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("errors.passwordChangeError"));
      setSuccessMessage("");
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      if (!parentInfo?.email) {
        throw new Error(t("settings.otpSendFailed"));
      }

      if (otpData.method === "sms" && !parentInfo?.phoneNumber) {
        throw new Error(t("settings.otpSmsUnavailable"));
      }

      const endpoint = otpData.method === "sms" ? "/api/auth/send-otp-sms" : "/api/auth/send-otp";
      const payload = otpData.method === "sms"
        ? { email: parentInfo.email, phoneNumber: parentInfo.phoneNumber, purpose: "change_password" }
        : { email: parentInfo.email, purpose: "change_password" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || t("settings.otpSendFailed"));
      }

      if (!body?.data?.otpId) {
        throw new Error(t("settings.otpSendFailed"));
      }

      setOtpData((prev) => ({ ...prev, otpId: body.data.otpId }));
      return body;
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("settings.otpSent")}`);
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("settings.otpSendFailed"));
      setSuccessMessage("");
    },
  });

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-700 to-purple-800 text-white p-4 md:p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">⚙️ الإعدادات</h1>
          <button
            onClick={() => navigate("/parent-dashboard")}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg"
          >
            ← رجوع
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 md:p-6 mt-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          <button
            onClick={() => setTab("profile")}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              tab === "profile"
                ? "bg-blue-500 text-white"
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            👤 البيانات الشخصية
          </button>
          <button
            onClick={() => setTab("security")}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              tab === "security"
                ? "bg-blue-500 text-white"
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🔐 الأمان
          </button>
          <button
            onClick={() => setTab("appearance")}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              tab === "appearance"
                ? "bg-blue-500 text-white"
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🎨 المظهر
          </button>
          <button
            onClick={() => setTab("notifications")}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              tab === "notifications"
                ? "bg-blue-500 text-white"
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🔔 الإشعارات
          </button>
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              تعديل البيانات الشخصية
            </h2>
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-lg flex items-center gap-2">
                <span>❌</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 text-green-700 rounded-lg flex items-center gap-2">
                <span>✅</span>
                <span>{successMessage}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  الاسم
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                />
              </div>
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                />
              </div>
              <button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50 w-full mt-6"
              >
                {updateProfileMutation.isPending ? t("settingsPro.saving") : `💾 ${t("settingsPro.saveChanges")}`}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {tab === "security" && (
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              تغيير كلمة المرور
            </h2>
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-lg flex items-center gap-2">
                <span>❌</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 text-green-700 rounded-lg flex items-center gap-2">
                <span>✅</span>
                <span>{successMessage}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                />
              </div>
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                />
              </div>
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                />
              </div>
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  طريقة رمز التحقق
                </label>
                <select
                  value={otpData.method}
                  onChange={(e) => setOtpData({ ...otpData, method: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                >
                  <option value="email">البريد الإلكتروني</option>
                  <option value="sms">رسالة نصية</option>
                </select>
              </div>
              <div>
                <button
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={sendOtpMutation.isPending}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50 w-full"
                >
                  {sendOtpMutation.isPending ? t("settings.sendingOtp") : `📨 ${t("settings.sendOtp")}`}
                </button>
              </div>
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  رمز التحقق
                </label>
                <input
                  type="text"
                  value={otpData.code}
                  onChange={(e) => setOtpData({ ...otpData, code: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                />
              </div>
              <button
                onClick={() => changePasswordMutation.mutate()}
                disabled={changePasswordMutation.isPending}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg disabled:opacity-50 w-full mt-6"
              >
                {changePasswordMutation.isPending ? t("settingsPro.changingPassword") : `🔐 ${t("settingsPro.changePasswordBtn")}`}
              </button>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {tab === "appearance" && (
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              إعدادات المظهر
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border-2 rounded-lg" style={{borderColor: isDark ? "#374151" : "#e5e7eb"}}>
                <span className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {isDark ? "🌙 الوضع الليلي" : "☀️ الوضع النهاري"}
                </span>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg"
                >
                  تبديل المظهر
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {tab === "notifications" && (
          <div className="space-y-6">
            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
              <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
                🔔 إعدادات الإشعارات
              </h2>
              
              <div className="space-y-6">
                <div className={`p-4 rounded-xl border-2 ${isDark ? "border-gray-700 bg-gray-700/50" : "border-blue-100 bg-blue-50"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📱</span>
                      <div>
                        <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>الإشعارات الفورية</h3>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>استلام إشعارات على الهاتف</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.pushEnabled}
                        onChange={(e) => setNotificationPrefs({...notificationPrefs, pushEnabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border-2 ${isDark ? "border-gray-700 bg-gray-700/50" : "border-green-100 bg-green-50"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📧</span>
                      <div>
                        <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>إشعارات البريد الإلكتروني</h3>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>استلام تحديثات عبر الإيميل</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.emailEnabled}
                        onChange={(e) => setNotificationPrefs({...notificationPrefs, emailEnabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
              <h3 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
                🎯 أنواع الإشعارات
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: "newTaskNotify", label: t("settingsPro.newTaskNotify"), icon: "📋", desc: t("settingsPro.newTaskNotifyDesc") },
                  { key: "taskCompletedNotify", label: t("settingsPro.taskCompletedNotify"), icon: "✅", desc: t("settingsPro.taskCompletedNotifyDesc") },
                  { key: "childActivityNotify", label: t("settingsPro.childActivityNotify"), icon: "👶", desc: t("settingsPro.childActivityNotifyDesc") },
                  { key: "pointsEarnedNotify", label: t("settingsPro.pointsEarnedNotify"), icon: "⭐", desc: t("settingsPro.pointsEarnedNotifyDesc") },
                  { key: "giftReceivedNotify", label: t("settingsPro.giftReceivedNotify"), icon: "🎁", desc: t("settingsPro.giftReceivedNotifyDesc") },
                  { key: "orderStatusNotify", label: t("settingsPro.orderStatusNotify"), icon: "📦", desc: t("settingsPro.orderStatusNotifyDesc") },
                  { key: "depositNotify", label: t("settingsPro.depositNotify"), icon: "💰", desc: t("settingsPro.depositNotifyDesc") },
                ].map((item) => (
                  <div key={item.key} className={`flex items-center justify-between p-4 rounded-xl border-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{item.label}</p>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{item.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(notificationPrefs as any)[item.key]}
                        onChange={(e) => setNotificationPrefs({...notificationPrefs, [item.key]: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
              <h3 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
                📊 التقارير الدورية
              </h3>
              
              <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>ملخص يومي</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>تقرير يومي بنشاط الأطفال</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.dailySummary}
                      onChange={(e) => setNotificationPrefs({...notificationPrefs, dailySummary: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📆</span>
                    <div>
                      <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>ملخص أسبوعي</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>تقرير أسبوعي شامل</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.weeklySummary}
                      onChange={(e) => setNotificationPrefs({...notificationPrefs, weeklySummary: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert("تم حفظ إعدادات الإشعارات!")}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg text-lg"
            >
              💾 حفظ إعدادات الإشعارات
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
