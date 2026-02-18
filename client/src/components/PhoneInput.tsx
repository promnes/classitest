import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { ChevronDown, Search, X, Phone } from "lucide-react";

interface CountryData {
  code: string;
  name: string;
  nameAr: string;
  flag: string;
  dialCode: string;
}

const countries: CountryData[] = [
  // Gulf / Middle East — top priority
  { code: "SA", name: "Saudi Arabia", nameAr: i18next.t("phoneInput.saudiArabia"), flag: "🇸🇦", dialCode: "+966" },
  { code: "EG", name: "Egypt", nameAr: i18next.t("phoneInput.egypt"), flag: "🇪🇬", dialCode: "+20" },
  { code: "AE", name: "UAE", nameAr: i18next.t("phoneInput.uae"), flag: "🇦🇪", dialCode: "+971" },
  { code: "QA", name: "Qatar", nameAr: i18next.t("phoneInput.qatar"), flag: "🇶🇦", dialCode: "+974" },
  { code: "KW", name: "Kuwait", nameAr: i18next.t("phoneInput.kuwait"), flag: "🇰🇼", dialCode: "+965" },
  { code: "BH", name: "Bahrain", nameAr: i18next.t("phoneInput.bahrain"), flag: "🇧🇭", dialCode: "+973" },
  { code: "OM", name: "Oman", nameAr: i18next.t("phoneInput.oman"), flag: "🇴🇲", dialCode: "+968" },
  { code: "YE", name: "Yemen", nameAr: i18next.t("phoneInput.yemen"), flag: "🇾🇪", dialCode: "+967" },
  { code: "JO", name: "Jordan", nameAr: i18next.t("phoneInput.jordan"), flag: "🇯🇴", dialCode: "+962" },
  { code: "IQ", name: "Iraq", nameAr: i18next.t("phoneInput.iraq"), flag: "🇮🇶", dialCode: "+964" },
  { code: "PS", name: "Palestine", nameAr: i18next.t("phoneInput.palestine"), flag: "🇵🇸", dialCode: "+970" },
  { code: "LB", name: "Lebanon", nameAr: i18next.t("phoneInput.lebanon"), flag: "🇱🇧", dialCode: "+961" },
  { code: "SY", name: "Syria", nameAr: i18next.t("phoneInput.syria"), flag: "🇸🇾", dialCode: "+963" },
  // North Africa
  { code: "MA", name: "Morocco", nameAr: i18next.t("phoneInput.morocco"), flag: "🇲🇦", dialCode: "+212" },
  { code: "DZ", name: "Algeria", nameAr: i18next.t("phoneInput.algeria"), flag: "🇩🇿", dialCode: "+213" },
  { code: "TN", name: "Tunisia", nameAr: i18next.t("phoneInput.tunisia"), flag: "🇹🇳", dialCode: "+216" },
  { code: "LY", name: "Libya", nameAr: i18next.t("phoneInput.libya"), flag: "🇱🇾", dialCode: "+218" },
  { code: "SD", name: "Sudan", nameAr: i18next.t("phoneInput.sudan"), flag: "🇸🇩", dialCode: "+249" },
  { code: "SO", name: "Somalia", nameAr: i18next.t("phoneInput.somalia"), flag: "🇸🇴", dialCode: "+252" },
  { code: "MR", name: "Mauritania", nameAr: i18next.t("phoneInput.mauritania"), flag: "🇲🇷", dialCode: "+222" },
  { code: "DJ", name: "Djibouti", nameAr: i18next.t("phoneInput.djibouti"), flag: "🇩🇯", dialCode: "+253" },
  { code: "KM", name: "Comoros", nameAr: i18next.t("phoneInput.comoros"), flag: "🇰🇲", dialCode: "+269" },
  // Europe & Americas
  { code: "US", name: "United States", nameAr: i18next.t("phoneInput.usa"), flag: "🇺🇸", dialCode: "+1" },
  { code: "GB", name: "United Kingdom", nameAr: i18next.t("phoneInput.uk"), flag: "🇬🇧", dialCode: "+44" },
  { code: "FR", name: "France", nameAr: i18next.t("phoneInput.france"), flag: "🇫🇷", dialCode: "+33" },
  { code: "DE", name: "Germany", nameAr: i18next.t("phoneInput.germany"), flag: "🇩🇪", dialCode: "+49" },
  { code: "IT", name: "Italy", nameAr: "إيطاليا", flag: "🇮🇹", dialCode: "+39" },
  { code: "ES", name: "Spain", nameAr: "إسبانيا", flag: "🇪🇸", dialCode: "+34" },
  { code: "NL", name: "Netherlands", nameAr: "هولندا", flag: "🇳🇱", dialCode: "+31" },
  { code: "SE", name: "Sweden", nameAr: "السويد", flag: "🇸🇪", dialCode: "+46" },
  { code: "CA", name: "Canada", nameAr: "كندا", flag: "🇨🇦", dialCode: "+1" },
  { code: "AU", name: "Australia", nameAr: "أستراليا", flag: "🇦🇺", dialCode: "+61" },
  // Asia
  { code: "TR", name: "Turkey", nameAr: i18next.t("phoneInput.turkey"), flag: "🇹🇷", dialCode: "+90" },
  { code: "PK", name: "Pakistan", nameAr: "باكستان", flag: "🇵🇰", dialCode: "+92" },
  { code: "IN", name: "India", nameAr: "الهند", flag: "🇮🇳", dialCode: "+91" },
  { code: "MY", name: "Malaysia", nameAr: "ماليزيا", flag: "🇲🇾", dialCode: "+60" },
  { code: "ID", name: "Indonesia", nameAr: "إندونيسيا", flag: "🇮🇩", dialCode: "+62" },
  { code: "CN", name: "China", nameAr: "الصين", flag: "🇨🇳", dialCode: "+86" },
  { code: "JP", name: "Japan", nameAr: "اليابان", flag: "🇯🇵", dialCode: "+81" },
  { code: "KR", name: "South Korea", nameAr: "كوريا الجنوبية", flag: "🇰🇷", dialCode: "+82" },
  { code: "PH", name: "Philippines", nameAr: "الفلبين", flag: "🇵🇭", dialCode: "+63" },
  { code: "BD", name: "Bangladesh", nameAr: "بنغلاديش", flag: "🇧🇩", dialCode: "+880" },
  // Africa
  { code: "NG", name: "Nigeria", nameAr: "نيجيريا", flag: "🇳🇬", dialCode: "+234" },
  { code: "KE", name: "Kenya", nameAr: "كينيا", flag: "🇰🇪", dialCode: "+254" },
  { code: "ZA", name: "South Africa", nameAr: "جنوب أفريقيا", flag: "🇿🇦", dialCode: "+27" },
  { code: "ET", name: "Ethiopia", nameAr: "إثيوبيا", flag: "🇪🇹", dialCode: "+251" },
];

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
 * Professional phone input with searchable country selector
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  countryCode,
  onCountryCodeChange,
  disabled,
  error,
  placeholder = "5XXXXXXXX",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find(c => c.dialCode === countryCode) || countries[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase().trim();
    return countries.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (c: CountryData) => {
    onCountryCodeChange(c.dialCode);
    setIsOpen(false);
    setSearch("");
    setTimeout(() => phoneInputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
        <Phone className="w-3.5 h-3.5" />
        رقم الهاتف / Phone Number
      </label>

      <div className="flex gap-0 relative" ref={dropdownRef}>
        {/* Country Selector Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-3 py-3 rounded-r-xl border-2 border-l-0
            transition-all duration-200 min-w-[110px] justify-between
            ${isOpen
              ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
            }
            ${error ? "border-red-400 dark:border-red-500" : ""}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          <span className="text-xl leading-none">{selectedCountry?.flag}</span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">
            {selectedCountry?.dialCode}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Phone Number Input */}
        <input
          ref={phoneInputRef}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, "");
            onChange(cleaned);
          }}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={15}
          dir="ltr"
          className={`
            flex-1 px-4 py-3 rounded-l-xl border-2 text-base font-medium tracking-wide
            transition-all duration-200 outline-none min-w-0
            ${error
              ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800"
              : "border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            }
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />

        {/* Dropdown */}
        {isOpen && (
          <div
            className="
              absolute top-full right-0 left-0 mt-1.5 z-50
              bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600
              rounded-xl shadow-2xl overflow-hidden
              animate-in fade-in slide-in-from-top-2 duration-200
            "
            style={{ maxHeight: "340px" }}
          >
            {/* Search Bar */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-2.5 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن دولة..."
                  className="
                    w-full pr-9 pl-8 py-2.5 text-sm rounded-lg
                    bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600
                    text-gray-900 dark:text-white placeholder:text-gray-400
                    outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200
                    dark:focus:border-blue-500 dark:focus:ring-blue-800
                  "
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Country List */}
            <div className="overflow-y-auto" style={{ maxHeight: "270px" }}>
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  لا توجد نتائج
                </div>
              ) : (
                filtered.map((c) => {
                  const isSelected = c.dialCode === countryCode && c.code === selectedCountry?.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`
                        w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors duration-100
                        ${isSelected
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                        }
                      `}
                    >
                      <span className="text-xl leading-none">{c.flag}</span>
                      <span className="flex-1 text-right truncate font-medium">{c.nameAr}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">{c.name}</span>
                      <span className={`tabular-nums font-bold text-xs min-w-[50px] text-left ${
                        isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                      }`}>
                        {c.dialCode}
                      </span>
                      {isSelected && (
                        <span className="text-blue-500 text-xs">✓</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Number Preview */}
      {value && !error && (
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 font-mono" dir="ltr">
          <span className="opacity-60">📲</span> {countryCode}{value}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
};
