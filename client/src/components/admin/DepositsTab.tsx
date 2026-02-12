import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DepositData {
  id: string;
  parentId: string;
  paymentMethodId: string;
  amount: string | number;
  status: string;
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  completedAt?: string;
  reviewedAt?: string;
  parentName?: string;
  parentEmail?: string;
  methodType?: string;
  methodBank?: string;
  methodAccount?: string;
}

const PAYMENT_TYPES: Record<string, { label: string; emoji: string }> = {
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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد المراجعة", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { label: "مقبول", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  cancelled: { label: "مرفوض", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export function DepositsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: deposits, isLoading } = useQuery({
    queryKey: ["admin-deposits"],
    queryFn: async () => {
      const res = await fetch("/api/admin/deposits", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) return [];
      return (json?.data || []) as DepositData[];
    },
    enabled: !!token,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) => {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed", adminNotes }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
      setReviewingId(null);
      setAdminNotes("");
      toast({ title: "تم قبول الإيداع وإضافة الرصيد للمستخدم" });
    },
    onError: (error: any) => {
      toast({ title: "فشل قبول الإيداع", description: error?.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) => {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled", adminNotes }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      setReviewingId(null);
      setAdminNotes("");
      toast({ title: "تم رفض الإيداع" });
    },
    onError: (error: any) => {
      toast({ title: "فشل رفض الإيداع", description: error?.message, variant: "destructive" });
    },
  });

  const allDeposits = deposits || [];
  const filteredDeposits = filterStatus === "all"
    ? allDeposits
    : allDeposits.filter((d) => d.status === filterStatus);

  const totalFiltered = filteredDeposits.reduce(
    (sum, d) => sum + parseFloat(typeof d.amount === "string" ? d.amount : d.amount.toString()),
    0
  );

  const pendingCount = allDeposits.filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة الإيداعات</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            مراجعة طلبات الإيداع من الوالدين — قبول أو رفض
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="px-4 py-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded-lg font-bold animate-pulse">
            ⏳ {pendingCount} طلب قيد المراجعة
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الإيداعات</p>
          <p className="text-2xl font-bold">{allDeposits.length}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-center">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">قيد المراجعة</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{pendingCount}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 text-center">
          <p className="text-sm text-green-700 dark:text-green-400">مقبولة</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {allDeposits.filter((d) => d.status === "completed").length}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
          <p className="text-sm text-blue-700 dark:text-blue-400">المجموع (المفلتر)</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            ₪{totalFiltered.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: `الكل (${allDeposits.length})` },
          { key: "pending", label: `قيد المراجعة (${allDeposits.filter((d) => d.status === "pending").length})` },
          { key: "completed", label: `مقبولة (${allDeposits.filter((d) => d.status === "completed").length})` },
          { key: "cancelled", label: `مرفوضة (${allDeposits.filter((d) => d.status === "cancelled").length})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              filterStatus === f.key
                ? "bg-blue-600 text-white"
                : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filteredDeposits.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">📋</p>
          <p>لا توجد إيداعات</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-sm">الوالد</th>
                <th className="px-4 py-3 text-right font-semibold text-sm">وسيلة الدفع</th>
                <th className="px-4 py-3 text-right font-semibold text-sm">المبلغ</th>
                <th className="px-4 py-3 text-right font-semibold text-sm">ملاحظات المستخدم</th>
                <th className="px-4 py-3 text-right font-semibold text-sm">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold text-sm">التاريخ</th>
                <th className="px-4 py-3 text-right font-semibold text-sm">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeposits.map((deposit) => {
                const typeInfo = PAYMENT_TYPES[deposit.methodType || ""] || { label: deposit.methodType || "-", emoji: "💰" };
                const statusInfo = STATUS_MAP[deposit.status] || { label: deposit.status, color: "bg-gray-100 text-gray-800" };
                const isPending = deposit.status === "pending";
                const isReviewing = reviewingId === deposit.id;

                return (
                  <React.Fragment key={deposit.id}>
                    <tr className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${isPending ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-sm">{deposit.parentName || "-"}</p>
                          <p className="text-xs text-gray-500">{deposit.parentEmail || ""}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded">
                          {typeInfo.emoji} {typeInfo.label}
                        </span>
                        {deposit.methodBank && (
                          <p className="text-xs text-gray-500 mt-1">{deposit.methodBank}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-lg">
                          ₪{parseFloat(typeof deposit.amount === "string" ? deposit.amount : deposit.amount.toString()).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[200px]">
                        <div className="space-y-1">
                          {deposit.transactionId ? (
                            <p className="text-xs text-gray-700 dark:text-gray-300">
                              🔖 Ref: <span className="font-mono">{deposit.transactionId}</span>
                            </p>
                          ) : null}
                          {deposit.notes ? (
                            <p className="text-gray-700 dark:text-gray-300 truncate" title={deposit.notes}>
                              {deposit.notes}
                            </p>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          {deposit.receiptUrl ? (
                            <a
                              href={deposit.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 underline"
                            >
                              🧾 عرض الإثبات
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {deposit.adminNotes && (
                          <p className="text-xs text-gray-500 mt-1" title={deposit.adminNotes}>
                            📝 {deposit.adminNotes.substring(0, 30)}{deposit.adminNotes.length > 30 ? "..." : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(deposit.createdAt).toLocaleDateString("ar-EG")}
                        <br />
                        <span className="text-xs">{new Date(deposit.createdAt).toLocaleTimeString("ar-EG")}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isPending ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setReviewingId(isReviewing ? null : deposit.id)}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              مراجعة
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {deposit.reviewedAt
                              ? `تمت المراجعة ${new Date(deposit.reviewedAt).toLocaleDateString("ar-EG")}`
                              : "تمت المعالجة"}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Review Panel */}
                    {isReviewing && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700">
                          <div className="max-w-xl mx-auto space-y-3">
                            <h4 className="font-bold text-center">مراجعة طلب الإيداع</h4>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-sm space-y-1">
                              <p><strong>الوالد:</strong> {deposit.parentName} ({deposit.parentEmail})</p>
                              <p><strong>المبلغ:</strong> ₪{parseFloat(typeof deposit.amount === "string" ? deposit.amount : deposit.amount.toString()).toFixed(2)}</p>
                              <p><strong>وسيلة الدفع:</strong> {typeInfo.emoji} {typeInfo.label} {deposit.methodBank ? `— ${deposit.methodBank}` : ""}</p>
                              {deposit.transactionId && <p><strong>رقم العملية:</strong> <span className="font-mono">{deposit.transactionId}</span></p>}
                              {deposit.notes && <p><strong>ملاحظات المستخدم:</strong> {deposit.notes}</p>}
                              {deposit.receiptUrl && (
                                <p>
                                  <strong>إثبات التحويل:</strong>{" "}
                                  <a
                                    href={deposit.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 underline"
                                  >
                                    فتح الرابط
                                  </a>
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">ملاحظات الأدمن (اختياري)</label>
                              <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="أضف ملاحظة... (اختياري)"
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                rows={2}
                              />
                            </div>

                            <div className="flex gap-3 justify-center">
                              <button
                                onClick={() => approveMutation.mutate({ id: deposit.id, adminNotes: adminNotes || undefined })}
                                disabled={approveMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
                              >
                                <CheckCircle size={18} />
                                قبول وإضافة الرصيد
                              </button>
                              <button
                                onClick={() => rejectMutation.mutate({ id: deposit.id, adminNotes: adminNotes || undefined })}
                                disabled={rejectMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-bold"
                              >
                                <XCircle size={18} />
                                رفض
                              </button>
                              <button
                                onClick={() => { setReviewingId(null); setAdminNotes(""); }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
