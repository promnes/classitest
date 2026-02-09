import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";

export const AdminAuth = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isRTL = i18n.language === 'ar';

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Login failed");
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("adminToken", data.token);
      navigate("/admin-dashboard");
    },
    onError: () => alert(t("admin.invalidCredentials")),
  });

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
              {t("admin.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              }`}
              placeholder="admin@example.com"
              data-testid="input-admin-email"
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
