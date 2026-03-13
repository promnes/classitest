import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { User, Shield, Palette, PhoneCall, ArrowLeft, Settings2, MoreVertical, Moon, Sun, Building2, MapPin, FileText } from "lucide-react";
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
  const { t, i18n } = useTranslation();
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
  const [showMobileHeaderMenu, setShowMobileHeaderMenu] = useState(false);

  const panelClass = `${isDark ? "bg-slate-800/90 border-slate-700" : "bg-white border-indigo-100"} rounded-2xl p-5 md:p-8 shadow-xl border`;
  const inputClass = `w-full px-4 py-3 text-sm md:text-base border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-500 transition-colors ${
    isDark ? "bg-slate-700 border-slate-600 text-white" : "border-slate-300 bg-slate-50/70"
  }`;
  const labelClass = `block text-sm md:text-base font-bold mb-2 ${isDark ? "text-slate-200" : "text-slate-700"}`;

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
      const res = await fetch("/api/support-settings");
      if (!res.ok) return null;
      const json = await res.json();
      const d = json?.data || json;
      return {
        phone: d?.supportPhone || null,
        email: d?.supportEmail || null,
        whatsapp: d?.whatsappNumber || null,
        facebook: d?.facebookUrl || null,
        instagram: d?.instagramUrl || null,
        twitter: d?.twitterUrl || null,
        address: d?.companyName || null,
      };
    },
  });

  useEffect(() => {
    if (parentInfo) {
      setProfileData({ name: parentInfo.name, email: parentInfo.email, phoneNumber: parentInfo.phoneNumber || "", governorate: parentInfo.governorate || "", bio: parentInfo.bio || "", city: parentInfo.city || "" });
    }
  }, [parentInfo]);

  useEffect(() => {
    if (!showMobileHeaderMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMobileHeaderMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showMobileHeaderMenu]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileHeaderMenu(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" : "bg-gradient-to-b from-indigo-50 via-white to-sky-50"}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-700 to-purple-800 text-white p-3 md:p-5 shadow-lg border-b border-white/15 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-2">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight inline-flex items-center gap-2 leading-none">
            <Settings2 className="w-6 h-6 md:w-8 md:h-8" />
            {t("settings.title")}
          </h1>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            <ParentNotificationBell />
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
              className="px-3 md:px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl inline-flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t("settings.back")}</span>
            </button>

            <button
              type="button"
              aria-label={t("common.more", "المزيد")}
              aria-haspopup="menu"
              aria-expanded={showMobileHeaderMenu}
              aria-controls="settings-mobile-header-menu"
              onClick={() => setShowMobileHeaderMenu((prev) => !prev)}
              className="md:hidden w-9 h-9 rounded-xl bg-white/10 border border-white/20 inline-flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <button
              aria-label={t("common.close", "إغلاق")}
              aria-hidden={!showMobileHeaderMenu}
              className={`md:hidden fixed inset-0 z-40 bg-black/25 transition-opacity duration-200 ${showMobileHeaderMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              onClick={() => setShowMobileHeaderMenu(false)}
            />

            <div
              id="settings-mobile-header-menu"
              role="menu"
              aria-hidden={!showMobileHeaderMenu}
              className={`md:hidden absolute top-full mt-2 ${i18n.language === "ar" ? "left-0" : "right-0"} z-50 w-[min(13rem,calc(100vw-0.75rem))] rounded-2xl border p-2 shadow-2xl backdrop-blur-sm ${
                isDark ? "bg-slate-900/95 border-slate-700" : "bg-white/95 border-indigo-100 text-slate-800"
              } ${showMobileHeaderMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"} transition-all duration-200`}
            >
              <div className="px-1 pb-2">
                <LanguageSelector />
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleTheme();
                  setShowMobileHeaderMenu(false);
                }}
                className={`w-full rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2 ${isDark ? "hover:bg-slate-800 text-slate-100" : "hover:bg-indigo-50 text-slate-700"}`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{isDark ? t("settings.lightMode", "الوضع الفاتح") : t("settings.darkMode", "الوضع الداكن")}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-3 md:p-6 mt-3 md:mt-7">
        {/* Tabs */}
        <div role="tablist" aria-label={t("settings.title")} className="grid grid-cols-2 md:flex gap-2 mb-5 md:mb-8">
          <button
            onClick={() => setTab("profile")}
            role="tab"
            id="settings-tab-profile"
            aria-selected={tab === "profile"}
            aria-controls="settings-panel-profile"
            className={`px-2.5 md:px-6 min-h-[52px] md:min-h-0 py-2.5 md:py-3 text-sm md:text-base leading-tight font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 md:gap-2 ${
              tab === "profile"
                ? "bg-blue-500 text-white shadow-lg"
                : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t("settings.profile")}</span>
          </button>
          <button
            onClick={() => setTab("security")}
            role="tab"
            id="settings-tab-security"
            aria-selected={tab === "security"}
            aria-controls="settings-panel-security"
            className={`px-2.5 md:px-6 min-h-[52px] md:min-h-0 py-2.5 md:py-3 text-sm md:text-base leading-tight font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 md:gap-2 ${
              tab === "security"
                ? "bg-blue-500 text-white shadow-lg"
                : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{t("settings.security")}</span>
          </button>
          <button
            onClick={() => setTab("appearance")}
            role="tab"
            id="settings-tab-appearance"
            aria-selected={tab === "appearance"}
            aria-controls="settings-panel-appearance"
            className={`px-2.5 md:px-6 min-h-[52px] md:min-h-0 py-2.5 md:py-3 text-sm md:text-base leading-tight font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 md:gap-2 ${
              tab === "appearance"
                ? "bg-blue-500 text-white shadow-lg"
                : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>{t("settings.appearance")}</span>
          </button>
          <button
            onClick={() => setTab("contact")}
            role="tab"
            id="settings-tab-contact"
            aria-selected={tab === "contact"}
            aria-controls="settings-panel-contact"
            className={`px-2.5 md:px-6 min-h-[52px] md:min-h-0 py-2.5 md:py-3 text-sm md:text-base leading-tight font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 md:gap-2 ${
              tab === "contact"
                ? "bg-blue-500 text-white shadow-lg"
                : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>{t("settings.contact")}</span>
          </button>
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile" className={`${panelClass} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-5 md:mb-6 leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.editProfile")}
            </h2>
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-xl flex items-center gap-2">
                <span>❌</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 text-green-700 rounded-xl flex items-center gap-2">
                <span>✅</span>
                <span>{successMessage}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  {t("settings.name")}
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.email")}
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.phone")}
                </label>
                <input
                  type="tel"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                  className={inputClass}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <label className={`${labelClass} inline-flex items-center gap-1.5`}>
                  <Building2 className="w-4 h-4 opacity-80" />
                  <span>{t("settings.governorate")}</span>
                </label>
                <GovernorateSelect
                  value={profileData.governorate}
                  onChange={(val) => setProfileData({ ...profileData, governorate: val })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`${labelClass} inline-flex items-center gap-1.5`}>
                  <MapPin className="w-4 h-4 opacity-80" />
                  <span>{t("settings.city")}</span>
                </label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  className={inputClass}
                  placeholder={t("settings.cityPlaceholder")}
                />
              </div>
              <div>
                <label className={`${labelClass} inline-flex items-center gap-1.5`}>
                  <FileText className="w-4 h-4 opacity-80" />
                  <span>{t("settings.aboutYou")}</span>
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className={inputClass}
                  placeholder={t("settings.aboutYouPlaceholder")}
                />
              </div>
              <button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 w-full mt-6 shadow-lg"
              >
                {updateProfileMutation.isPending ? t("settings.saving") : `💾 ${t("settings.saveChanges")}`}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {tab === "security" && (
          <div id="settings-panel-security" role="tabpanel" aria-labelledby="settings-tab-security" className={`${panelClass} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-5 md:mb-6 leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.changePassword")}
            </h2>
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-xl flex items-center gap-2">
                <span>❌</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 text-green-700 rounded-xl flex items-center gap-2">
                <span>✅</span>
                <span>{successMessage}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  {t("settings.currentPassword")}
                </label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.newPassword")}
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.confirmPassword")}
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.otpMethod")}
                </label>
                <select
                  value={otpData.method}
                  onChange={(e) => setOtpData({ method: e.target.value, code: "", otpId: "" })}
                  className={inputClass}
                >
                  <option value="email">{t("settings.otpMethodEmail")}</option>
                  <option value="sms">{t("settings.otpMethodSms")}</option>
                </select>
              </div>
              <div>
                <button
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={sendOtpMutation.isPending}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 w-full shadow-lg"
                >
                  {sendOtpMutation.isPending ? t("settings.sendingOtp") : `📨 ${t("settings.sendOtp")}`}
                </button>
              </div>
              <div>
                <label className={labelClass}>
                  {t("settings.otpCode")}
                </label>
                <input
                  type="text"
                  value={otpData.code}
                  onChange={(e) => setOtpData({ ...otpData, code: e.target.value })}
                  className={inputClass}
                />
              </div>
              <button
                onClick={() => changePasswordMutation.mutate()}
                disabled={changePasswordMutation.isPending}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 w-full mt-6 shadow-lg"
              >
                {changePasswordMutation.isPending ? t("settings.changingPassword") : `🔐 ${t("settings.changePassword")}`}
              </button>
            </div>

            <div className={`mt-10 border-2 ${isDark ? "border-red-700 bg-red-500/5" : "border-red-300 bg-red-50/70"} rounded-2xl p-6`}>
              <h3 className={`text-xl font-black mb-3 ${isDark ? "text-red-300" : "text-red-600"}`}>
                {t("settings.deleteAccountTitle")}
              </h3>
              <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {t("settings.deleteAccountDescription")}
              </p>
              <label className={labelClass}>
                {t("settings.deleteAccountPassword")}
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className={inputClass}
              />
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteAccountMutation.isPending || !deletePassword}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 w-full mt-6"
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
          <div id="settings-panel-appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" className={`${panelClass} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-5 md:mb-6 leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("settings.appearanceSettings")}
            </h2>
            <div className="space-y-4">
              <div className={`flex justify-between items-center p-4 border-2 rounded-2xl ${isDark ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50"}`}>
                <span className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {isDark ? `🌙 ${t("settings.darkMode")}` : `☀️ ${t("settings.lightMode")}`}
                </span>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-md"
                >
                  {t("settings.toggleTheme")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {tab === "contact" && (
          <div id="settings-panel-contact" role="tabpanel" aria-labelledby="settings-tab-contact" className={`${panelClass} animate-in fade-in-0 slide-in-from-bottom-1 duration-200`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-5 md:mb-6 leading-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              📞 {t("settings.contactUs")}
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("settings.contactDescription")}
            </p>

            <button
              onClick={() => navigate("/privacy-policy")}
              className={`w-full mb-6 p-4 rounded-2xl font-bold ${
                isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-blue-50 hover:bg-blue-100 text-blue-700"
              } transition-all`}
            >
              {t("settings.privacyPolicy")}
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contactInfo?.phone && (
                <a 
                  href={`tel:${contactInfo.phone}`}
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
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
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-green-50 hover:bg-green-100"} transition-all`}
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
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-green-50 hover:bg-green-100"} transition-all`}
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
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
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
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-pink-50 hover:bg-pink-100"} transition-all`}
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
                  className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-50 hover:bg-blue-100"} transition-all`}
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
              <div className={`mt-6 p-4 rounded-2xl ${isDark ? "bg-gray-700" : "bg-yellow-50"}`}>
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
              <div className={`text-center p-8 rounded-2xl ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
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
