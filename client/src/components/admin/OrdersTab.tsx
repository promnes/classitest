import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface OrderData {
  id: string;
  parentId: string;
  childId: string;
  productId: string;
  quantity: number;
  pointsPrice: number;
  status: string;
  shippingAddress?: string;
  createdAt: string;
}

export function OrdersTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<OrderData[]>;
    },
    enabled: !!token,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const filteredOrders = orders?.filter(
    (order) => filterStatus === "all" || order.status === filterStatus
  ) || [];

  if (isLoading) return <div className="p-4">Loading orders...</div>;

  const statuses = ["pending", "completed", "cancelled"];
  const statusColors: { [key: string]: string } = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Orders Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            All ({orders?.length || 0})
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
              {status} ({orders?.filter((o) => o.status === status).length || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Order ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Points</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders?.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-gray-900">
                  {order.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                  {order.pointsPrice}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({ id: order.id, status: e.target.value })
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
        {filteredOrders?.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No orders found with the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
