import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { Download, ArrowRight, Shield, Smartphone, Zap, ChevronRight } from "lucide-react";

export default function DownloadApp() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";

  const features = [
    { icon: <Shield className="w-8 h-8" />, title: isRTL ? "رقابة أبوية ذكية" : "Smart Parental Control", desc: isRTL ? "تحكم كامل في أنشطة طفلك" : "Full control over your child's activities" },
    { icon: <Smartphone className="w-8 h-8" />, title: isRTL ? "تطبيق سهل الاستخدام" : "Easy to Use", desc: isRTL ? "واجهة بسيطة وسهلة للأطفال والآباء" : "Simple interface for kids and parents" },
    { icon: <Zap className="w-8 h-8" />, title: isRTL ? "مهام وألعاب تعليمية" : "Educational Tasks & Games", desc: isRTL ? "تعلم ممتع مع مكافآت حقيقية" : "Fun learning with real rewards" },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" : "bg-gradient-to-br from-purple-600 via-purple-500 to-purple-700"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="p-4 md:p-6 bg-gradient-to-r from-purple-700 to-purple-800 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white hover:text-yellow-300 transition-colors">
            <ChevronRight className={`w-5 h-5 ${isRTL ? "" : "rotate-180"}`} />
            <span className="font-semibold">{isRTL ? "الرئيسية" : "Home"}</span>
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Classify" className="h-10 w-10 rounded-full border-2 border-yellow-400 object-cover" />
            <h1 className="text-xl font-bold text-white">Classify</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl mb-6">
            <Download className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t("downloadApp")}
          </h2>
          <p className="text-lg text-purple-200 max-w-lg mx-auto">
            {t("downloadAppDesc")}
          </p>
        </div>

        {/* Download Button */}
        <div className="flex justify-center mb-16">
          <a
            href="/classify-app.apk"
            download="Classify.apk"
            className="group flex items-center gap-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-10 py-5 rounded-2xl shadow-2xl hover:shadow-green-500/30 transition-all hover:-translate-y-1 text-xl font-bold"
          >
            <Download className="w-7 h-7 group-hover:animate-bounce" />
            <span>📱 {isRTL ? "تحميل APK للأندرويد" : "Download APK for Android"}</span>
          </a>
        </div>

        {/* App Info */}
        <div className={`rounded-2xl p-6 mb-12 ${isDark ? "bg-gray-800/50" : "bg-white/10"} backdrop-blur-sm`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-yellow-400">6 MB</p>
              <p className="text-sm text-purple-200">{isRTL ? "حجم التطبيق" : "App Size"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">v1.1</p>
              <p className="text-sm text-purple-200">{isRTL ? "الإصدار" : "Version"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">Android 6+</p>
              <p className="text-sm text-purple-200">{isRTL ? "متطلبات النظام" : "Requirements"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">✓</p>
              <p className="text-sm text-purple-200">{isRTL ? "مجاني" : "Free"}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((f, i) => (
            <div key={i} className={`rounded-2xl p-6 text-center ${isDark ? "bg-gray-800/50" : "bg-white/10"} backdrop-blur-sm`}>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 text-purple-300 mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-purple-200">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Install Instructions */}
        <div className={`rounded-2xl p-6 ${isDark ? "bg-gray-800/50" : "bg-white/10"} backdrop-blur-sm`}>
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            {isRTL ? "📋 طريقة التثبيت" : "📋 How to Install"}
          </h3>
          <div className="space-y-3">
            {[
              isRTL ? "اضغط على زر التحميل أعلاه" : "Click the download button above",
              isRTL ? "افتح الملف المحمّل من الإشعارات أو مدير الملفات" : "Open the downloaded file from notifications or file manager",
              isRTL ? "اسمح بالتثبيت من مصادر غير معروفة إذا طُلب ذلك" : "Allow install from unknown sources if prompted",
              isRTL ? "اضغط 'تثبيت' وانتظر حتى يكتمل" : "Tap 'Install' and wait for completion",
              isRTL ? "افتح التطبيق وسجّل دخولك!" : "Open the app and log in!",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </span>
                <p className="text-purple-100">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <button
            onClick={() => navigate("/parent-auth")}
            className="inline-flex items-center gap-2 text-purple-200 hover:text-white transition-colors font-semibold"
          >
            {isRTL ? "أو سجّل من المتصفح" : "Or sign up from the browser"}
            <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-purple-200 text-xs opacity-70">
        © 2024 Classify by proomnes. All rights reserved.
      </footer>
    </div>
  );
}
