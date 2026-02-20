import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Info, ArrowLeft, ArrowRight, GraduationCap, Heart, Shield, Users, Star } from "lucide-react";

export const AboutUs = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const values = [
    { icon: <Shield className="w-6 h-6" />, title: t("legal.about.value1Title"), desc: t("legal.about.value1Desc") },
    { icon: <GraduationCap className="w-6 h-6" />, title: t("legal.about.value2Title"), desc: t("legal.about.value2Desc") },
    { icon: <Heart className="w-6 h-6" />, title: t("legal.about.value3Title"), desc: t("legal.about.value3Desc") },
    { icon: <Users className="w-6 h-6" />, title: t("legal.about.value4Title"), desc: t("legal.about.value4Desc") },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-teal-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={t("common.back")}
            >
              <BackArrow className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Info className="w-6 h-6" />
              <h1 className="text-xl md:text-2xl font-bold">{t("legal.about.pageTitle")}</h1>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Mission Card */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-6 text-center ${isDark ? "bg-teal-900/20" : "bg-teal-50"}`}>
            <Star className={`w-12 h-12 mx-auto mb-4 ${isDark ? "text-teal-400" : "text-teal-600"}`} />
            <h2 className={`text-2xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("legal.about.missionTitle")}
            </h2>
            <p className={`text-lg leading-relaxed max-w-2xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {t("legal.about.missionText")}
            </p>
          </div>
        </div>

        {/* About App */}
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6">
            <h2 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("legal.about.whatIsTitle")}
            </h2>
            <p className={`leading-relaxed mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {t("legal.about.whatIsText")}
            </p>
            <p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {t("legal.about.featuresText")}
            </p>
          </div>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {values.map((v, idx) => (
            <div
              key={idx}
              className={`rounded-2xl shadow-lg p-6 ${isDark ? "bg-gray-800" : "bg-white"}`}
            >
              <div className={`p-3 rounded-xl inline-block mb-3 ${isDark ? "bg-teal-900/30 text-teal-400" : "bg-teal-100 text-teal-600"}`}>
                {v.icon}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>{v.title}</h3>
              <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Version */}
        <div className={`rounded-2xl shadow-lg px-6 md:px-8 py-5 text-center ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Classify v1.3.0 — {t("legal.about.copyright")}
          </p>
        </div>
      </main>
    </div>
  );
};

export default AboutUs;
