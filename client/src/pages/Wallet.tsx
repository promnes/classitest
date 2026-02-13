import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";
import { getDateLocale } from "@/i18n/config";
import { ExternalLink, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";

const PAYMENT_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  bank_transfer: { label: "تحويل بنكي", emoji: "🏦" },
  vodafone_cash: { label: "فودافون كاش", emoji: "📱" },
  orange_money: { label: "أورنج موني", emoji: "🟠" },
  etisalat_cash: { label: "اتصالات موني", emoji: "🟣" },
  we_pay: { label: "وي باي", emoji: "💳" },
  instapay: { label: "إنستاباي", emoji: "⚡" },
  fawry: { label: "فوري", emoji: "🎫" },
  mobile_wallet: { label: "محفظة إلكترونية", emoji: "📲" },
  credit_card: { label: "بطاقة ائتمان", emoji: "💳" },
  other: { label: "أخرى", emoji: "💰" },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "قيد المراجعة", color: "text-yellow-700", bg: "bg-yellow-100" },
  completed: { label: "مقبول ✓", color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "مرفوض ✗", color: "text-red-700", bg: "bg-red-100" },
};

const extractApiErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object") return "حدث خطأ أثناء إرسال طلب الإيداع";
  const message = (error as any)?.message;
  if (typeof message !== "string") return "حدث خطأ أثناء إرسال طلب الإيداع";

  const jsonStart = message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(message.slice(jsonStart));
      if (parsed?.message) return parsed.message;
    } catch {
      return message;
    }
  }

  return message;
};

