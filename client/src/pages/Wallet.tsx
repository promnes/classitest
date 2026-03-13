import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useToast } from "@/hooks/use-toast";
import { getDateLocale } from "@/i18n/config";
import { SlidingAdsCarousel } from "@/components/SlidingAdsCarousel";

const PAYMENT_TYPE_EMOJIS: Record<string, string> = {
  bank_transfer: "🏦", vodafone_cash: "📱", orange_money: "🟠", etisalat_cash: "🟣",
  we_pay: "💳", instapay: "⚡", fawry: "🎫", mobile_wallet: "📲", credit_card: "💳", other: "💰",
};

const STATUS_COLORS: Record<string, { color: string; bg: string; accent: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100", accent: "border-s-4 border-amber-400" },
  completed: { color: "text-emerald-700", bg: "bg-emerald-100", accent: "border-s-4 border-emerald-400" },
  cancelled: { color: "text-rose-700", bg: "bg-rose-100", accent: "border-s-4 border-rose-400" },
};

function getPaymentLabel(type: string, t: (key: string) => string) {
  const key = `wallet.paymentType.${type.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;
  return { label: t(key), emoji: PAYMENT_TYPE_EMOJIS[type] || "💰" };
}

function getStatusLabel(status: string, t: (key: string) => string) {
  const keyMap: Record<string, string> = { pending: 'wallet.statusPending', completed: 'wallet.statusCompleted', cancelled: 'wallet.statusCancelled' };
  return { label: t(keyMap[status] || keyMap.pending), ...(STATUS_COLORS[status] || STATUS_COLORS.pending) };
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") return fallback;
  const message = (error as any)?.message;
  if (typeof message !== "string") return fallback;

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

export const Wallet = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeposit, setShowDeposit] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTransactionId, setDepositTransactionId] = useState("");
  const [depositReceiptUrl, setDepositReceiptUrl] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [step, setStep] = useState<"select" | "confirm">("select");

  const { data: wallet, isLoading: isWalletLoading } = useQuery({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const { data: paymentMethodsRaw, isLoading: isPaymentMethodsLoading } = useQuery({
    queryKey: ["/api/parent/payment-methods"],
    enabled: !!token,
  });

  const { data: depositsRaw, isLoading: isDepositsLoading } = useQuery({
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

  const pendingCount = depositsList.filter((d: any) => d.status === "pending").length;
  const completedCount = depositsList.filter((d: any) => d.status === "completed").length;
  const cancelledCount = depositsList.filter((d: any) => d.status === "cancelled").length;

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
      toast({ title: t("wallet.depositSuccess"), description: t("wallet.depositPending") });
    },
    onError: (error: any) => {
      toast({ title: t("errors.error", "خطأ"), description: extractApiErrorMessage(error, t('wallet.depositError')), variant: "destructive" });
    },
  });

  const getTypeInfo = (type: string) => getPaymentLabel(type, t);

  const resetDeposit = () => {
    setShowDeposit(false);
    setSelectedMethod(null);
    setDepositAmount("");
    setDepositTransactionId("");
    setDepositReceiptUrl("");
    setDepositNotes("");
    setStep("select");
  };

  const currentStepIndex = step === "select" ? 1 : 2;

  return (
    <div className={`min-h-screen px-4 py-5 sm:p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div
          className={`rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 backdrop-blur-sm ${
            isDark ? "bg-slate-900/80 border-slate-800" : "bg-white/95 border-slate-200 shadow-sm"
          }`}
        >
          <div className="flex flex-col gap-4 sm:gap-5">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("wallet.title")}
            </h1>
              <p className={`mt-1 text-sm sm:text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("wallet.subtitle")}</p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <LanguageSelector />
              <ParentNotificationBell />
              <button
                onClick={toggleTheme}
                className="h-11 min-w-11 rounded-xl bg-blue-500 text-white font-bold shadow-sm transition-colors hover:bg-blue-600"
                aria-label={isDark ? "Enable light mode" : "Enable dark mode"}
              >
                {isDark ? "☀️" : "🌙"}
              </button>
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
                className={`h-11 px-4 rounded-xl font-bold whitespace-nowrap transition-colors ${isDark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-500 text-white hover:bg-gray-600"}`}
              >
                {t("common.back")}
              </button>
            </div>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className={`${isDark ? "bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900" : "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600"} rounded-3xl p-5 sm:p-8 text-white shadow-xl`}>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-base sm:text-lg opacity-90">{t("wallet.currentBalance")}</p>
              {isWalletLoading ? (
                <div className="mt-2 h-14 sm:h-16 w-44 rounded-2xl bg-white/20 animate-pulse" />
              ) : (
                <p className="mt-2 text-5xl sm:text-6xl font-extrabold leading-none">$ {Number(walletData?.balance || 0).toFixed(2)}</p>
              )}
            </div>

            <button
              onClick={() => setShowDeposit(true)}
              className="h-14 px-6 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg shadow-md transition-colors"
            >
              {t("wallet.depositFunds")}
            </button>
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 ring-1 ring-white/15 px-4 py-3 text-sm sm:text-base">
            {isWalletLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-56 rounded bg-white/20 animate-pulse" />
                <div className="h-4 w-52 rounded bg-white/20 animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-col gap-1 opacity-95">
                <p>{t("wallet.totalDeposited", { amount: Number(walletData?.totalDeposited || 0).toFixed(2) })}</p>
                <p>{t("wallet.totalSpent", { amount: Number(walletData?.totalSpent || 0).toFixed(2) })}</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
            <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2.5">
              <p className="opacity-85">{t("wallet.statusPending")}</p>
              <p className="text-xl font-extrabold leading-tight">{isDepositsLoading ? "..." : pendingCount}</p>
            </div>
            <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2.5">
              <p className="opacity-85">{t("wallet.statusCompleted")}</p>
              <p className="text-xl font-extrabold leading-tight">{isDepositsLoading ? "..." : completedCount}</p>
            </div>
            <div className="rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2.5">
              <p className="opacity-85">{t("wallet.statusCancelled")}</p>
              <p className="text-xl font-extrabold leading-tight">{isDepositsLoading ? "..." : cancelledCount}</p>
            </div>
          </div>
        </div>

        {/* Ads Section */}
        <SlidingAdsCarousel audience="parents" variant="page" isDark={isDark} />

        {/* Deposit History */}
        <div className={`${isDark ? "bg-gray-800/95 border border-gray-700" : "bg-white border border-gray-100"} rounded-2xl p-5 sm:p-6 shadow`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("wallet.depositHistory")}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"
              }`}
            >
              {depositsList.length}
            </span>
          </div>
          {isDepositsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`deposit-skeleton-${idx}`}
                  className={`p-4 rounded-xl border animate-pulse ${isDark ? "border-gray-700 bg-gray-700/20" : "border-gray-200 bg-gray-50"}`}
                >
                  <div className={`h-5 w-24 rounded mb-2 ${isDark ? "bg-gray-600" : "bg-gray-200"}`} />
                  <div className={`h-4 w-48 rounded mb-2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                  <div className={`h-4 w-36 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                </div>
              ))}
            </div>
          ) : depositsList.length === 0 ? (
            <p className={`rounded-xl px-4 py-6 text-center ${isDark ? "bg-gray-900/50 text-gray-400" : "bg-gray-50 text-gray-600"}`}>
              {t("wallet.noDeposits")}
            </p>
          ) : (
            <div className="space-y-3">
              {depositsList.map((deposit: any) => {
                const statusInfo = getStatusLabel(deposit.status, t);
                return (
                  <div
                    key={deposit.id}
                    className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${statusInfo.accent} ${
                      isDark ? "border-gray-700 bg-gray-700/30 hover:bg-gray-700/40" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="space-y-2">
                      <p className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                        ${Number(deposit.amount).toFixed(2)}
                      </p>
                      <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {new Date(deposit.createdAt).toLocaleDateString(getDateLocale())} — {new Date(deposit.createdAt).toLocaleTimeString(getDateLocale())}
                      </p>

                      {(deposit.methodType || deposit.methodBank || deposit.methodAccount) && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={`px-2.5 py-1 rounded-full ${isDark ? "bg-gray-600/70 text-gray-200" : "bg-gray-100 text-gray-700"}`}>
                            💳 {getTypeInfo(deposit.methodType || "other").label}
                          </span>
                          {deposit.methodBank && (
                            <span className={`px-2.5 py-1 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-700"}`}>
                              {deposit.methodBank}
                            </span>
                          )}
                          {deposit.methodAccount && (
                            <span className={`px-2.5 py-1 rounded-full font-mono ${isDark ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-700"}`}>
                              {deposit.methodAccount}
                            </span>
                          )}
                        </div>
                      )}

                      {deposit.transactionId && (
                        <div className="text-xs">
                          <span className={isDark ? "text-gray-400" : "text-gray-600"}>{t("wallet.transactionNumber")}</span>{" "}
                          <span className={`font-mono px-2 py-0.5 rounded ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800"}`}>
                            {deposit.transactionId}
                          </span>
                        </div>
                      )}
                      {deposit.receiptUrl && (
                        <a
                          href={deposit.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs mt-1 inline-block underline ${isDark ? "text-blue-400" : "text-blue-600"}`}
                        >
                          {t("wallet.viewReceipt")}
                        </a>
                      )}
                      {deposit.notes && (
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          📝 {deposit.notes}
                        </p>
                      )}
                      {deposit.adminNotes && (
                        <p className={`text-xs mt-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                          {t("wallet.adminNotes")} {deposit.adminNotes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        isDark
                          ? deposit.status === "pending"
                            ? "bg-amber-900/50 text-amber-200"
                            : deposit.status === "completed"
                            ? "bg-emerald-900/50 text-emerald-200"
                            : "bg-rose-900/50 text-rose-200"
                          : `${statusInfo.bg} ${statusInfo.color}`
                      }`}
                    >
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 z-50">
          <div className={`${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} rounded-3xl p-5 sm:p-7 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}>
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span
                  className={`h-7 w-7 rounded-full text-xs font-extrabold flex items-center justify-center ${
                    currentStepIndex >= 1
                      ? "bg-blue-500 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  1
                </span>
                <span className={`h-1 flex-1 rounded-full ${currentStepIndex >= 2 ? "bg-blue-500" : isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                <span
                  className={`h-7 w-7 rounded-full text-xs font-extrabold flex items-center justify-center ${
                    currentStepIndex >= 2
                      ? "bg-blue-500 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  2
                </span>
              </div>
            </div>

            {step === "select" && (
              <>
                <h2 className={`text-2xl font-extrabold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("wallet.depositFunds")}
                </h2>
                <p className={`text-sm mb-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {t("wallet.selectPaymentMethod")}
                </p>

                <div className="space-y-3 mb-6">
                  {paymentMethods.map((method: any) => {
                    const typeInfo = getTypeInfo(method.type);
                    const isSelected = selectedMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method)}
                        className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm"
                            : isDark
                            ? "border-gray-700 hover:border-gray-500"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{typeInfo.emoji}</span>
                          <div className="flex-1">
                            <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                              {method.displayName || typeInfo.label}
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

                {!isPaymentMethodsLoading && paymentMethods.length === 0 && (
                  <p className="text-center text-gray-500 py-4">{t("wallet.noPaymentMethods")}</p>
                )}

                {isPaymentMethodsLoading && (
                  <div className="space-y-2 py-2">
                    <div className={`h-14 rounded-xl animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-100"}`} />
                    <div className={`h-14 rounded-xl animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-100"}`} />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={() => selectedMethod && setStep("confirm")}
                    disabled={!selectedMethod}
                    className="px-4 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                  <button
                    onClick={resetDeposit}
                    className={`px-4 py-3.5 rounded-xl font-bold ${isDark ? "bg-gray-600 hover:bg-gray-500 text-gray-200" : "bg-gray-400 hover:bg-gray-500 text-white"}`}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            )}

            {step === "confirm" && selectedMethod && (
              <>
                <h2 className={`text-2xl font-extrabold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("wallet.confirmDeposit")}
                </h2>
                <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {t("wallet.transferInstructions")}
                </p>

                <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {t("wallet.transactionWarning")}
                </p>

                {/* Payment details card */}
                <div className={`p-4 rounded-2xl mb-6 shadow-sm ${isDark ? "bg-blue-900/30 border border-blue-800" : "bg-blue-50 border border-blue-200"}`}>
                  <p className="font-bold text-lg mb-2">
                    {getTypeInfo(selectedMethod.type).emoji} {getTypeInfo(selectedMethod.type).label}
                  </p>
                  <div className={`space-y-2 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {selectedMethod.bankName && (
                      <p>🏦 <strong>{t("wallet.bank")}</strong> {selectedMethod.bankName}</p>
                    )}
                    <p className="font-mono text-lg">
                      🔢 <strong>{t("wallet.accountNumber")}</strong> {selectedMethod.accountNumber}
                    </p>
                    {selectedMethod.accountName && (
                      <p>👤 <strong>{t("wallet.accountName")}</strong> {selectedMethod.accountName}</p>
                    )}
                    {selectedMethod.phoneNumber && (
                      <p>📞 <strong>{t("wallet.phone")}</strong> {selectedMethod.phoneNumber}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      {t("wallet.amountLabel")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder={t('wallet.amountPlaceholder')}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      {t("wallet.transactionIdLabel")}
                    </label>
                    <input
                      type="text"
                      value={depositTransactionId}
                      onChange={(e) => setDepositTransactionId(e.target.value)}
                      placeholder={t('wallet.transactionIdPlaceholder')}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      {t("wallet.receiptUrlLabel")}
                    </label>
                    <input
                      type="url"
                      value={depositReceiptUrl}
                      onChange={(e) => setDepositReceiptUrl(e.target.value)}
                      placeholder="https://..."
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      {t("wallet.notesLabel")}
                    </label>
                    <textarea
                      value={depositNotes}
                      onChange={(e) => setDepositNotes(e.target.value)}
                      placeholder={t("wallet.notesPlaceholder")}
                      rows={2}
                      className={`w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 bg-white"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => depositMutation.mutate()}
                    disabled={
                      depositMutation.isPending ||
                      !depositAmount ||
                      parseFloat(depositAmount) <= 0 ||
                      !depositTransactionId.trim()
                    }
                    className="sm:col-span-2 px-4 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg disabled:opacity-50"
                  >
                    {depositMutation.isPending ? t('wallet.submitting') : t('wallet.submitDeposit')}
                  </button>
                  <button
                    onClick={() => setStep("select")}
                    className={`px-4 py-3.5 rounded-xl font-bold ${isDark ? "bg-gray-600 hover:bg-gray-500 text-gray-200" : "bg-gray-300 hover:bg-gray-400 text-gray-800"}`}
                  >
                    {t("common.back")}
                  </button>
                  <button
                    onClick={resetDeposit}
                    className="px-4 py-3.5 bg-red-400 hover:bg-red-500 text-white rounded-xl font-bold"
                  >
                    {t("common.cancel")}
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
