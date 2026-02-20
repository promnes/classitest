import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { FileText, ArrowLeft, ArrowRight, CheckCircle, Users, Shield, Copyright, AlertTriangle, XCircle, RefreshCw, Mail } from "lucide-react";

export const Terms = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const sections = [
    {
      icon: <CheckCircle className="w-5 h-5" />,
      title: t("legal.terms.acceptTitle"),
      content: t("legal.terms.acceptText"),
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: t("legal.terms.responsibilitiesTitle"),
      items: [
        t("legal.terms.resp1"),
        t("legal.terms.resp2"),
        t("legal.terms.resp3"),
        t("legal.terms.resp4"),
      ],
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: t("legal.terms.parentalTitle"),
      content: t("legal.terms.parentalText"),
    },
    {
      icon: <Copyright className="w-5 h-5" />,
      title: t("legal.terms.ipTitle"),
      content: t("legal.terms.ipText"),
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: t("legal.terms.liabilityTitle"),
      content: t("legal.terms.liabilityText"),
    },
    {
      icon: <XCircle className="w-5 h-5" />,
      title: t("legal.terms.terminationTitle"),
      content: t("legal.terms.terminationText"),
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: t("legal.terms.changesTitle"),
      content: t("legal.terms.changesText"),
    },
    {
      icon: <Mail className="w-5 h-5" />,
      title: t("legal.terms.contactTitle"),
      content: t("legal.terms.contactText"),
    },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-purple-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
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
              <FileText className="w-6 h-6" />
              <h1 className="text-xl md:text-2xl font-bold">{t("legal.terms.pageTitle")}</h1>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-5 ${isDark ? "border-b border-gray-700" : "bg-purple-50 border-b border-purple-100"}`}>
            <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Classify — {t("legal.terms.subtitle")}
            </p>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {t("legal.terms.lastUpdated")}: {t("legal.terms.updateDate")}
            </p>
          </div>

          <div className="px-6 md:px-8 py-6 space-y-7">
            {sections.map((section, idx) => (
              <section key={idx}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
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
                          <span className="text-purple-500 mt-1.5 shrink-0">•</span>
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
