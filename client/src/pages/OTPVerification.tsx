import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { OTPInput } from "@/components/OTPInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
      localStorage.removeItem("otpEmail");
      localStorage.removeItem("smsPendingPhone");
      localStorage.removeItem("otpId");
      localStorage.removeItem("otpPurpose");
      navigate("/parent-dashboard");
    },
    onError: (err: any) => {
      setError(err.message || "رمز خاطئ أو منتهي الصلاحية");
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
      setError(err.message || "فشل إعادة الإرسال");
    },
  });

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
      <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow-lg p-8 max-w-md w-full`}>
        <h1 className={`text-3xl font-bold text-center mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
          🔐 التحقق من الهوية
        </h1>
        <p className={`text-center mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          تم إرسال رمز تحقق إلى {method === "sms" ? `📱 ${phone.slice(-4)}` : `📧 ${email}`}
        </p>

        {/* Method Selector if both methods available */}
        {email && phone && (
          <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMethod("email");
                setOtp("");
                setError("");
              }}
              className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                method === "email"
                  ? "bg-blue-500 text-white"
                  : isDark
                  ? "text-gray-300 hover:bg-gray-600"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              📧 البريد
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("sms");
                setOtp("");
                setError("");
              }}
              className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                method === "sms"
                  ? "bg-green-500 text-white"
                  : isDark
                  ? "text-gray-300 hover:bg-gray-600"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              📱 SMS
            </button>
          </div>
        )}

        <OTPInput
          value={otp}
          onChange={setOtp}
          isLoading={verifyOtpMutation.isPending}
          error={error}
          onSubmit={() => verifyOtpMutation.mutate()}
          maskedPhone={method === "sms" ? `***${phone.slice(-4)}` : email}
          timeoutSeconds={time}
          onTimeout={() => navigate("/parent-auth")}
          submitText="✅ التحقق"
          resendText="إعادة إرسال"
          onResend={() => resendOtpMutation.mutate()}
        />

        <div className="flex items-center gap-3 mt-4 mb-4">
          <Checkbox
            id="remember-device"
            checked={rememberDevice}
            onCheckedChange={(checked) => setRememberDevice(checked === true)}
            data-testid="checkbox-remember-device"
          />
          <Label
            htmlFor="remember-device"
            className={`text-sm cursor-pointer ${isDark ? "text-gray-300" : "text-gray-700"}`}
          >
            تذكر هذا الجهاز (لا تطلب رمز التحقق مرة أخرى)
          </Label>
        </div>

        <button
          onClick={() => navigate("/parent-auth")}
          disabled={verifyOtpMutation.isPending}
          className={`w-full mt-4 px-4 py-2 border-2 rounded-lg font-bold transition-all ${
            isDark
              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          } disabled:opacity-50`}
        >
          ← إلغاء
        </button>
      </div>
    </div>
  );
};
