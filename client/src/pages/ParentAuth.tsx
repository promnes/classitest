import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useSMSOTP } from "@/hooks/useSMSOTP";
import { SMSVerification } from "@/components/SMSVerification";
import { OTPMethodSelector } from "@/components/OTPMethodSelector";
import { useAutoLogin } from "@/hooks/useAutoLogin";
import { Loader2, CheckCircle, XCircle, ShoppingBag } from "lucide-react";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import { PhoneInput } from "@/components/PhoneInput";
import { GovernorateSelect } from "@/components/ui/GovernorateSelect";
import { LanguageSelector } from "@/components/LanguageSelector";

export const ParentAuth = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isChecking, isLoggedIn } = useAutoLogin();
  const [isLogin, setIsLogin] = useState(true);
  const [usePhone, setUsePhone] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [showSMSVerification, setShowSMSVerification] = useState(false);
  const [otpMethod, setOtpMethod] = useState<"email" | "sms">("email");
  const [availableMethods, setAvailableMethods] = useState<("email" | "sms")[]>(["email"]);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; color: string }>({ score: 0, label: "", color: "" });
  const authParams = new URLSearchParams(window.location.search);
  const libraryReferralCode = authParams.get("libraryRef")?.trim() || undefined;
  const referralCode = authParams.get("ref")?.trim() || undefined;
  const mode = authParams.get("mode")?.trim();
  const redirectTarget = authParams.get("redirect")?.trim() || "";

  const smsOTP = useSMSOTP({
    onSuccess: () => {
      navigate("/otp");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const authMutation = useMutation({
    mutationFn: async () => {
      if (usePhone) {
        const endpoint = isLogin ? "/api/auth/login-phone" : "/api/auth/register";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isLogin
              ? { phoneNumber: `${countryCode}${phone}`, password }
              : { email, password, name, phoneNumber: `${countryCode}${phone}`, libraryReferralCode, referralCode, pin: pinCode || undefined, governorate: governorate || undefined }
          ),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message);
        }
        return res.json();
      } else {
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isLogin ? { email, password } : { email, password, name, libraryReferralCode, referralCode, pin: pinCode || undefined, governorate: governorate || undefined }
          ),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message);
        }
        return res.json();
      }
    },
    onSuccess: async (data) => {
      // Backend wraps responses as { success, data, message }
      const payload = (data && typeof data === "object" && "data" in data) ? (data as any).data : data;

      if (payload?.requiresOtp) {
        const purpose = payload?.otpPurpose || (isLogin ? "login" : "register");
        localStorage.setItem("otpPurpose", purpose);
        if (redirectTarget) {
          localStorage.setItem("postAuthRedirect", redirectTarget);
        }
        if (usePhone) {
          localStorage.setItem("smsPendingPhone", payload.phone || phone);
        } else {
          localStorage.setItem("otpEmail", payload.email || email);
        }
        if (payload?.otpId) {
          localStorage.setItem("otpId", payload.otpId);
        }
        
        // Check available OTP methods for email before navigation
        if (isLogin && email && !usePhone) {
          try {
            const methods = await smsOTP.getOtpMethods(email);
            const updatedMethods = methods.length > 0 ? methods : ["email"];
            setAvailableMethods(updatedMethods);
            
            // Show method selector if SMS is available
            if (updatedMethods.includes("sms")) {
              setShowSMSVerification(true);
            } else {
              navigate("/otp");
            }
          } catch {
            // Fallback to email OTP if methods check fails
            navigate("/otp");
          }
        } else {
          navigate("/otp");
        }
      } else {
        if (payload?.token) {
          localStorage.setItem("token", payload.token);
        }
        if (payload?.userId) {
          localStorage.setItem("userId", payload.userId);
        }
        // Save familyCode for PIN login flow (only if parent has PIN set)
        if (payload?.uniqueCode && payload?.hasPin) {
          localStorage.setItem("familyCode", payload.uniqueCode);
        }
        const target = redirectTarget || localStorage.getItem("postAuthRedirect") || "/parent-dashboard";
        if (localStorage.getItem("postAuthRedirect")) {
          localStorage.removeItem("postAuthRedirect");
        }
        navigate(target);
      }
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    if (!isChecking && isLoggedIn) {
      const target = redirectTarget || "/parent-dashboard";
      navigate(target);
    }
  }, [isChecking, isLoggedIn, navigate, redirectTarget]);

  useEffect(() => {
    if (mode === "register") {
      setIsLogin(false);
    }
  }, [mode]);

  const evaluatePasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
      { label: t("parentAuth.passwordWeak", "ضعيفة"), color: "bg-red-500" },
      { label: t("parentAuth.passwordWeak", "ضعيفة"), color: "bg-red-500" },
      { label: t("parentAuth.passwordFair", "مقبولة"), color: "bg-yellow-500" },
      { label: t("parentAuth.passwordGood", "جيدة"), color: "bg-blue-500" },
      { label: t("parentAuth.passwordStrong", "قوية"), color: "bg-green-500" },
      { label: t("parentAuth.passwordVeryStrong", "قوية جداً"), color: "bg-green-600" },
    ];
    return { score, ...levels[score] };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Client-side password validation for registration
    if (!isLogin) {
      if (password.length < 8) {
        setError(t("parentAuth.passwordTooShort", "كلمة المرور يجب أن تكون 8 أحرف على الأقل"));
        return;
      }
      if (passwordStrength.score < 2) {
        setError(t("parentAuth.passwordTooWeak", "كلمة المرور ضعيفة جداً، أضف أرقام أو رموز"));
        return;
      }
    }
    authMutation.mutate();
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t("parentAuth.checkingSession")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-8 relative z-50">
          <button
            onClick={() => navigate("/")}
            className="text-white flex items-center gap-2 hover:opacity-80"
          >
            ← {t("back")}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/parent-store")}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-3 py-2 font-semibold shadow-md inline-flex items-center gap-1.5"
              data-testid="button-open-store-from-parent-auth"
            >
              <ShoppingBag className="w-4 h-4" />
              {t("store.title", "المتجر")}
            </button>
            <LanguageSelector />
            <PWAInstallButton 
              variant="default" 
              size="default"
              showText={true}
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full px-4 py-2 font-semibold shadow-md"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">
            {isLogin ? t("parentLogin") : t("registerNewParent")}
          </h1>

          {/* Show SMS Verification if available */}
          {showSMSVerification && availableMethods.includes("sms") && (
            <>
              <OTPMethodSelector
                selectedMethod={otpMethod}
                onMethodChange={(method) => {
                  setOtpMethod(method);
                  if (method === "email") {
                    navigate("/otp");
                  }
                }}
                availableMethods={availableMethods}
                isDark={false}
              />
              {otpMethod === "sms" ? (
                <SMSVerification
                  phone={smsOTP.phone}
                  setPhone={smsOTP.setPhone}
                  countryCode={smsOTP.countryCode}
                  setCountryCode={smsOTP.setCountryCode}
                  otp={smsOTP.otp}
                  setOtp={smsOTP.setOtp}
                  step={smsOTP.step}
                  setStep={smsOTP.setStep}
                  isLoading={smsOTP.sendSMSMutation.isPending || smsOTP.verifyLoginSMSMutation.isPending}
                  phoneError={error}
                  otpError={error}
                  isDark={false}
                  onCancel={() => {
                    setShowSMSVerification(false);
                    navigate("/otp");
                  }}
                  onPhoneSubmit={(phoneNumber) => {
                    smsOTP.sendSMSMutation.mutate(phoneNumber);
                  }}
                  onOTPSubmit={(otp) => {
                    smsOTP.verifyLoginSMSMutation.mutate({
                      phoneNumber: smsOTP.fullPhone,
                      code: otp,
                    });
                  }}
                  onResend={() => {
                    smsOTP.sendSMSMutation.mutate(smsOTP.fullPhone);
                  }}
                />
              ) : null}
            </>
          )}

          {!showSMSVerification && (
            <>
              {/* Email/Phone Toggle */}
              <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setUsePhone(false);
                    setError("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                    !usePhone ? "bg-blue-500 text-white" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t("parentAuth.emailTab")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsePhone(true);
                    setError("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-bold transition-all ${
                    usePhone ? "bg-blue-500 text-white" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t("parentAuth.phoneTab")}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      {t("parentAuth.name")}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("parentAuth.enterName")}
                      autoComplete="name"
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      required
                    />
                  </div>
                )}

                {usePhone ? (
                  <>
                    {!isLogin && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                          {t("parentAuth.email")}
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="example@mail.com"
                          autoComplete="email"
                          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        {t("parentAuth.phoneNumber")}
                      </label>
                      <PhoneInput
                        value={phone}
                        onChange={setPhone}
                        countryCode={countryCode}
                        onCountryCodeChange={setCountryCode}
                        placeholder="5xxxxxxxx"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      {t("parentAuth.email")}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@mail.com"
                      autoComplete="email"
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    {t("parentAuth.password")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (!isLogin) setPasswordStrength(evaluatePasswordStrength(e.target.value));
                    }}
                    placeholder="••••••••"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    minLength={isLogin ? undefined : 8}
                    aria-describedby={!isLogin ? "password-strength" : undefined}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    required
                  />
                  {!isLogin && password.length > 0 && (
                    <div id="password-strength" className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              i <= passwordStrength.score ? passwordStrength.color : "bg-gray-200 dark:bg-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {passwordStrength.score >= 3 ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400" />
                        )}
                        <span className={passwordStrength.score >= 3 ? "text-green-600" : "text-red-500"}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* PIN Code - Registration only */}
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      {t("parentAuth.pinLabel")}
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder={t("parentAuth.pinPlaceholder")}
                      maxLength={4}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-center text-xl tracking-widest font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t("parentAuth.pinHelper")}
                    </p>
                  </div>
                )}

                {/* Governorate - Registration only */}
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      {t("parentAuth.governorate")}
                    </label>
                    <GovernorateSelect
                      value={governorate}
                      onChange={setGovernorate}
                      className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t("parentAuth.governorateHelper")}
                    </p>
                  </div>
                )}

                {error && <p className="text-red-500 text-sm" role="alert" aria-live="assertive">{error}</p>}

                <button
                  type="submit"
                  disabled={authMutation.isPending}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                >
                  {authMutation.isPending ? t("parentAuth.processing") : isLogin ? t("parentAuth.login") : t("parentAuth.register")}
                </button>
              </form>

              <SocialLoginButtons className="mt-6" />

              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="w-full mt-4 text-blue-500 hover:text-blue-600 font-bold"
              >
                {isLogin ? t("parentAuth.noAccount") : t("parentAuth.hasAccount")}
              </button>

              {isLogin && (
                <Link
                  href="/forgot-password"
                  className="w-full mt-2 text-gray-500 hover:text-gray-600 text-sm block text-center cursor-pointer"
                  data-testid="button-forgot-password"
                >
                  {t("parentAuth.forgotPassword")}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
