import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { Download, ArrowRight, Shield, Smartphone, Zap, ChevronRight, CheckCircle, Lock, Eye, ShieldCheck, Star, Users, BadgeCheck } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function DownloadApp() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";

  const features = [
    { icon: <Shield className="w-8 h-8" />, title: t("downloadAppPage.smartParentalControl"), desc: isRTL ? "تحكم كامل في أنشطة طفلك" : "Full control over your child's activities" },
    { icon: <Smartphone className="w-8 h-8" />, title: t("downloadAppPage.easyToUse"), desc: isRTL ? "واجهة بسيطة وسهلة للأطفال والآباء" : "Simple interface for kids and parents" },
    { icon: <Zap className="w-8 h-8" />, title: isRTL ? "مهام وألعاب تعليمية" : "Educational Tasks & Games", desc: isRTL ? "تعلم ممتع مع مكافآت حقيقية" : "Fun learning with real rewards" },
  ];

  const trustBadges = [
    { icon: <ShieldCheck className="w-5 h-5 text-green-400" />, text: isRTL ? "خالي من الفيروسات" : "Virus Free" },
    { icon: <Lock className="w-5 h-5 text-blue-400" />, text: isRTL ? "بيانات مشفرة" : "Encrypted Data" },
    { icon: <Eye className="w-5 h-5 text-purple-400" />, text: isRTL ? "بدون إعلانات" : "No Ads" },
    { icon: <BadgeCheck className="w-5 h-5 text-yellow-400" />, text: isRTL ? "موثق ومعتمد" : "Verified & Trusted" },
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
            <LanguageSelector />
            <img src="/logo.jpg" alt="Classify" className="h-10 w-10 rounded-full border-2 border-yellow-400 object-cover" />
            <h1 className="text-xl font-bold text-white">Classify</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-8">
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

        {/* Trust Badges Row */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {trustBadges.map((badge, i) => (
            <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-full ${isDark ? "bg-gray-800/70" : "bg-white/15"} backdrop-blur-sm border ${isDark ? "border-gray-700" : "border-white/20"}`}>
              {badge.icon}
              <span className="text-sm font-medium text-white">{badge.text}</span>
            </div>
          ))}
        </div>

        {/* Download Button */}
        <div className="flex justify-center mb-6">
          <a
            href="/classify-app.apk"
            download="Classify.apk"
            className="group flex items-center gap-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-10 py-5 rounded-2xl shadow-2xl hover:shadow-green-500/30 transition-all hover:-translate-y-1 text-xl font-bold"
          >
            <Download className="w-7 h-7 group-hover:animate-bounce" />
            <span>📱 {isRTL ? "تحميل APK للأندرويد" : "Download APK for Android"}</span>
          </a>
        </div>

        {/* Verified Developer Badge */}
        <div className="flex justify-center mb-12">
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl ${isDark ? "bg-green-900/30 border-green-700" : "bg-green-500/20 border-green-400/40"} border`}>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <ShieldCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-300">
                {isRTL ? "مطور موثق" : "Verified Developer"}
              </p>
              <p className="text-xs text-green-400/70">
                Classify by Proomnes — {isRTL ? "التطبيق آمن ومعتمد" : "Safe & Trusted App"}
              </p>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className={`rounded-2xl p-6 mb-8 ${isDark ? "bg-gray-800/50" : "bg-white/10"} backdrop-blur-sm`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-yellow-400">16 MB</p>
              <p className="text-sm text-purple-200">{isRTL ? "حجم التطبيق" : "App Size"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">v1.3</p>
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

        {/* Security & Privacy Section */}
        <div className={`rounded-2xl p-6 mb-8 ${isDark ? "bg-gray-800/50" : "bg-white/10"} backdrop-blur-sm border ${isDark ? "border-green-800/30" : "border-green-400/20"}`}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            {isRTL ? "الأمان والخصوصية" : "Security & Privacy"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: "🔒", text: isRTL ? "اتصال HTTPS مشفر بالكامل" : "Fully encrypted HTTPS connection" },
              { icon: "🛡️", text: isRTL ? "لا نشارك بياناتك مع أطراف ثالثة" : "We never share your data with third parties" },
              { icon: "👨‍👩‍👧", text: isRTL ? "تحكم كامل للوالدين في كل شيء" : "Full parental control over everything" },
              { icon: "🔐", text: isRTL ? "كلمات المرور مشفرة ومحمية" : "Passwords are encrypted and protected" },
              { icon: "📵", text: isRTL ? "لا إعلانات ولا تتبع" : "No ads, no tracking" },
              { icon: "✅", text: isRTL ? "تطبيق مفتوح المصدر وشفاف" : "Open source and transparent app" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <span className="text-lg">{item.icon}</span>
                <p className="text-sm text-purple-100">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* User Stats */}
        <div className={`rounded-2xl p-6 mb-8 ${isDark ? "bg-gray-800/50" : "bg-white/10"} backdrop-blur-sm`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{isRTL ? "آمن" : "Safe"}</p>
              <p className="text-xs text-purple-200">{isRTL ? "للأطفال والعائلات" : "For Kids & Families"}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">4.8</p>
              <p className="text-xs text-purple-200">{isRTL ? "تقييم المستخدمين" : "User Rating"}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <ShieldCheck className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-purple-200">{isRTL ? "آمن ونظيف" : "Safe & Clean"}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        © 2025 Classify by Proomnes. All rights reserved.
      </footer>
    </div>
  );
}
