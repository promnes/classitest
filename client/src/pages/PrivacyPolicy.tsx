import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Shield, ArrowLeft, ArrowRight, Lock, Eye, UserX, Database, Mail, Baby, RefreshCw, FileText } from "lucide-react";

export const PrivacyPolicy = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const sections = [
    {
      icon: <Eye className="w-5 h-5" />,
      title: t("legal.privacy.introTitle"),
      content: t("legal.privacy.introText"),
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: t("legal.privacy.collectTitle"),
      items: [
        t("legal.privacy.collect1"),
        t("legal.privacy.collect2"),
        t("legal.privacy.collect3"),
        t("legal.privacy.collect4"),
        t("legal.privacy.collect5"),
        t("legal.privacy.collect6"),
      ],
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: t("legal.privacy.useTitle"),
      items: [
        t("legal.privacy.use1"),
        t("legal.privacy.use2"),
        t("legal.privacy.use3"),
        t("legal.privacy.use4"),
        t("legal.privacy.use5"),
        t("legal.privacy.use6"),
      ],
    },
    {
      icon: <Baby className="w-5 h-5" />,
      title: t("legal.privacy.childTitle"),
      content: t("legal.privacy.childText"),
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: t("legal.privacy.securityTitle"),
      content: t("legal.privacy.securityText"),
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: t("legal.privacy.sharingTitle"),
      content: t("legal.privacy.sharingText"),
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: t("legal.privacy.rightsTitle"),
      items: [
        t("legal.privacy.right1"),
        t("legal.privacy.right2"),
        t("legal.privacy.right3"),
        t("legal.privacy.right4"),
        t("legal.privacy.right5"),
        t("legal.privacy.right6"),
      ],
    },
    {
      icon: <UserX className="w-5 h-5" />,
      title: t("legal.privacy.deleteTitle"),
      content: t("legal.privacy.deleteText"),
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: t("legal.privacy.updatesTitle"),
      content: t("legal.privacy.updatesText"),
    },
    {
      icon: <Mail className="w-5 h-5" />,
      title: t("legal.privacy.contactTitle"),
      content: t("legal.privacy.contactText"),
    },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-blue-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
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
              <Shield className="w-6 h-6" />
              <h1 className="text-xl md:text-2xl font-bold">{t("legal.privacy.pageTitle")}</h1>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-5 ${isDark ? "border-b border-gray-700" : "bg-blue-50 border-b border-blue-100"}`}>
            <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Classify — {t("legal.privacy.subtitle")}
            </p>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {t("legal.privacy.lastUpdated")}: {t("legal.privacy.updateDate")}
            </p>
          </div>

          <div className="px-6 md:px-8 py-6 space-y-7">
            {sections.map((section, idx) => (
              <section key={idx}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                    {section.icon}
                  </div>
                  <h2 className={`text-lg md:text-xl font-bold pt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {idx + 1}. {section.title}
                  </h2>
                </div>
                <div className={`${isRTL ? "pr-12" : "pl-12"}`}>
                  {section.content && (
                    <p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {section.content}
                    </p>
                  )}
                  {section.items && (
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className={`flex items-start gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          <span className="text-blue-500 mt-1.5 shrink-0">•</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {idx < sections.length - 1 && (
                  <div className={`mt-6 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`} />
                )}
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
