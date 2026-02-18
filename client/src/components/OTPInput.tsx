import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  error?: string;
  onSubmit: () => void;
  length?: number;
  maskedPhone?: string;
  timeoutSeconds?: number;
  onTimeout?: () => void;
  submitText?: string;
  resendText?: string;
  onResend?: () => void;
}

/**
 * OTP code input component with countdown timer
 * Displays 6-digit input with auto-focus and resend option
 */
export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  isLoading = false,
  error,
  onSubmit,
  length = 6,
  maskedPhone,
  timeoutSeconds = 300,
  onTimeout,
  submitText = "✅ التحقق",
  resendText = "إعادة إرسال",
  onResend,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          onTimeout?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  const handleResend = () => {
    onResend?.();
    setTimeLeft(timeoutSeconds);
    setCanResend(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="space-y-4">
      {/* Info Message */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
          📨 تم إرسال رمز التحقق إلى
          <br />
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {maskedPhone || "رقمك"}
          </span>
        </p>
      </div>

      {/* OTP Input */}
      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
          أدخل الرمز (6 أرقام) / Enter Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, "").slice(0, length);
            onChange(cleaned);
          }}
          maxLength={length}
          disabled={isLoading}
          className={`w-full px-4 py-4 text-center text-4xl tracking-[0.5em] font-bold border-2 rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            error
              ? "border-red-500 focus:border-red-500"
              : "border-gray-300 focus:border-blue-400"
          } disabled:opacity-50`}
          placeholder="000000"
        />
      </div>

      {/* Timer */}
      <div className="text-center">
        <p className={`text-sm font-bold ${timeLeft < 30 ? "text-red-500" : "text-gray-600 dark:text-gray-400"}`}>
          ⏱️ Time remaining: {minutes}:{seconds.toString().padStart(2, "0")}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500 font-medium text-center">❌ {error}</p>
      )}

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={isLoading || value.length !== length}
        className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "🔄 جاري التحقق..." : submitText}
      </button>

      {/* Resend Button */}
      <button
        onClick={handleResend}
        disabled={isLoading || timeLeft > 30}
        className={`w-full px-4 py-2 border-2 rounded-lg font-bold transition-all ${
          isLoading || timeLeft > 30
            ? "border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
            : "border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        }`}
      >
        {isLoading ? "🔄 جاري الإرسال..." : `${resendText} (${formatTime(timeLeft)})`}
      </button>
    </div>
  );
};
