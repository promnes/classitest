import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface SEOSettings {
  siteTitle: string;
  siteDescription: string;
  keywords: string;
  ogImage: string;
  favicon: string;
  twitterHandle: string;
  googleVerification: string;
  robots: string;
  canonicalUrl: string;
  themeColor: string;
}

const isBrowser = typeof window !== "undefined";

// Per-route SEO metadata so each page gets a unique title/description
const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  "/": { title: "Classify — منصة تعليمية تفاعلية للأطفال", description: "منصة تعليمية ممتعة للأطفال مع رقابة أبوية ذكية وألعاب تفاعلية. Fun educational platform for kids." },
  "/parent-auth": { title: "دخول ولي الأمر | Classify", description: "تسجيل الدخول أو إنشاء حساب ولي أمر جديد لإدارة تعليم أطفالك." },
  "/child-link": { title: "دخول الطفل | Classify", description: "سجّل دخول طفلك للبدء باللعب والتعلم." },
  "/parent-dashboard": { title: "لوحة تحكم ولي الأمر | Classify", description: "إدارة ومتابعة تقدم أطفالك التعليمي." },
  "/child-games": { title: "ألعاب تعليمية | Classify", description: "العب ألعاب تعليمية ممتعة وتعلم مهارات جديدة." },
  "/parent-store": { title: "المتجر | Classify", description: "تصفح المنتجات والمكافآت التعليمية لأطفالك." },
  "/child-store": { title: "متجر الطفل | Classify", description: "تصفح المكافآت والهدايا المتاحة لك." },
  "/privacy-policy": { title: "سياسة الخصوصية | Classify", description: "سياسة الخصوصية وحماية البيانات الشخصية لمنصة Classify." },
  "/privacy": { title: "الخصوصية | Classify", description: "معلومات حول خصوصية بياناتك في Classify." },
  "/terms": { title: "شروط الاستخدام | Classify", description: "شروط وأحكام استخدام منصة Classify التعليمية." },
  "/about": { title: "من نحن | Classify", description: "تعرف على فريق Classify ورسالتنا التعليمية." },
  "/contact": { title: "تواصل معنا | Classify", description: "تواصل مع فريق دعم Classify." },
  "/child-safety": { title: "سلامة الأطفال | Classify", description: "كيف نحمي أطفالك ونضمن سلامتهم على المنصة." },
  "/refund-policy": { title: "سياسة الاسترداد | Classify", description: "سياسة استرداد المبالغ والمشتريات في Classify." },
  "/cookie-policy": { title: "سياسة ملفات الارتباط | Classify", description: "كيف نستخدم ملفات تعريف الارتباط في Classify." },
  "/legal": { title: "المركز القانوني | Classify", description: "جميع السياسات والشروط القانونية لمنصة Classify." },
  "/download": { title: "تحميل التطبيق | Classify", description: "حمّل تطبيق Classify على هاتفك." },
  "/trial-games": { title: "ألعاب تجريبية | Classify", description: "جرب ألعابنا التعليمية مجاناً." },
  "/wallet": { title: "المحفظة | Classify", description: "إدارة رصيدك ومعاملاتك المالية." },
  "/notifications": { title: "الإشعارات | Classify", description: "إشعاراتك ومستجداتك." },
  "/subjects": { title: "المواد الدراسية | Classify", description: "تصفح المواد والموضوعات التعليمية." },
  "/settings": { title: "الإعدادات | Classify", description: "إعدادات حسابك وتفضيلاتك." },
  "/delete-account": { title: "حذف الحساب | Classify", description: "طلب حذف حسابك وبياناتك." },
  "/accessibility": { title: "إمكانية الوصول | Classify", description: "التزامنا بمعايير إمكانية الوصول." },
  "/acceptable-use": { title: "الاستخدام المقبول | Classify", description: "سياسة الاستخدام المقبول لمنصة Classify." },
  "/forgot-password": { title: "استعادة كلمة المرور | Classify", description: "استعد كلمة مرورك عبر البريد الإلكتروني." },
};

export function useSEO() {
  const [location] = useLocation();

  const { data: seoSettings } = useQuery<SEOSettings>({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const res = await fetch("/api/seo-settings");
      if (!res.ok) {
        return {
          siteTitle: "Classify - تطبيق الرقابة الأبوية",
          siteDescription: "تطبيق شامل للرقابة الأبوية يساعد الآباء في متابعة أطفالهم وتعليمهم",
          keywords: "رقابة أبوية, تعليم أطفال, مهام, ألعاب تعليمية, مكافآت",
          ogImage: "",
          favicon: "",
          twitterHandle: "",
          googleVerification: "",
          robots: "index, follow",
          canonicalUrl: "",
          themeColor: "#6B4D9D"
        };
      }
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 1000 * 60 * 5,
    enabled: isBrowser,
  });

  useEffect(() => {
    if (!isBrowser || !seoSettings) return;

    // Per-route SEO: use route-specific title/description if available
    const routeSeo = ROUTE_SEO[location];
    const pageTitle = routeSeo?.title || seoSettings.siteTitle || "Classify";
    const pageDescription = routeSeo?.description || seoSettings.siteDescription;

    document.title = pageTitle;

    // Set html lang and dir based on current language
    const htmlEl = document.documentElement;
    const currentLang = htmlEl.getAttribute("lang") || "ar";
    htmlEl.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");

    const updateMeta = (name: string, content: string, isProperty?: boolean) => {
      if (!content) return;
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    updateMeta("description", pageDescription);
    updateMeta("keywords", seoSettings.keywords);
    updateMeta("robots", seoSettings.robots);
    updateMeta("theme-color", seoSettings.themeColor);

    if (seoSettings.googleVerification) {
      updateMeta("google-site-verification", seoSettings.googleVerification);
    }

    updateMeta("og:title", pageTitle, true);
    updateMeta("og:description", pageDescription, true);
    updateMeta("og:type", "website", true);
    updateMeta("og:locale", currentLang === "ar" ? "ar_EG" : "en_US", true);
    updateMeta("og:site_name", "Classify", true);
    if (seoSettings.ogImage) {
      updateMeta("og:image", seoSettings.ogImage, true);
    }

    // Dynamic canonical URL per page
    const currentCanonical = `${window.location.origin}${location}`;
    updateMeta("og:url", currentCanonical, true);

    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", pageTitle);
    updateMeta("twitter:description", pageDescription);
    if (seoSettings.ogImage) {
      updateMeta("twitter:image", seoSettings.ogImage);
    }
    if (seoSettings.twitterHandle) {
      updateMeta("twitter:site", seoSettings.twitterHandle);
      updateMeta("twitter:creator", seoSettings.twitterHandle);
    }

    if (seoSettings.favicon) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = seoSettings.favicon;
    }

    // Dynamic canonical link per page
    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = currentCanonical;

  }, [seoSettings, location]);

  return seoSettings;
}
