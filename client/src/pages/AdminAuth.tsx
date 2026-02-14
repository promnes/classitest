import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";

export const AdminAuth = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const isRTL = i18n.language === 'ar';

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("Login failed");
      return res.json();
    },
    onSuccess: (data) => {
      const token = data?.data?.token;
      if (!token) {
        throw new Error("Login failed");
      }
      localStorage.setItem("adminToken", token);
      navigate("/admin-dashboard");
    },
    onError: () => alert(t("admin.invalidCredentials")),
  });

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      const masked = data?.data?.maskedEmail;
      if (masked) {
        setForgotMessage(
          isRTL
            ? `تم إرسال رابط الاستعادة إلى ${masked}`
            : `Recovery link sent to ${masked}`
        );
      } else {
        setForgotMessage(
          isRTL
            ? "إذا كان الحساب موجوداً سيتم إرسال رابط الاستعادة"
            : "If account exists, a recovery link has been sent"
        );
      }
    },
  });

  if (showForgot) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow-lg p-8 max-w-md w-full`}>
          <h1 className={`text-2xl font-bold text-center mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
            {isRTL ? "استعادة كلمة المرور" : "Password Recovery"}
          </h1>

          <div className={`p-4 rounded-lg mb-6 ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
            <p className={`text-sm ${isDark ? "text-gray-300" : "text-blue-700"}`}>
              {isRTL
                ? "أدخل اسم المستخدم وسيتم إرسال رابط الاستعادة إلى البريد المسجل"
                : "Enter your username and a recovery link will be sent to the registered email"}
            </p>
          </div>

          {forgotMessage && (
            <div className={`p-3 rounded-lg mb-4 ${isDark ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-300"} border`}>
              <p className={`text-sm ${isDark ? "text-green-300" : "text-green-700"}`}>{forgotMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                {isRTL ? "اسم المستخدم" : "Username"}
              </label>
              <input
                type="text"
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value)}
                autoComplete="username"
                className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                }`}
                placeholder={isRTL ? "اسم المستخدم" : "admin_user"}
              />
            </div>

            <button
              type="button"
              onClick={() => forgotMutation.mutate()}
              disabled={!forgotUsername || forgotMutation.isPending}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {forgotMutation.isPending
                ? (isRTL ? "جاري الإرسال..." : "Sending...")
                : (isRTL ? "إرسال رابط الاستعادة" : "Send Recovery Link")}
            </button>

            <button
              type="button"
              onClick={() => { setShowForgot(false); setForgotMessage(""); }}
              className={`w-full px-4 py-2 text-center font-bold ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800"}`}
            >
              {isRTL ? "العودة لتسجيل الدخول" : "Back to Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow-lg p-8 max-w-md w-full`}>
        <h1 className={`text-3xl font-bold text-center mb-8 ${isDark ? "text-white" : "text-gray-800"}`}>
          {t("admin.panelTitle")}
        </h1>

        <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-6">
          <div className={`p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
            <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {t("admin.enterCredentials")}
            </p>
          </div>

          <div>
            <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("admin.username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              }`}
              placeholder={isRTL ? "اسم المستخدم" : "admin_user"}
              data-testid="input-admin-username"
            />
          </div>

          <div>
            <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("admin.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              }`}
              placeholder="........"
              data-testid="input-admin-password"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50"
            data-testid="button-admin-login"
          >
            {t("admin.login")}
          </button>

          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className={`w-full text-sm text-center ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-800"}`}
          >
            {t("admin.forgotPassword")}
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className={`w-full px-4 py-2 text-center font-bold ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800"}`}
            data-testid="link-back-home"
          >
            {t("admin.backToHome")}
          </button>
        </form>
      </div>
    </div>
  );
};
