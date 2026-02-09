import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface PaymentMethod {
  id: string;
  parentId: string;
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

const PAYMENT_TYPES = ["credit_card", "debit_card", "bank_transfer", "mobile_wallet", "other"];

export function PaymentMethodsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    parentId: "",
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
      return res.json();
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
      if (!res.ok) throw new Error(json?.message || "Failed to create payment method");
      if (json?.success && json?.data) {
        queryClient.setQueryData(["payment-methods"], (old: any) => {
          const list = old?.data || old || [];
          return { ...old, data: [json.data, ...list] };
        });
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      resetForm();
      setShowForm(false);
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      resetForm();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });

  const resetForm = () => {
    setFormData({
      parentId: "",
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
    if (!formData.parentId || !formData.accountNumber) {
      alert("Please fill in required fields (Parent ID and Account Number)");
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
      parentId: method.parentId,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Methods</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Manage payment methods for parents
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
          Add Payment Method
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">
            {editingId ? "Edit Payment Method" : "Add Payment Method"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Parent ID *</label>
                <input
                  type="text"
                  required
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  placeholder="UUID"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Account Number *</label>
                <input
                  type="text"
                  required
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Account Name</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="First National Bank"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1234567890"
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
                <span className="text-sm">Set as default payment method</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
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
          All ({methods.length})
        </button>
        <button
          onClick={() => setFilterActive(true)}
          className={`px-4 py-2 rounded-lg ${
            filterActive === true
              ? "bg-green-600 text-white"
              : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          Active ({methods.filter((m) => m.isActive).length})
        </button>
        <button
          onClick={() => setFilterActive(false)}
          className={`px-4 py-2 rounded-lg ${
            filterActive === false
              ? "bg-red-600 text-white"
              : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          Inactive ({methods.filter((m) => !m.isActive).length})
        </button>
      </div>

      {/* Payment Methods Table */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No payment methods found</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Parent ID</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Account Number</th>
                <th className="px-4 py-3 text-left font-semibold">Account Name</th>
                <th className="px-4 py-3 text-left font-semibold">Bank</th>
                <th className="px-4 py-3 text-left font-semibold">Default</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((method) => (
                <tr
                  key={method.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-mono text-xs">{method.parentId.substring(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded text-xs font-semibold">
                      {method.type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">****{method.accountNumber.slice(-4)}</td>
                  <td className="px-4 py-3 text-sm">{method.accountName || "-"}</td>
                  <td className="px-4 py-3 text-sm">{method.bankName || "-"}</td>
                  <td className="px-4 py-3">
                    {method.isDefault ? (
                      <span className="text-yellow-600 dark:text-yellow-400 font-semibold">★</span>
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
                      {method.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(method)}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this payment method?")) {
                          deleteMutation.mutate(method.id);
                        }
                      }}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
