import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DepositData {
  id: string;
  parentId: string;
  paymentMethodId: string;
  amount: string | number;
  status: string;
  transactionId?: string;
  createdAt: string;
  completedAt?: string;
}

export function DepositsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: deposits, isLoading } = useQuery({
    queryKey: ["admin-deposits"],
    queryFn: async () => {
      const res = await fetch("/api/admin/deposits", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<DepositData[]>;
    },
    enabled: !!token,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update deposit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
  });

  const filteredDeposits = deposits?.filter(
    (deposit) => filterStatus === "all" || deposit.status === filterStatus
  ) || [];

  if (isLoading) return <div className="p-4">Loading deposits...</div>;

  const statuses = ["pending", "completed", "cancelled"];
  const statusColors: { [key: string]: string } = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const totalDeposits = filteredDeposits.reduce(
    (sum, d) => sum + parseFloat(typeof d.amount === "string" ? d.amount : d.amount.toString()),
    0
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Deposits Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            All ({deposits?.length || 0})
          </button>
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg capitalize ${
                filterStatus === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {status} ({deposits?.filter((d) => d.status === status).length || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="text-right">
          <p className="text-gray-600 text-sm">Total (Filtered)</p>
          <p className="text-3xl font-bold text-green-600">${totalDeposits.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Deposit ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeposits?.map((deposit) => (
              <tr key={deposit.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-gray-900">
                  {deposit.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                  ${parseFloat(typeof deposit.amount === "string" ? deposit.amount : deposit.amount.toString()).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[deposit.status]}`}>
                    {deposit.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {deposit.transactionId ? deposit.transactionId.substring(0, 12) : "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(deposit.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <select
                    value={deposit.status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({ id: deposit.id, status: e.target.value })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:border-blue-600 disabled:opacity-50"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDeposits?.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No deposits found with the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