// ===== Ads Carousel Component =====
function AdsCarousel({ isDark }: { isDark: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: adsData } = useQuery<any[]>({
    queryKey: ["/api/ads", "parents"],
    queryFn: async () => {
      const res = await fetch("/api/ads?audience=parents");
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const adsList = Array.isArray(adsData) ? adsData : [];

  // Auto-rotate every 5s
  useEffect(() => {
    if (adsList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % adsList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [adsList.length]);

  // Track view
  useEffect(() => {
    const ad = adsList[currentIndex];
    if (ad) {
      fetch(`/api/ads/${ad.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [currentIndex, adsList]);

  const handleClick = useCallback((ad: any) => {
    fetch(`/api/ads/${ad.id}/click`, { method: "POST" }).catch(() => {});
    if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % adsList.length);
  }, [adsList.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + adsList.length) % adsList.length);
  }, [adsList.length]);

  if (adsList.length === 0) return null;

  const currentAd = adsList[currentIndex];

  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg mb-8 ${isDark ? "bg-gray-800 ring-1 ring-gray-700" : "bg-white ring-1 ring-gray-100"}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${isDark ? "border-gray-700/50" : "border-gray-100"}`}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? "bg-amber-500/15" : "bg-amber-50"}`}>
          <Megaphone className={`h-4 w-4 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
        </div>
        <span className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>إعلانات</span>
        {adsList.length > 1 && (
          <span className={`mr-auto text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
            {currentIndex + 1}/{adsList.length}
          </span>
        )}
      </div>

      {/* Ad Content */}
      <div
        className="relative cursor-pointer group"
        onClick={() => handleClick(currentAd)}
      >
        {currentAd.imageUrl ? (
          <div className="relative">
            <img
              src={currentAd.imageUrl}
              alt={currentAd.title}
              className="w-full h-44 sm:h-52 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-5">
              <h3 className="text-white font-bold text-lg leading-tight drop-shadow-md">{currentAd.title}</h3>
              <p className="text-white/80 text-sm mt-1 line-clamp-2">{currentAd.content}</p>
              {currentAd.linkUrl && (
                <div className="flex items-center gap-1 mt-2 text-white/70 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  <span>عرض التفاصيل</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`p-6 ${isDark ? "bg-gradient-to-br from-gray-800 to-gray-900" : "bg-gradient-to-br from-gray-50 to-white"}`}>
            <h3 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>{currentAd.title}</h3>
            <p className={`text-sm mt-2 leading-relaxed line-clamp-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {currentAd.content}
            </p>
            {currentAd.linkUrl && (
              <div className={`flex items-center gap-1 mt-3 text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                <ExternalLink className="h-3 w-3" />
                <span>عرض التفاصيل</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Arrows */}
        {adsList.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {adsList.length > 1 && (
        <div className={`flex items-center justify-center gap-1.5 py-3 border-t ${isDark ? "border-gray-700/50" : "border-gray-100"}`}>
          {adsList.map((_: any, i: number) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? `w-6 ${isDark ? "bg-amber-400" : "bg-amber-500"}`
                  : `w-1.5 ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-300 hover:bg-gray-400"}`
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const Wallet = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const [showDeposit, setShowDeposit] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTransactionId, setDepositTransactionId] = useState("");
  const [depositReceiptUrl, setDepositReceiptUrl] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [step, setStep] = useState<"select" | "confirm">("select");

  const { data: wallet } = useQuery({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const { data: paymentMethodsRaw } = useQuery({
    queryKey: ["/api/parent/payment-methods"],
    enabled: !!token,
  });

  const { data: depositsRaw } = useQuery({
    queryKey: ["/api/parent/deposits"],
    enabled: !!token,
  });

  const walletData = (wallet as any) || {};
  const paymentMethods = Array.isArray((paymentMethodsRaw as any)?.data)
    ? (paymentMethodsRaw as any).data
    : Array.isArray(paymentMethodsRaw)
    ? paymentMethodsRaw
    : [];
  const depositsList = Array.isArray((depositsRaw as any)?.data)
    ? (depositsRaw as any).data
    : Array.isArray(depositsRaw)
    ? depositsRaw
    : [];

  const depositMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/parent/deposit", {
        paymentMethodId: selectedMethod.id,
        amount: parseFloat(depositAmount),
        transactionId: depositTransactionId,
        receiptUrl: depositReceiptUrl || undefined,
        notes: depositNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/deposits"] });
      setShowDeposit(false);
      setSelectedMethod(null);
      setDepositAmount("");
      setDepositTransactionId("");
      setDepositReceiptUrl("");
      setDepositNotes("");
      setStep("select");
      alert("✅ تم إرسال طلب الإيداع بنجاح! سيتم مراجعته من الإدارة.");
    },
    onError: (error: any) => {
      alert(`❌ ${extractApiErrorMessage(error)}`);
    },
  });

  const getTypeInfo = (type: string) =>
    PAYMENT_TYPE_LABELS[type] || { label: type, emoji: "💰" };

  const resetDeposit = () => {
    setShowDeposit(false);
    setSelectedMethod(null);
    setDepositAmount("");
    setDepositTransactionId("");
    setDepositReceiptUrl("");
    setDepositNotes("");
    setStep("select");
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              💰 المحفظة
            </h1>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>إدارة الرصيد والإيداعات</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => navigate("/parent-dashboard")}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold"
            >
              ← رجوع
            </button>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className={`${isDark ? "bg-gradient-to-r from-blue-900 to-purple-900" : "bg-gradient-to-r from-blue-500 to-purple-600"} rounded-2xl p-8 text-white mb-8 shadow-lg`}>
          <p className="text-lg opacity-90">الرصيد الحالي</p>
          <p className="text-5xl font-bold">₪ {Number(walletData?.balance || 0).toFixed(2)}</p>
          <div className="flex gap-4 mt-6 items-center">
            <button
              onClick={() => setShowDeposit(true)}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg"
            >
              💳 إيداع أموال
            </button>
            <div className="text-sm opacity-75">
              <p>إجمالي الإيداع: ₪{Number(walletData?.totalDeposited || 0).toFixed(2)}</p>
              <p>إجمالي المصروف: ₪{Number(walletData?.totalSpent || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Ads Section */}
        <AdsCarousel isDark={isDark} />

        {/* Deposit History */}
        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-6 shadow`}>
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
            📋 سجل الإيداعات
          </h2>
          {depositsList.length === 0 ? (
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              لا توجد إيداعات سابقة
            </p>
          ) : (
            <div className="space-y-3">
              {depositsList.map((deposit: any) => {
                const statusInfo = STATUS_LABELS[deposit.status] || { label: deposit.status, color: "text-gray-700", bg: "bg-gray-100" };
                return (
                  <div
                    key={deposit.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isDark ? "border-gray-700 bg-gray-700/30" : "border-gray-200"
                    }`}
                  >
                    <div>
                      <p className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                        ₪{Number(deposit.amount).toFixed(2)}
                      </p>
                      <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {new Date(deposit.createdAt).toLocaleDateString(getDateLocale())} — {new Date(deposit.createdAt).toLocaleTimeString(getDateLocale())}
                      </p>
                      {(deposit.methodType || deposit.methodBank || deposit.methodAccount) && (
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          💳 {getTypeInfo(deposit.methodType || "other").label}
                          {deposit.methodBank ? ` — ${deposit.methodBank}` : ""}
                          {deposit.methodAccount ? ` (${deposit.methodAccount})` : ""}
                        </p>
                      )}
                      {deposit.transactionId && (
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          🔖 رقم العملية: <span className="font-mono">{deposit.transactionId}</span>
                        </p>
                      )}
                      {deposit.receiptUrl && (
                        <a
                          href={deposit.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs mt-1 inline-block underline ${isDark ? "text-blue-400" : "text-blue-600"}`}
                        >
                          🧾 عرض إثبات التحويل
                        </a>
                      )}
                      {deposit.notes && (
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          📝 {deposit.notes}
                        </p>
                      )}
                      {deposit.adminNotes && (
                        <p className={`text-xs mt-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                          💬 ملاحظات الإدارة: {deposit.adminNotes}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
            {step === "select" && (
              <>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  💳 إيداع أموال
                </h2>
                <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  اختر وسيلة الدفع التي ستستخدمها
                </p>

                <div className="space-y-3 mb-6">
                  {paymentMethods.map((method: any) => {
                    const typeInfo = getTypeInfo(method.type);
                    const isSelected = selectedMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method)}
                        className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                            : isDark
                            ? "border-gray-700 hover:border-gray-500"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{typeInfo.emoji}</span>
                          <div className="flex-1">
                            <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                              {typeInfo.label}
                            </p>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {method.bankName || method.accountNumber}
                            </p>
                          </div>
                          {isSelected && <span className="text-blue-500 text-xl">✓</span>}
                          {method.isDefault && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">★</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {paymentMethods.length === 0 && (
                  <p className="text-center text-gray-500 py-4">لا توجد وسائل دفع متاحة</p>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => selectedMethod && setStep("confirm")}
                    disabled={!selectedMethod}
                    className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    التالي ←
                  </button>
                  <button
                    onClick={resetDeposit}
                    className="flex-1 px-4 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}

            {step === "confirm" && selectedMethod && (
              <>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  تأكيد الإيداع
                </h2>
                <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  قم بالتحويل للحساب التالي ثم أدخل المبلغ
                </p>

                <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  ⚠️ رقم العملية مطلوب للمراجعة، ورابط الإثبات يساعد على تسريع قبول الطلب.
                </p>

                {/* Payment details card */}
                <div className={`p-4 rounded-xl mb-6 ${isDark ? "bg-blue-900/30 border border-blue-800" : "bg-blue-50 border border-blue-200"}`}>
                  <p className="font-bold text-lg mb-2">
                    {getTypeInfo(selectedMethod.type).emoji} {getTypeInfo(selectedMethod.type).label}
                  </p>
                  <div className={`space-y-2 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {selectedMethod.bankName && (
                      <p>🏦 <strong>البنك:</strong> {selectedMethod.bankName}</p>
                    )}
                    <p className="font-mono text-lg">
                      🔢 <strong>رقم الحساب:</strong> {selectedMethod.accountNumber}
                    </p>
                    {selectedMethod.accountName && (
                      <p>👤 <strong>باسم:</strong> {selectedMethod.accountName}</p>
                    )}
                    {selectedMethod.phoneNumber && (
                      <p>📞 <strong>الهاتف:</strong> {selectedMethod.phoneNumber}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      المبلغ المحول (بالشيكل) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                      className={`w-full px-4 py-3 border-2 rounded-lg text-lg font-bold ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      رقم العملية / المرجع البنكي *
                    </label>
                    <input
                      type="text"
                      value={depositTransactionId}
                      onChange={(e) => setDepositTransactionId(e.target.value)}
                      placeholder="مثال: TRX-2026-001234"
                      className={`w-full px-4 py-3 border-2 rounded-lg ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      رابط إثبات التحويل (اختياري)
                    </label>
                    <input
                      type="url"
                      value={depositReceiptUrl}
                      onChange={(e) => setDepositReceiptUrl(e.target.value)}
                      placeholder="https://..."
                      className={`w-full px-4 py-3 border-2 rounded-lg ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      ملاحظات (اختياري)
                    </label>
                    <textarea
                      value={depositNotes}
                      onChange={(e) => setDepositNotes(e.target.value)}
                      placeholder="مثال: تم التحويل من حساب رقم ... أو اسم المحول ..."
                      rows={2}
                      className={`w-full px-3 py-2 border-2 rounded-lg ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => depositMutation.mutate()}
                    disabled={
                      depositMutation.isPending ||
                      !depositAmount ||
                      parseFloat(depositAmount) <= 0 ||
                      !depositTransactionId.trim()
                    }
                    className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg disabled:opacity-50"
                  >
                    {depositMutation.isPending ? "جاري الإرسال..." : "✅ إرسال الطلب للمراجعة"}
                  </button>
                  <button
                    onClick={() => setStep("select")}
                    className="px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-bold"
                  >
                    ← رجوع
                  </button>
                  <button
                    onClick={resetDeposit}
                    className="px-4 py-3 bg-red-400 hover:bg-red-500 text-white rounded-lg font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
