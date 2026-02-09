import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";

const EGYPTIAN_PAYMENT_METHODS = [
  { id: "bank_transfer", name: "تحويل بنكي", emoji: "🏦" },
  { id: "vodafone_cash", name: "فودافون كاش", emoji: "📱" },
  { id: "orange_money", name: "أورنج موني", emoji: "🟠" },
  { id: "etisalat_cash", name: "اتصالات موني", emoji: "🟣" },
  { id: "we_pay", name: "ويبت", emoji: "💳" },
  { id: "instapay", name: "إنستاباي", emoji: "⚡" },
  { id: "fawry", name: "فوري", emoji: "🎫" },
];

export const Wallet = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const queryClient = useQueryClient();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [formData, setFormData] = useState({
    type: "",
    accountNumber: "",
    accountName: "",
    bankName: "",
    phoneNumber: "",
    isDefault: false,
  });
  const [depositAmount, setDepositAmount] = useState("");

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const { data: paymentMethodsRaw, refetch: refetchPayments } = useQuery({
    queryKey: ["/api/parent/payment-methods"],
    enabled: !!token,
  });
  
  const walletData = wallet as any || {};
  const paymentMethods = Array.isArray(paymentMethodsRaw) ? paymentMethodsRaw : [];

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/parent/payment-methods", formData);
    },
    onSuccess: () => {
      alert("✅ تمت إضافة وسيلة الدفع");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/payment-methods"] });
      setShowAddPayment(false);
      setFormData({ type: "", accountNumber: "", accountName: "", bankName: "", phoneNumber: "", isDefault: false });
    },
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/parent/deposit", {
        paymentMethodId: selectedPayment.id,
        amount: parseFloat(depositAmount),
      });
    },
    onSuccess: () => {
      alert("✅ تم بدء عملية الإيداع");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      setShowDeposit(false);
      setDepositAmount("");
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return apiRequest("DELETE", `/api/parent/payment-methods/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/payment-methods"] });
    },
  });

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              💰 المحفظة
            </h1>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>إدارة الأموال ووسائل الدفع</p>
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
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setShowDeposit(true)}
              disabled={!selectedPayment}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
            >
              💳 إيداع أموال
            </button>
            <div className="text-sm opacity-75">
              <p>إجمالي الإيداع: ₪{Number(walletData?.totalDeposited || 0).toFixed(2)}</p>
              <p>إجمالي المصروف: ₪{Number(walletData?.totalSpent || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-6 shadow mb-8`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              💳 وسائل الدفع
            </h2>
            <button
              onClick={() => setShowAddPayment(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold"
            >
              + إضافة وسيلة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((method: any) => (
              <div key={method.id} className={`border-2 rounded-lg p-4 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                      {EGYPTIAN_PAYMENT_METHODS.find(m => m.id === method.type)?.emoji} {method.type}
                    </p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {method.phoneNumber || method.accountNumber}
                    </p>
                  </div>
                  {method.isDefault && <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">افتراضي</span>}
                </div>
                <button
                  onClick={() => deletePaymentMutation.mutate(method.id)}
                  className="w-full mt-3 px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>

          {paymentMethods.length === 0 && (
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              لم تضف أي وسيلة دفع بعد
            </p>
          )}
        </div>
      </div>

      {/* Add Payment Modal */}
      {showAddPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-8 max-w-md w-full`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              إضافة وسيلة دفع
            </h2>

            <div className="space-y-4">
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`w-full px-3 py-2 border-2 rounded-lg ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
              >
                <option value="">اختر وسيلة الدفع</option>
                {EGYPTIAN_PAYMENT_METHODS.map(m => (
                  <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
                ))}
              </select>

              {formData.type && (
                <>
                  {["bank_transfer"].includes(formData.type) && (
                    <>
                      <input
                        type="text"
                        placeholder="اسم البنك"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className={`w-full px-3 py-2 border-2 rounded-lg ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                      />
                      <input
                        type="text"
                        placeholder="رقم الحساب"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className={`w-full px-3 py-2 border-2 rounded-lg ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                      />
                      <input
                        type="text"
                        placeholder="اسم الحساب"
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        className={`w-full px-3 py-2 border-2 rounded-lg ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                      />
                    </>
                  )}

                  {!["bank_transfer"].includes(formData.type) && (
                    <input
                      type="text"
                      placeholder="رقم الهاتف أو الحساب"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className={`w-full px-3 py-2 border-2 rounded-lg ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                    />
                  )}
                </>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span className={isDark ? "text-white" : ""}>اجعلها الطريقة الافتراضية</span>
              </label>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => addPaymentMutation.mutate()}
                disabled={addPaymentMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50"
              >
                إضافة
              </button>
              <button
                onClick={() => setShowAddPayment(false)}
                className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-8 max-w-md w-full`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-800"}`}>
              إيداع أموال
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-bold mb-2">المبلغ (بالجنيه)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className={`w-full px-3 py-2 border-2 rounded-lg ${isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"}`}
                />
              </div>

              {selectedPayment && (
                <div className="p-3 bg-blue-100 rounded-lg text-blue-800">
                  سيتم الإيداع عبر: {EGYPTIAN_PAYMENT_METHODS.find(m => m.id === selectedPayment.type)?.emoji} {selectedPayment.type}
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => depositMutation.mutate()}
                disabled={depositMutation.isPending || !depositAmount}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
              >
                إيداع
              </button>
              <button
                onClick={() => setShowDeposit(false)}
                className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
