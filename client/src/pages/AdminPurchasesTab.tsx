import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

function fetchPurchases() {
  return fetch("/api/admin/purchases", {
    headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
  }).then((r) => r.json());
}

export default function AdminPurchasesTab() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");
  const { data, isLoading, refetch } = useQuery<any, Error>({ queryKey: ["admin", "purchases"], queryFn: async () => {
    const res = await apiRequest("GET", "/api/admin/purchases");
    return res.json();
  } });

  async function updateStatus(id: string, status: string) {
    await apiRequest("PATCH", `/api/admin/purchases/${id}/status`, { status });
    queryClient.invalidateQueries({ queryKey: ["admin", "purchases"] });
  }

  if (isLoading) return <div>Loading purchases...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Purchases</h2>
      {data?.data?.length === 0 && <div>No purchases found.</div>}
      <ul className="space-y-3">
        {data?.data?.map((p: any) => (
          <li key={p.id} className="p-3 border rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">Order #{p.id}</div>
                <div className="text-sm text-gray-600">Status: {p.status}</div>
                <div className="text-sm">Total: {p.totalAmount}</div>
              </div>
              <div className="space-x-2">
                <Button onClick={() => updateStatus(p.id, "approved")} className="bg-green-600">Approve</Button>
                <Button onClick={() => updateStatus(p.id, "rejected")} className="ml-2 bg-red-600">Reject</Button>
              </div>
            </div>
            <div className="mt-2">
              <strong>Items:</strong>
              <ul className="mt-1 space-y-1">
                {p.items?.map((it: any) => (
                  <li key={it.id} className="text-sm">{it.productName} x {it.quantity}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
