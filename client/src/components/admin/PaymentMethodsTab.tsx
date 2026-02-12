import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethod {
  id: string;
  parentId?: string | null;
  type: string;
  accountNumber: string;
  accountName?: string;
  bankName?: string;
  phoneNumber?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PaymentMethodsResponse {
  success: boolean;
  data: PaymentMethod[];
}

const PAYMENT_TYPES = [
  { id: "bank_transfer", label: "تحويل بنكي", labelEn: "Bank Transfer", emoji: "🏦" },
  { id: "vodafone_cash", label: "فودافون كاش", labelEn: "Vodafone Cash", emoji: "📱" },
  { id: "orange_money", label: "أورنج موني", labelEn: "Orange Money", emoji: "🟠" },
  { id: "etisalat_cash", label: "اتصالات موني", labelEn: "Etisalat Cash", emoji: "🟣" },
  { id: "we_pay", label: "وي باي", labelEn: "WE Pay", emoji: "💳" },
  { id: "instapay", label: "إنستاباي", labelEn: "InstaPay", emoji: "⚡" },
  { id: "fawry", label: "فوري", labelEn: "Fawry", emoji: "🎫" },
  { id: "mobile_wallet", label: "محفظة إلكترونية", labelEn: "Mobile Wallet", emoji: "📲" },
  { id: "credit_card", label: "بطاقة ائتمان", labelEn: "Credit Card", emoji: "💳" },
  { id: "other", label: "أخرى", labelEn: "Other", emoji: "💰" },
];

export function PaymentMethodsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    type: "bank_transfer",
    accountNumber: "",
    accountName: "",
    bankName: "",
    phoneNumber: "",
    isDefault: false,
    isActive: true,
  });

  const { data: paymentMethods, isLoading } = useQuery<PaymentMethodsResponse>({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payment-methods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to load payment methods");
      }
      return json;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to create payment method");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      resetForm();
      setShowForm(false);
      toast({ title: "تم إنشاء وسيلة الدفع بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "فشل إنشاء وسيلة الدفع",
        description: error?.message || "حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/admin/payment-methods/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to update payment method");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      resetForm();
      setShowForm(false);
      toast({ title: "تم تحديث وسيلة الدفع بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "فشل تحديث وسيلة الدفع",
        description: error?.message || "حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Failed to delete payment method");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "تم حذف وسيلة الدفع" });
    },
    onError: (error: any) => {
      toast({
        title: "فشل حذف وسيلة الدفع",
        description: error?.message || "حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      type: "bank_transfer",
      accountNumber: "",
      accountName: "",
      bankName: "",
      phoneNumber: "",
      isDefault: false,
      isActive: true,
    });
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountNumber) {
      toast({
        title: "حقل مطلوب",
        description: "رقم الحساب مطلوب",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setFormData({
      type: method.type,
      accountNumber: method.accountNumber,
      accountName: method.accountName || "",
      bankName: method.bankName || "",
      phoneNumber: method.phoneNumber || "",
      isDefault: method.isDefault,
      isActive: method.isActive,
    });
    setEditingId(method.id);
    setShowForm(true);
  };

  const methods = paymentMethods?.data || [];
  const filtered =
    filterActive === null ? methods : methods.filter((m) => m.isActive === filterActive);

  const getTypeInfo = (typeId: string) => PAYMENT_TYPES.find((t) => t.id === typeId) || { id: typeId, label: typeId, labelEn: typeId, emoji: "💰" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">وسائل الدفع</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            وسائل الدفع التي ستظهر للوالدين عند الإيداع
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          إضافة وسيلة دفع
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">
            {editingId ? "تعديل وسيلة الدفع" : "إضافة وسيلة دفع جديدة"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">نوع وسيلة الدفع *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.emoji} {t.label} ({t.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم الحساب / الهاتف *</label>
                <input
                  type="text"
                  required
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="مثال: 01012345678 أو 1234567890"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">اسم صاحب الحساب</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="مثال: محمد أحمد"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">اسم البنك / المحفظة</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="مثال: البنك الأهلي أو فودافون كاش"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+201012345678"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">وسيلة الدفع الافتراضية (تظهر أولاً للمستخدمين)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">نشطة (تظهر للمستخدمين)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {editingId ? "تحديث" : "إنشاء"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterActive(null)}
          className={`px-4 py-2 rounded-lg ${
            filterActive === null
              ? "bg-blue-600 text-white"
              : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          الكل ({methods.length})
        </button>
        <button
          onClick={() => setFilterActive(true)}
          className={`px-4 py-2 rounded-lg ${
            filterActive === true
              ? "bg-green-600 text-white"
              : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          نشطة ({methods.filter((m) => m.isActive).length})
        </button>
        <button
          onClick={() => setFilterActive(false)}
          className={`px-4 py-2 rounded-lg ${
            filterActive === false
              ? "bg-red-600 text-white"
              : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          معطلة ({methods.filter((m) => !m.isActive).length})
        </button>
      </div>

      {/* Payment Methods Table */}
      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">💳</p>
          <p>لا توجد وسائل دفع</p>
          <p className="text-sm">أضف وسيلة دفع ليتمكن الوالدين من الإيداع</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-right font-semibold">النوع</th>
                <th className="px-4 py-3 text-right font-semibold">رقم الحساب</th>
                <th className="px-4 py-3 text-right font-semibold">اسم الحساب</th>
                <th className="px-4 py-3 text-right font-semibold">البنك / المحفظة</th>
                <th className="px-4 py-3 text-right font-semibold">الهاتف</th>
                <th className="px-4 py-3 text-right font-semibold">افتراضي</th>
                <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((method) => {
                const typeInfo = getTypeInfo(method.type);
                return (
                  <tr
                    key={method.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded text-xs font-semibold">
                        {typeInfo.emoji} {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{method.accountNumber}</td>
                    <td className="px-4 py-3 text-sm">{method.accountName || "-"}</td>
                    <td className="px-4 py-3 text-sm">{method.bankName || "-"}</td>
                    <td className="px-4 py-3 text-sm font-mono">{method.phoneNumber || "-"}</td>
                    <td className="px-4 py-3">
                      {method.isDefault ? (
                        <span className="text-yellow-600 dark:text-yellow-400 font-semibold">★ افتراضي</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          method.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {method.isActive ? "نشطة" : "معطلة"}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(method)}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                        title="تعديل"
                      >
                        <Edit2 size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("هل تريد حذف وسيلة الدفع هذه؟")) {
                            deleteMutation.mutate(method.id);
                          }
                        }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
