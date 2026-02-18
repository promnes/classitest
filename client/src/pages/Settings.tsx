import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
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
import { GovernorateSelect } from "@/components/ui/GovernorateSelect";

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");

  const [tab, setTab] = useState<"profile" | "security" | "appearance" | "contact">("profile");
  const [profileData, setProfileData] = useState({ name: "", email: "", phoneNumber: "", governorate: "", bio: "", city: "" });
  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [otpData, setOtpData] = useState({ method: "email", code: "", otpId: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  const { data: contactInfo } = useQuery({
    queryKey: ["contact-info"],
    queryFn: async () => {
      const res = await fetch("/api/contact-info");
      return res.json();
    },
  });

  useEffect(() => {
    if (parentInfo) {
      setProfileData({ name: parentInfo.name, email: parentInfo.email, phoneNumber: parentInfo.phoneNumber || "", governorate: parentInfo.governorate || "", bio: parentInfo.bio || "", city: parentInfo.city || "" });
    }
  }, [parentInfo]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profileData.name || !profileData.email) {
        throw new Error(t("settings.nameEmailRequired"));
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
        throw new Error(error.message || t("settings.updateFailed"));
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("settings.updateSuccess")}`);
      setErrorMessage("");
      refetch();
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("settings.updateError"));
      setSuccessMessage("");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        throw new Error(t("settings.allFieldsRequired"));
      }
      if (!otpData.code || !otpData.otpId) {
        throw new Error(t("settings.otpRequired"));
      }
      if (passwordData.newPassword.length < 6) {
        throw new Error(t("settings.passwordMinLength"));
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error(t("settings.passwordsNotMatch"));
      }
      if (passwordData.oldPassword === passwordData.newPassword) {
        throw new Error(t("settings.passwordsMustDiffer"));
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
        throw new Error(error.message || t("settings.passwordChangeFailed"));
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("settings.passwordChangeSuccess")}`);
      setErrorMessage("");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setOtpData({ method: otpData.method, code: "", otpId: "" });
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("settings.passwordChangeError"));
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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!deletePassword) {
        throw new Error(t("settings.deletePasswordRequired"));
      }
      const res = await fetch("/api/parent/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmPassword: deletePassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || t("settings.deleteFailed"));
      }
      return body;
    },
    onSuccess: () => {
      setSuccessMessage(`✅ ${t("settings.deleteSuccess")}`);
      setErrorMessage("");
      localStorage.removeItem("token");
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || t("settings.deleteFailed"));
      setSuccessMessage("");
    },
  });

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-700 to-purple-800 text-white p-4 md:p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">⚙️ {t("settings.title")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ParentNotificationBell />
            <button
              onClick={() => navigate("/parent-dashboard")}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg"
            >
              ← {t("settings.back")}
            </button>
          </div>
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
            👤 {t("settings.profile")}
          </button>
          <button
            onClick={() => setTab("security")}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              tab === "security"
                ? "bg-blue-500 text-white"
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🔐 {t("settings.security")}
          </button>
          <button
            onClick={() => setTab("appearance")}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              tab === "appearance"
                ? "bg-blue-500 text-white"
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🎨 {t("settings.appearance")}
          </button>
          <button
            onClick={() => setTab("contact")}
            className={`px-6 py-2 font-bold rounded-lg transition-all ${
              tab === "contact"
                ? "bg-blue-500 text-white"
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📞 {t("settings.contact")}
          </button>
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.editProfile")}
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
                  {t("settings.name")}
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
                  {t("settings.email")}
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
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  {t("settings.phone")}
                </label>
                <input
                  type="tel"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  🏢 المحافظة
                </label>
                <GovernorateSelect
                  value={profileData.governorate}
                  onChange={(val) => setProfileData({ ...profileData, governorate: val })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                />
              </div>
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  🏙️ المدينة
                </label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                  placeholder="مثال: المعادي"
                />
              </div>
              <div>
                <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  📝 نبذة عنك
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                  placeholder="اكتب نبذة قصيرة عنك..."
                />
              </div>
              <button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50 w-full mt-6"
              >
                {updateProfileMutation.isPending ? t("settings.saving") : `💾 ${t("settings.saveChanges")}`}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {tab === "security" && (
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.changePassword")}
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
                  {t("settings.currentPassword")}
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
                  {t("settings.newPassword")}
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
                  {t("settings.confirmPassword")}
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
                  {t("settings.otpMethod")}
                </label>
                <select
                  value={otpData.method}
                  onChange={(e) => setOtpData({ method: e.target.value, code: "", otpId: "" })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                  }`}
                >
                  <option value="email">{t("settings.otpMethodEmail")}</option>
                  <option value="sms">{t("settings.otpMethodSms")}</option>
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
                  {t("settings.otpCode")}
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
                {changePasswordMutation.isPending ? t("settings.changingPassword") : `🔐 ${t("settings.changePassword")}`}
              </button>
            </div>

            <div className={`mt-10 border-2 ${isDark ? "border-red-700" : "border-red-300"} rounded-lg p-6`}>
              <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-red-300" : "text-red-600"}`}>
                {t("settings.deleteAccountTitle")}
              </h3>
              <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {t("settings.deleteAccountDescription")}
              </p>
              <label className={`block font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {t("settings.deleteAccountPassword")}
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-red-500 ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                }`}
              />
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteAccountMutation.isPending || !deletePassword}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 w-full mt-6"
              >
                {deleteAccountMutation.isPending ? t("settings.deletingAccount") : `🗑️ ${t("settings.deleteAccountButton")}`}
              </button>

              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("settings.deleteAccountTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("settings.deleteAccountDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => deleteAccountMutation.mutate()}
                    >
                      {t("settings.deleteAccountButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {tab === "appearance" && (
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.appearanceSettings")}
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border-2 rounded-lg" style={{borderColor: isDark ? "#374151" : "#e5e7eb"}}>
                <span className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {isDark ? `🌙 ${t("settings.darkMode")}` : `☀️ ${t("settings.lightMode")}`}
                </span>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg"
                >
                  {t("settings.toggleTheme")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {tab === "contact" && (
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-8 shadow-lg`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              📞 {t("settings.contactUs")}
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("settings.contactDescription")}
            </p>

            <button
              onClick={() => navigate("/privacy-policy")}
              className={`w-full mb-6 p-4 rounded-xl font-bold ${
                isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-blue-50 hover:bg-blue-100 text-blue-700"
              } transition-all`}
            >
              {t("settings.privacyPolicy")}
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contactInfo?.phone && (
                <a 
                  href={`tel:${contactInfo.phone}`}
                  className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
                >
                  <span className="text-3xl">📱</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.phoneLabel")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{contactInfo.phone}</p>
                  </div>
                </a>
              )}
              
              {contactInfo?.email && (
                <a 
                  href={`mailto:${contactInfo.email}`}
                  className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-green-50 hover:bg-green-100"} transition-all`}
                >
                  <span className="text-3xl">📧</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.emailLabel")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{contactInfo.email}</p>
                  </div>
                </a>
              )}
              
              {contactInfo?.whatsapp && (
                <a 
                  href={`https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-green-50 hover:bg-green-100"} transition-all`}
                >
                  <span className="text-3xl">💬</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.whatsapp")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{contactInfo.whatsapp}</p>
                  </div>
                </a>
              )}
              
              {contactInfo?.facebook && (
                <a 
                  href={contactInfo.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
                >
                  <span className="text-3xl">📘</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.facebook")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("settings.visitPage")}</p>
                  </div>
                </a>
              )}
              
              {contactInfo?.instagram && (
                <a 
                  href={contactInfo.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-pink-50 hover:bg-pink-100"} transition-all`}
                >
                  <span className="text-3xl">📸</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.instagram")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("settings.followUs")}</p>
                  </div>
                </a>
              )}
              
              {contactInfo?.twitter && (
                <a 
                  href={contactInfo.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
                >
                  <span className="text-3xl">🐦</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.twitter")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("settings.followUs")}</p>
                  </div>
                </a>
              )}
            </div>
            
            {contactInfo?.address && (
              <div className={`mt-6 p-4 rounded-xl ${isDark ? "bg-gray-700" : "bg-yellow-50"}`}>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📍</span>
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("settings.address")}</p>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{contactInfo.address}</p>
                  </div>
                </div>
              </div>
            )}
            
            {!contactInfo?.phone && !contactInfo?.email && !contactInfo?.whatsapp && (
              <div className={`text-center p-8 rounded-xl ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                <span className="text-6xl block mb-4">📞</span>
                <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {t("settings.noContactInfo")}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
