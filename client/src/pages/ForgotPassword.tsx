import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { OTPInput } from "@/components/OTPInput";
import { PhoneInput } from "@/components/PhoneInput";
import { LanguageSelector } from "@/components/LanguageSelector";

export const ForgotPassword = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "newPassword">("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [method, setMethod] = useState<"email" | "sms">("email");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const otpTimeoutSeconds = 600;
  const fullPhone = `${countryCode}${phone.replace(/^\+/, "")}`;

  const sendResetOtpMutation = useMutation({
    mutationFn: async () => {
      const endpoint = method === "sms" ? "/api/auth/forgot-password-sms" : "/api/auth/forgot-password";
      const body = method === "sms" ? { phoneNumber: fullPhone } : { email };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      const payload = (data && typeof data === "object" && "data" in data) ? (data as any).data : data;
      if (payload?.otpId) {
        localStorage.setItem("otpId", payload.otpId);
      }
      setStep("otp");
      setSuccess(t("forgotPassword.otpSent"));
      setError("");
    },
    onError: (err: any) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const otpId = localStorage.getItem("otpId") || undefined;
      const endpoint = method === "sms" ? "/api/auth/verify-reset-otp-sms" : "/api/auth/verify-reset-otp";
      const body = method === "sms"
        ? { phoneNumber: fullPhone, code: otp, otpId }
        : { email, code: otp, otpId };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setStep("newPassword");
      setSuccess(t("forgotPassword.otpVerified"));
      setError("");
    },
    onError: (err: any) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error(t("forgotPassword.passwordsMismatch"));
      }
      if (newPassword.length < 6) {
        throw new Error(t("forgotPassword.passwordTooShort"));
      }
      const otpId = localStorage.getItem("otpId") || undefined;
      const endpoint = method === "sms" ? "/api/auth/reset-password-sms" : "/api/auth/reset-password";
      const body = method === "sms"
        ? { phoneNumber: fullPhone, code: otp, newPassword, otpId }
        : { email, code: otp, newPassword, otpId };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setSuccess(t("forgotPassword.passwordChanged"));
      setError("");
      localStorage.removeItem("otpId");
      setTimeout(() => navigate("/parent-auth"), 2000);
    },
    onError: (err: any) => {
      setError(err.message);
      setSuccess("");
    },
  });

    const handleOtpTimeout = () => {
    setStep("email");
    setError("انتهت صلاحية الرمز، أعد الإرسال");
    setSuccess("");
    setOtp("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (step === "email") {
      sendResetOtpMutation.mutate();
    } else if (step === "otp") {
      verifyOtpMutation.mutate();
    } else if (step === "newPassword") {
      resetPasswordMutation.mutate();
    }
  };

  const isPending = sendResetOtpMutation.isPending || verifyOtpMutation.isPending || resetPasswordMutation.isPending;

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${
      isDark ? "bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" : "bg-gradient-to-br from-blue-400 to-blue-600"
    }`}>
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate("/parent-auth")}
            className="text-white flex items-center gap-2 hover:opacity-80"
            data-testid="button-back"
          >
            ← {t("back")}
          </button>
          <LanguageSelector />
        </div>

        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-3xl p-8 shadow-2xl`}>
          <h1 className={`text-2xl font-bold text-center mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
            🔑 {t("forgotPassword.title")}
          </h1>
          <p className={`text-center mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {step === "email" && t("forgotPassword.enterEmail")}
            {step === "otp" && t("forgotPassword.enterOtp")}
            {step === "newPassword" && t("forgotPassword.enterNewPassword")}
          </p>

          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step === "email" || step === "otp" || step === "newPassword" 
                  ? "bg-blue-500 text-white" 
                  : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"
              }`}>1</div>
              <div className={`w-8 h-1 ${step === "otp" || step === "newPassword" ? "bg-blue-500" : isDark ? "bg-gray-700" : "bg-gray-200"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step === "otp" || step === "newPassword" 
                  ? "bg-blue-500 text-white" 
                  : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"
              }`}>2</div>
              <div className={`w-8 h-1 ${step === "newPassword" ? "bg-blue-500" : isDark ? "bg-gray-700" : "bg-gray-200"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step === "newPassword" 
                  ? "bg-blue-500 text-white" 
                  : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"
              }`}>3</div>
            </div>
          </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className={`flex gap-2 mb-2 p-2 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                <button
                  type="button"
                  onClick={() => {
                    setMethod("email");
                    setStep("email");
                    setError("");
                    setSuccess("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                    method === "email" ? "bg-blue-500 text-white" : isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  📧 البريد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod("sms");
                    setStep("email");
                    setError("");
                    setSuccess("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                    method === "sms" ? "bg-green-500 text-white" : isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  📱 SMS
                </button>
              </div>
              {step === "email" && method === "email" && (
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-400 ${
                    isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-900 bg-white"
                  }`}
                  required
                  data-testid="input-email"
                />
              </div>
            )}

              {step === "email" && method === "sms" && (
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  countryCode={countryCode}
                  onCountryCodeChange={setCountryCode}
                  disabled={isPending}
                  error={error}
                  placeholder="1234567890"
                />
              )}

              {step === "otp" && (
              <OTPInput
                value={otp}
                onChange={setOtp}
                isLoading={verifyOtpMutation.isPending}
                error={error}
                onSubmit={() => verifyOtpMutation.mutate()}
                  maskedPhone={method === "sms" ? fullPhone : email}
                timeoutSeconds={otpTimeoutSeconds}
                onTimeout={handleOtpTimeout}
                submitText={t("forgotPassword.verifyOtp")}
                resendText={t("forgotPassword.sendOtp")}
                onResend={() => {
                  setError("");
                  sendResetOtpMutation.mutate();
                }}
              />
            )}

            {step === "newPassword" && (
              <>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-400 ${
                      isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-900 bg-white"
                    }`}
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    تأكيد كلمة المرور
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-400 ${
                      isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-900 bg-white"
                    }`}
                    required
                    minLength={6}
                    data-testid="input-confirm-password"
                  />
                </div>
              </>
            )}

            {error && <p className="text-red-500 text-sm text-center" data-testid="text-error">{error}</p>}
            {success && <p className="text-green-500 text-sm text-center" data-testid="text-success">{success}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
              data-testid="button-submit"
            >
              {isPending ? t("forgotPassword.processing") : 
               step === "email" ? t("forgotPassword.sendOtp") :
               step === "otp" ? t("forgotPassword.verifyOtp") :
               t("forgotPassword.changePassword")}
            </button>
          </form>

          {step !== "email" && (
            <button
              onClick={() => {
                if (step === "otp") setStep("email");
                else if (step === "newPassword") setStep("otp");
                setError("");
                setSuccess("");
              }}
              className={`w-full mt-4 text-sm ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-600"}`}
              data-testid="button-back-step"
            >
              ← {t("backToPreviousStep")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
