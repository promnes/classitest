import React from "react";

interface MethodSelectorProps {
  selectedMethod: "email" | "sms";
  onMethodChange: (method: "email" | "sms") => void;
  availableMethods: ("email" | "sms")[];
  disabled?: boolean;
  isDark?: boolean;
}

/**
 * OTP method selector component
 * Allows users to choose between Email and SMS for OTP verification
 */
export const OTPMethodSelector: React.FC<MethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  availableMethods,
  disabled = false,
  isDark = false,
}) => {
  return (
    <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
      {availableMethods.includes("email") && (
        <button
          type="button"
          onClick={() => onMethodChange("email")}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
            selectedMethod === "email"
              ? "bg-blue-500 text-white shadow-md"
              : isDark
              ? "text-gray-300 hover:bg-gray-600"
              : "text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          📧 البريد
        </button>
      )}

      {availableMethods.includes("sms") && (
        <button
          type="button"
          onClick={() => onMethodChange("sms")}
          disabled={disabled}
          className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
            selectedMethod === "sms"
              ? "bg-green-500 text-white shadow-md"
              : isDark
              ? "text-gray-300 hover:bg-gray-600"
              : "text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          📱 SMS
        </button>
      )}
    </div>
  );
};
