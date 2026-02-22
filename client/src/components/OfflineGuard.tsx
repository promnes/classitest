import { useState, useEffect, type ReactNode } from "react";

// SVG icons inline to avoid pulling lucide-react into the entry chunk
const WifiOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M13.83 10.17A10 10 0 0 1 19 12.86"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);
const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={spinning ? "animate-spin" : ""}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);

/**
 * OfflineGuard — Shows a friendly offline screen when there's no internet connection.
 * Required for Google Play approval: apps must not show blank/error screens when offline.
 */
export function OfflineGuard({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    try {
      // Try to reach the API
      const apiBase = (window as any).__API_BASE__ || "";
      const res = await fetch(apiBase + "/api/health", {
        method: "GET",
        cache: "no-store",
      });
      if (res.ok) {
        setIsOnline(true);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setChecking(false);
    }
  };

  if (isOnline) return <>{children}</>;

  const isRTL =
    document.documentElement.lang === "ar" ||
    document.documentElement.dir === "rtl" ||
    localStorage.getItem("i18nextLng") === "ar";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="text-center max-w-sm space-y-6">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
          <WifiOffIcon />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {isRTL ? "لا يوجد اتصال بالإنترنت" : "No Internet Connection"}
        </h1>

        {/* Description */}
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
          {isRTL
            ? "تأكد من اتصالك بالإنترنت وحاول مرة أخرى"
            : "Please check your internet connection and try again"}
        </p>

        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={checking}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl font-medium transition-colors"
        >
          <RefreshIcon spinning={checking} />
          {checking
            ? isRTL
              ? "جاري التحقق..."
              : "Checking..."
            : isRTL
              ? "إعادة المحاولة"
              : "Try Again"}
        </button>

        {/* App branding */}
        <p className="text-xs text-gray-400 dark:text-gray-500 pt-4">
          Classify
        </p>
      </div>
    </div>
  );
}
