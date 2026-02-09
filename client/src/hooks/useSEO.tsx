import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

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

export function useSEO() {
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
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    enabled: isBrowser,
  });

  useEffect(() => {
    if (!isBrowser || !seoSettings) return;

    document.title = seoSettings.siteTitle || "Classify";

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

    updateMeta("description", seoSettings.siteDescription);
    updateMeta("keywords", seoSettings.keywords);
    updateMeta("robots", seoSettings.robots);
    updateMeta("theme-color", seoSettings.themeColor);

    if (seoSettings.googleVerification) {
      updateMeta("google-site-verification", seoSettings.googleVerification);
    }

    updateMeta("og:title", seoSettings.siteTitle, true);
    updateMeta("og:description", seoSettings.siteDescription, true);
    updateMeta("og:type", "website", true);
    if (seoSettings.ogImage) {
      updateMeta("og:image", seoSettings.ogImage, true);
    }
    if (seoSettings.canonicalUrl) {
      updateMeta("og:url", seoSettings.canonicalUrl, true);
    }

    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", seoSettings.siteTitle);
    updateMeta("twitter:description", seoSettings.siteDescription);
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

    if (seoSettings.canonicalUrl) {
      let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = seoSettings.canonicalUrl;
    }

  }, [seoSettings]);

  return seoSettings;
}
