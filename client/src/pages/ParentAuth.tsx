import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useSMSOTP } from "@/hooks/useSMSOTP";
import { SMSVerification } from "@/components/SMSVerification";
import { OTPMethodSelector } from "@/components/OTPMethodSelector";
import { useAutoLogin } from "@/hooks/useAutoLogin";
import { Loader2, CheckCircle, XCircle, ShoppingBag, Shield, BookOpen, Sparkles, Star, EllipsisVertical } from "lucide-react";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import { PhoneInput } from "@/components/PhoneInput";
import { GovernorateSelect } from "@/components/ui/GovernorateSelect";
import { LanguageSelector } from "@/components/LanguageSelector";

export const ParentAuth = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const isRTL = i18n.language === "ar";
  const { isChecking, isLoggedIn } = useAutoLogin();
  const [isLogin, setIsLogin] = useState(true);
  const [usePhone, setUsePhone] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [error, setError] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [showSMSVerification, setShowSMSVerification] = useState(false);
  const [showTopActionsMenu, setShowTopActionsMenu] = useState(false);
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
              : { email, password, name, gender, phoneNumber: `${countryCode}${phone}`, libraryReferralCode, referralCode, pin: pinCode || undefined, governorate: governorate || undefined }
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
            isLogin ? { email, password } : { email, password, name, gender, libraryReferralCode, referralCode, pin: pinCode || undefined, governorate: governorate || undefined }
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

  useEffect(() => {
    if (!showTopActionsMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowTopActionsMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showTopActionsMenu]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setShowTopActionsMenu(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
      if (!gender) {
        setError(t("parentAuth.genderRequired"));
        return;
      }
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
    <div
      className="min-h-screen relative overflow-x-hidden overflow-y-auto bg-[#061a2b] text-white"
      style={{ fontFamily: '"Cairo","Noto Kufi Arabic","Segoe UI",sans-serif' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-emerald-300/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 right-1/3 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
      </div>

      <div className={`relative z-10 px-4 py-3 ${!isLogin ? "pb-28 md:pb-3" : ""}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-4 gap-2 relative">
          <button
            onClick={() => navigate("/")}
            className="text-cyan-100/90 flex items-center gap-2 hover:text-white transition-colors shrink-0"
          >
            ← {t("back")}
          </button>
          <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => navigate("/parent-store")}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-3 py-2 font-semibold shadow-md inline-flex items-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              data-testid="button-open-store-from-parent-auth"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t("store.title", "المتجر")}</span>
            </button>
            <LanguageSelector />
            <PWAInstallButton
              variant="default"
              size="default"
              showText={true}
              className="inline-flex bg-cyan-500 hover:bg-cyan-600 text-white rounded-full px-4 py-2 font-semibold shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => navigate("/parent-store")}
              aria-label={t("store.title", "المتجر")}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full w-10 h-10 inline-flex items-center justify-center shadow-md transition-all duration-200 hover:scale-[1.05] active:scale-95"
              data-testid="button-open-store-from-parent-auth"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label={t("common.more", "المزيد")}
              aria-haspopup="menu"
              aria-expanded={showTopActionsMenu}
              aria-controls="parent-auth-mobile-actions-menu"
              onClick={() => setShowTopActionsMenu((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-white/15 border border-white/25 text-cyan-50 inline-flex items-center justify-center backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:scale-[1.05] active:scale-95"
            >
              <EllipsisVertical className="w-5 h-5" />
            </button>
          </div>

          <button
            aria-label={t("common.close", "إغلاق")}
            aria-hidden={!showTopActionsMenu}
            className={`md:hidden fixed inset-0 z-30 bg-black/20 transition-opacity duration-200 ${showTopActionsMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            onClick={() => setShowTopActionsMenu(false)}
          />

          <div
            id="parent-auth-mobile-actions-menu"
            role="menu"
            aria-hidden={!showTopActionsMenu}
            className={`md:hidden absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} z-40 w-[min(12.5rem,calc(100vw-0.75rem))] rounded-2xl border border-cyan-100/30 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-2 ${isRTL ? "origin-top-left" : "origin-top-right"} transition-all duration-200 ${showTopActionsMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
          >
            <div
              style={{ transitionDelay: showTopActionsMenu ? "35ms" : "0ms" }}
              className={`px-2 pb-2 transition-all duration-200 ${showTopActionsMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
            >
              <LanguageSelector />
            </div>

            <div className="h-px bg-white/10 my-1" />

            <div
              style={{ transitionDelay: showTopActionsMenu ? "70ms" : "0ms" }}
              className={`px-2 py-1 transition-all duration-200 ${showTopActionsMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
            >
              <PWAInstallButton
                variant="default"
                size="default"
                showText={true}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl px-3 py-2 font-semibold shadow-md justify-center"
              />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.12fr_0.88fr] gap-5 items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 lg:p-6 shadow-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/20 border border-cyan-200/30 px-4 py-1 text-cyan-100 text-xs mb-4">
                <Sparkles className="w-4 h-4" />
                {t("parentAuth.brandBadge")}
              </div>
              <h2 className="text-2xl lg:text-4xl leading-tight font-black text-white mb-3">
                {t("parentAuth.slogan")}
              </h2>
              <p className="text-cyan-50/90 text-sm lg:text-base leading-relaxed mb-5">
                {t("parentAuth.heroDescription")}
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/30 px-4 py-2.5">
                  <Shield className="w-5 h-5 text-cyan-300" />
                  <span className="text-sm lg:text-base">{t("parentAuth.featureSafety")}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/30 px-4 py-2.5">
                  <BookOpen className="w-5 h-5 text-emerald-300" />
                  <span className="text-sm lg:text-base">{t("parentAuth.featureLearning")}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/30 px-4 py-2.5">
                  <Star className="w-5 h-5 text-amber-300" />
                  <span className="text-sm lg:text-base">{t("parentAuth.featureReports")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="bg-white/95 dark:bg-gray-900/95 rounded-3xl p-5 lg:p-6 shadow-2xl border border-white/60">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white mb-1 text-center">
                {isLogin ? t("parentLogin") : t("registerNewParent")}
              </h1>
              <p className="text-center text-slate-500 dark:text-slate-300 text-xs lg:text-sm mb-4">
                {t("parentAuth.authSubtitle")}
              </p>

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
              <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-gray-700 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setUsePhone(false);
                    setError("");
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                    !usePhone ? "bg-cyan-600 text-white" : "text-gray-700 dark:text-gray-300"
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
                  className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                    usePhone ? "bg-cyan-600 text-white" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t("parentAuth.phoneTab")}
                </button>
              </div>

              <form id="parent-auth-form" onSubmit={handleSubmit} className="space-y-3">
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
                      className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      required
                    />
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      {t("parentAuth.gender")}
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as "male" | "female" | "")}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      required
                    >
                      <option value="">{t("parentAuth.selectGender")}</option>
                      <option value="male">{t("parentAuth.genderMale")}</option>
                      <option value="female">{t("parentAuth.genderFemale")}</option>
                    </select>
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
                          className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 focus:placeholder-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
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
                        placeholder="512345678"
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
                      className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 focus:placeholder-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
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
                    placeholder="Aa123456"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    minLength={isLogin ? undefined : 8}
                    aria-describedby={!isLogin ? "password-strength" : undefined}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 focus:placeholder-transparent text-gray-900 dark:text-white bg-white dark:bg-gray-700"
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
                      className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-center text-xl tracking-widest font-mono"
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

                {error && (
                  <p
                    className="text-red-600 dark:text-red-300 text-sm rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2"
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authMutation.isPending}
                  className={`w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${!isLogin ? "hidden md:block" : ""}`}
                >
                  {authMutation.isPending ? t("parentAuth.processing") : isLogin ? t("parentAuth.loginCta") : t("parentAuth.register")}
                </button>
              </form>

              <SocialLoginButtons className="mt-6" />

              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="w-full mt-4 text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200 font-bold"
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

        <div className="max-w-6xl mx-auto mt-4 pb-6">
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-3 lg:p-4">
            <div className="text-center text-cyan-100 text-sm mb-3 font-semibold">{t("parentAuth.quickLinksTitle")}</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              <Link href="/privacy-policy" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200">🔒 {t("parentAuth.quickLinkPrivacy")}</Link>
              <Link href="/terms" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200">📋 {t("parentAuth.quickLinkTerms")}</Link>
              <Link href="/child-safety" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200">👶 {t("parentAuth.quickLinkChildSafety")}</Link>
              <Link href="/refund-policy" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200">💰 {t("parentAuth.quickLinkRefund")}</Link>
              <Link href="/about" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200">ℹ️ {t("parentAuth.quickLinkAbout")}</Link>
              <Link href="/contact" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200">✉️ {t("parentAuth.quickLinkContact")}</Link>
              <Link href="/trial-games" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200">🎮 {t("parentAuth.quickLinkTrialGames")}</Link>
              <Link href="/download" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200">⬇️ {t("parentAuth.quickLinkDownload")}</Link>
              <Link href="/legal" className="rounded-xl border border-white/20 bg-slate-900/35 px-3 py-2 text-xs text-center hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200 md:col-span-3 lg:col-span-1">⚖️ {t("parentAuth.quickLinkLegalCenter")}</Link>
            </div>
          </div>
        </div>
      </div>

      {!isLogin && (
        <div
          className="fixed inset-x-4 z-40 md:hidden"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="submit"
            form="parent-auth-form"
            disabled={authMutation.isPending}
            className="w-full min-h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold py-3 shadow-2xl ring-1 ring-white/40 backdrop-blur-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {authMutation.isPending ? t("parentAuth.processing") : t("parentAuth.register")}
          </button>
        </div>
      )}
    </div>
  );
};
