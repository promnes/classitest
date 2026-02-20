import React, { useState, useEffect, useCallback } from "react";
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

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-yellow-700", bg: "bg-yellow-100" },
  completed: { color: "text-green-700", bg: "bg-green-100" },
  cancelled: { color: "text-red-700", bg: "bg-red-100" },
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

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("wallet.title")}
            </h1>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>{t("wallet.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <LanguageSelector />
            <ParentNotificationBell />
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
              className={`px-4 py-2 rounded-lg font-bold ${isDark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-500 text-white hover:bg-gray-600"}`}
            >
              {t("common.back")}
            </button>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className={`${isDark ? "bg-gradient-to-r from-blue-900 to-purple-900" : "bg-gradient-to-r from-blue-500 to-purple-600"} rounded-2xl p-8 text-white mb-8 shadow-lg`}>
          <p className="text-lg opacity-90">{t("wallet.currentBalance")}</p>
          <p className="text-5xl font-bold">₪ {Number(walletData?.balance || 0).toFixed(2)}</p>
          <div className="flex gap-4 mt-6 items-center">
            <button
              onClick={() => setShowDeposit(true)}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg"
            >
              {t("wallet.depositFunds")}
            </button>
            <div className="text-sm opacity-75">
              <p>{t("wallet.totalDeposited", { amount: Number(walletData?.totalDeposited || 0).toFixed(2) })}</p>
              <p>{t("wallet.totalSpent", { amount: Number(walletData?.totalSpent || 0).toFixed(2) })}</p>
            </div>
          </div>
        </div>

        {/* Ads Section */}
        <SlidingAdsCarousel audience="parents" variant="page" isDark={isDark} />

        {/* Deposit History */}
        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-6 shadow`}>
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("wallet.depositHistory")}
          </h2>
          {depositsList.length === 0 ? (
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              {t("wallet.noDeposits")}
            </p>
          ) : (
            <div className="space-y-3">
              {depositsList.map((deposit: any) => {
                const statusInfo = getStatusLabel(deposit.status, t);
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
                          {t("wallet.transactionNumber")} <span className="font-mono">{deposit.transactionId}</span>
                        </p>
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
                  {t("wallet.depositFunds")}
                </h2>
                <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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
                  <p className="text-center text-gray-500 py-4">{t("wallet.noPaymentMethods")}</p>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => selectedMethod && setStep("confirm")}
                    disabled={!selectedMethod}
                    className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                  <button
                    onClick={resetDeposit}
                    className={`flex-1 px-4 py-3 rounded-lg font-bold ${isDark ? "bg-gray-600 hover:bg-gray-500 text-gray-200" : "bg-gray-400 hover:bg-gray-500 text-white"}`}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            )}

            {step === "confirm" && selectedMethod && (
              <>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("wallet.confirmDeposit")}
                </h2>
                <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {t("wallet.transferInstructions")}
                </p>

                <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {t("wallet.transactionWarning")}
                </p>

                {/* Payment details card */}
                <div className={`p-4 rounded-xl mb-6 ${isDark ? "bg-blue-900/30 border border-blue-800" : "bg-blue-50 border border-blue-200"}`}>
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
                      className={`w-full px-4 py-3 border-2 rounded-lg text-lg font-bold ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
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
                      className={`w-full px-4 py-3 border-2 rounded-lg ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
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
                      className={`w-full px-4 py-3 border-2 rounded-lg ${
                        isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
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
                    {depositMutation.isPending ? t('wallet.submitting') : t('wallet.submitDeposit')}
                  </button>
                  <button
                    onClick={() => setStep("select")}
                    className={`px-4 py-3 rounded-lg font-bold ${isDark ? "bg-gray-600 hover:bg-gray-500 text-gray-200" : "bg-gray-300 hover:bg-gray-400 text-gray-800"}`}
                  >
                    {t("common.back")}
                  </button>
                  <button
                    onClick={resetDeposit}
                    className="px-4 py-3 bg-red-400 hover:bg-red-500 text-white rounded-lg font-bold"
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
