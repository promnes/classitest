import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useQuery } from "@tanstack/react-query";

const PAYMENT_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  bank_transfer: { label: "تحويل بنكي", emoji: "🏦" },
  vodafone_cash: { label: "فودافون كاش", emoji: "📱" },
  orange_money: { label: "أورنج موني", emoji: "🟠" },
  etisalat_cash: { label: "اتصالات موني", emoji: "🟣" },
  we_pay: { label: "وي باي", emoji: "💳" },
  instapay: { label: "إنستاباي", emoji: "⚡" },
  fawry: { label: "فوري", emoji: "🎫" },
  mobile_wallet: { label: "محفظة إلكترونية", emoji: "📲" },
  credit_card: { label: "بطاقة ائتمان", emoji: "💳" },
  other: { label: "أخرى", emoji: "💰" },
};

export const Home = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const libraryRef = new URLSearchParams(window.location.search).get("libraryRef")?.trim();
  const parentAuthPath = libraryRef
    ? `/parent-auth?libraryRef=${encodeURIComponent(libraryRef)}`
    : "/parent-auth";

  // Fetch public payment methods (no auth required)
  const { data: paymentMethodsRaw } = useQuery({
    queryKey: ["/api/public/payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/public/payment-methods");
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || [];
    },
    staleTime: 60000, // cache 1 minute
  });

  const paymentMethods = Array.isArray(paymentMethodsRaw) ? paymentMethodsRaw : [];

  return (
    <div className={`min-h-screen flex flex-col ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"
        : "bg-gradient-to-br from-purple-600 via-purple-500 to-purple-700"
    }`}>
      {/* Header */}
      <header className="p-4 md:p-6 bg-gradient-to-r from-purple-700 to-purple-800 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src="/logo.jpg" 
                alt="Classify" 
                width={56}
                height={56}
                decoding="async"
                loading="eager"
                className="h-14 w-14 rounded-full shadow-lg border-4 border-yellow-400 object-cover"
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
                ✓
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wider">Classify</h1>
              <p className="text-sm text-purple-200 font-semibold">by proomnes 🚀</p>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <LanguageSelector />
            <PWAInstallButton 
              variant="default" 
              size="default"
              showText={true}
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full px-4 py-2 font-semibold shadow-md hover:shadow-lg"
            />
            <button
              onClick={toggleTheme}
              type="button"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
              title="Toggle theme"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="flex items-center gap-6 mb-4">
          <img 
            src="/logo.jpg" 
            alt="Classify Logo" 
            width={128}
            height={128}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="h-24 w-24 md:h-32 md:w-32 rounded-full shadow-2xl border-4 border-yellow-400 object-cover animate-bounce"
          />
          <h1 className={`text-4xl md:text-6xl font-bold text-center ${
            isDark ? "text-white" : "text-white"
          }`}>
            Classify
          </h1>
        </div>
        <p className={`text-2xl font-bold text-center mb-4 ${
          isDark ? "text-blue-400" : "text-blue-100"
        }`}>
          {t("welcome")}
        </p>
        <p className={`text-lg text-center mb-12 ${
          isDark ? "text-gray-300" : "text-blue-100"
        }`}>
          {t("smartParentalControl")}
        </p>

        {/* Account Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          {/* Parent - Red Card */}
          <button
            onClick={() => navigate(parentAuthPath)}
            className={`${
              isDark ? "bg-red-900 hover:bg-red-800" : "bg-white hover:shadow-xl"
            } rounded-2xl p-8 shadow-lg transition-all hover:-translate-y-1 border-4 border-red-500`}
          >
            <div className="text-6xl mb-4">👨‍💼</div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
              {t("parentTitle")}
            </h2>
            <p className={isDark ? "text-red-200" : "text-red-700"}>{t("manageChildTasks")}</p>
          </button>

          {/* Child - Green Card */}
          <button
            onClick={() => navigate("/child-link")}
            className={`${
              isDark ? "bg-green-900 hover:bg-green-800" : "bg-white hover:shadow-xl"
            } rounded-2xl p-8 shadow-lg transition-all hover:-translate-y-1 border-4 border-green-500`}
          >
            <div className="text-6xl mb-4">👧</div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-green-300" : "text-green-600"}`}>
              {t("childTitle")}
            </h2>
            <p className={isDark ? "text-green-200" : "text-green-700"}>{t("gamesAndTasks")}</p>
          </button>
        </div>
      </main>

      {/* Public Payment Methods Section */}
      {paymentMethods.length > 0 && (
        <section className={`px-4 py-12 ${isDark ? "bg-gray-800/50" : "bg-white/10"}`}>
          <div className="max-w-4xl mx-auto">
            <h2 className={`text-3xl font-bold text-center mb-2 ${isDark ? "text-white" : "text-white"}`}>
              💳 وسائل الدفع المتاحة
            </h2>
            <p className={`text-center mb-8 ${isDark ? "text-gray-400" : "text-purple-200"}`}>
              يمكنك إيداع الأموال عبر أي من الوسائل التالية بعد تسجيل الدخول
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map((method: any) => {
                const typeInfo = PAYMENT_TYPE_LABELS[method.type] || { label: method.type, emoji: "💰" };
                return (
                  <div
                    key={method.id}
                    className={`rounded-xl p-5 shadow-lg border-2 transition-transform hover:-translate-y-1 ${
                      isDark 
                        ? "bg-gray-800 border-gray-700 hover:border-purple-500" 
                        : "bg-white/90 backdrop-blur border-purple-200 hover:border-purple-400"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{typeInfo.emoji}</span>
                      <div>
                        <span className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                          {typeInfo.label}
                        </span>
                        {method.isDefault && (
                          <span className="block text-xs text-yellow-600 font-semibold">★ موصى به</span>
                        )}
                      </div>
                    </div>
                    <div className={`space-y-1 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {method.bankName && (
                        <p>🏦 <strong>البنك:</strong> {method.bankName}</p>
                      )}
                      <p>🔢 <strong>رقم الحساب:</strong> <span className="font-mono">{method.accountNumber}</span></p>
                      {method.accountName && (
                        <p>👤 <strong>باسم:</strong> {method.accountName}</p>
                      )}
                      {method.phoneNumber && (
                        <p>📞 <strong>الهاتف:</strong> <span className="font-mono">{method.phoneNumber}</span></p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={`text-center py-6 ${isDark ? "text-gray-300" : "text-purple-100"}`}>
        <div className="flex justify-center gap-6 mb-4">
          <button onClick={() => navigate("/privacy")} className="hover:underline text-sm">
            🔒 Privacy
          </button>
          <button onClick={() => navigate("/terms")} className="hover:underline text-sm">
            📋 Terms
          </button>
        </div>
        <p className="text-xs opacity-70">© 2024 Classify by proomnes. All rights reserved. v1.0.0</p>
      </footer>
    </div>
  );
};
