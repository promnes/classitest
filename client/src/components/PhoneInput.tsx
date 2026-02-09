import React from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

/**
 * Phone input component with country code selector
 * Supports international phone numbers with validation
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  countryCode,
  onCountryCodeChange,
  disabled,
  error,
  placeholder = "1234567890",
}) => {
  const countryCodes = [
    { code: "+966", label: "🇸🇦 Saudi Arabia" },
    { code: "+20", label: "🇪🇬 Egypt" },
    { code: "+971", label: "🇦🇪 UAE" },
    { code: "+974", label: "🇶🇦 Qatar" },
    { code: "+965", label: "🇰🇼 Kuwait" },
    { code: "+973", label: "🇧🇭 Bahrain" },
    { code: "+968", label: "🇴🇲 Oman" },
    { code: "+966", label: "🇾🇪 Yemen" },
    { code: "+212", label: "🇲🇦 Morocco" },
    { code: "+1", label: "🇺🇸 USA" },
    { code: "+44", label: "🇬🇧 UK" },
    { code: "+33", label: "🇫🇷 France" },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
        📱 رقم الهاتف / Phone Number
      </label>
      
      <div className="flex gap-2">
        {/* Country Code Select */}
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          disabled={disabled}
          className="px-3 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white font-bold"
        >
          {countryCodes.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={value}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, "");
            onChange(cleaned);
          }}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={15}
          className={`flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-gray-900 bg-white ${
            error ? "border-red-500" : ""
          } disabled:opacity-50`}
        />
      </div>

      {/* Display Full Phone Number */}
      {value && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          📲 Full: {countryCode}{value}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500 font-medium">❌ {error}</p>
      )}
    </div>
  );
};
