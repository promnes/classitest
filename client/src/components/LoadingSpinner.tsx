import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";

interface LoadingSpinnerProps {
  /** Full screen with gradient background (for page-level loading) */
  fullScreen?: boolean;
  /** Custom loading text */
  text?: string;
  /** Size of the spinner */
  size?: "sm" | "md" | "lg";
}

/**
 * Reusable loading spinner for inline, section, or full-page loading states.
 *
 * @example
 * // Full page
 * <LoadingSpinner fullScreen />
 *
 * // Inline / section
 * <LoadingSpinner size="sm" text="Loading tasks..." />
 */
export function LoadingSpinner({ fullScreen, text, size = "md" }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  };

  const spinner = (
    <div className={`${sizeClasses[size]} rounded-full border-blue-500/20 border-t-blue-500 animate-spin`} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/90 to-purple-600">
        <div className="text-center text-white">
          <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold">{text || t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      {spinner}
      {text !== undefined ? (
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{text}</p>
      ) : (
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("common.loading")}</p>
      )}
    </div>
  );
}

export default LoadingSpinner;
