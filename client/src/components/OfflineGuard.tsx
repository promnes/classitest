import { useState, useEffect, type ReactNode } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

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
          <WifiOff className="w-12 h-12 text-orange-500" />
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
          <RefreshCw className={`w-5 h-5 ${checking ? "animate-spin" : ""}`} />
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
