import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { OTPInput } from "@/components/OTPInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/LanguageSelector";

function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone/iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "Mac";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown Device";
}

export const OTPVerification = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState(localStorage.getItem("otpEmail") || "");
  const [phone, setPhone] = useState(localStorage.getItem("smsPendingPhone") || "");
  const [otpId, setOtpId] = useState(localStorage.getItem("otpId") || "");
  const [otpPurpose] = useState(localStorage.getItem("otpPurpose") || "login");
  const [method, setMethod] = useState<"email" | "sms">(phone ? "sms" : "email");
  const [time, setTime] = useState(300);
  const [error, setError] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(t => t - 1), 1000);
    if (time <= 0) navigate("/parent-auth");
    return () => clearInterval(timer);
  }, [time, navigate]);

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const deviceId = getOrCreateDeviceId();
      const deviceName = getDeviceName();
      
      if (method === "sms") {
        const res = await fetch("/api/auth/verify-otp-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            phoneNumber: phone, 
            code: otp,
            otpId: otpId || undefined,
            deviceId,
            deviceName,
            rememberDevice,
          }),
        });
        if (!res.ok) throw new Error("Invalid OTP");
        return res.json();
      } else {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            email, 
            code: otp,
            otpId: otpId || undefined,
            deviceId,
            deviceName,
            rememberDevice,
          }),
        });
        if (!res.ok) throw new Error("Invalid OTP");
        return res.json();
      }
    },
    onSuccess: (data: any) => {
      const payload = (data && typeof data === "object" && "data" in data) ? (data as any).data : data;
      if (payload?.token) {
        localStorage.setItem("token", payload.token);
      }
      // Device refresh token is now stored as httpOnly cookie by the server
      // Store flag to indicate this device is trusted
      if (payload?.deviceTrusted) {
        localStorage.setItem("deviceTrusted", "true");
      }
      // Backend returns 'parentId', not 'userId'
      const userId = payload?.parentId || payload?.userId;
      if (userId) {
        localStorage.setItem("userId", userId);
      }
      // Save familyCode for PIN login flow (only if parent has PIN set)
      if (payload?.uniqueCode && payload?.hasPin) {
        localStorage.setItem("familyCode", payload.uniqueCode);
      }
      localStorage.removeItem("otpEmail");
      localStorage.removeItem("smsPendingPhone");
      localStorage.removeItem("otpId");
      localStorage.removeItem("otpPurpose");
      const postAuthRedirect = localStorage.getItem("postAuthRedirect") || "/parent-dashboard";
      if (localStorage.getItem("postAuthRedirect")) {
        localStorage.removeItem("postAuthRedirect");
      }
      navigate(postAuthRedirect);
    },
    onError: (err: any) => {
      setError(err.message || t("otpVerification.wrongCode"));
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      if (method === "sms") {
        const res = await fetch("/api/auth/send-otp-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: phone, purpose: otpPurpose }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to resend SMS OTP");
        }
        return res.json();
      }

      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: otpPurpose }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to resend OTP");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      const payload = (data && typeof data === "object" && "data" in data) ? (data as any).data : data;
      if (payload?.otpId) {
        localStorage.setItem("otpId", payload.otpId);
        setOtpId(payload.otpId);
      }
      setError("");
      setTime(300);
    },
    onError: (err: any) => {
      setError(err.message || t("otpVerification.resendFailed"));
    },
  });

  const isArabic = i18n.language === "ar";

  return (
    <div className={`min-h-screen flex items-center justify-center relative px-3 sm:px-4 py-6 sm:py-8 ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
      <div className="absolute top-4 ltr:right-4 rtl:left-4 z-50"><LanguageSelector /></div>

      <div className={`${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} border rounded-2xl shadow-lg p-5 sm:p-8 max-w-[430px] w-full relative z-10`}>
        <div className="text-center mb-4 sm:mb-5">
          <h1 className={`text-2xl sm:text-3xl font-extrabold mb-2 leading-snug ${isDark ? "text-white" : "text-slate-900"}`}>
          {t("otpVerification.title")}
          </h1>
          <p className={`text-sm sm:text-base leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {t("otpVerification.codeSentTo")} {method === "sms" ? `📱 ${phone.slice(-4)}` : `📧 ${email}`}
          </p>
        </div>

        {/* Method Selector if both methods available */}
        {email && phone && (
          <div className={`flex gap-2 mb-5 sm:mb-6 p-1.5 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
            <button
              type="button"
              onClick={() => {
                setMethod("email");
                setOtp("");
                setError("");
              }}
              className={`flex-1 min-h-11 py-2 px-2.5 sm:px-4 rounded-lg text-sm sm:text-base whitespace-nowrap font-bold transition-all ${
                method === "email"
                  ? "bg-blue-600 text-white shadow"
                  : isDark
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              {t("otpVerification.emailLabel")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("sms");
                setOtp("");
                setError("");
              }}
              className={`flex-1 min-h-11 py-2 px-2.5 sm:px-4 rounded-lg text-sm sm:text-base whitespace-nowrap font-bold transition-all ${
                method === "sms"
                  ? "bg-emerald-600 text-white shadow"
                  : isDark
                  ? "text-slate-300 hover:bg-slate-700"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              {t("otpVerification.smsLabel")}
            </button>
          </div>
        )}

        <OTPInput
          value={otp}
          onChange={setOtp}
          isArabic={isArabic}
          isLoading={verifyOtpMutation.isPending}
          error={error}
          onSubmit={() => verifyOtpMutation.mutate()}
          maskedPhone={method === "sms" ? `***${phone.slice(-4)}` : email}
          timeoutSeconds={time}
          onTimeout={() => navigate("/parent-auth")}
          submitText={t("otpVerification.verifyBtn")}
          resendText={t("otpVerification.resend")}
          onResend={() => resendOtpMutation.mutate()}
        />

        <div className="flex items-start sm:items-center gap-3 mt-4 sm:mt-5 mb-4 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
          <Checkbox
            id="remember-device"
            checked={rememberDevice}
            onCheckedChange={(checked) => setRememberDevice(checked === true)}
            data-testid="checkbox-remember-device"
          />
          <Label
            htmlFor="remember-device"
            className={`text-sm leading-relaxed cursor-pointer ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            {t("otpVerification.rememberDevice")}
          </Label>
        </div>

        <button
          onClick={() => navigate("/parent-auth")}
          disabled={verifyOtpMutation.isPending}
          className={`w-full mt-3 sm:mt-4 px-4 py-2.5 sm:py-3 border-2 rounded-xl text-sm sm:text-base font-bold transition-all ${
            isDark
              ? "border-slate-600 text-slate-300 hover:bg-slate-800"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          } disabled:opacity-50`}
        >
          {t("otpVerification.cancel")}
        </button>
      </div>
    </div>
  );
};
