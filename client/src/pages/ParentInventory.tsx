import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

export default function ParentInventory() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/parent/owned-products"],
    enabled: !!token,
  });
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [childIdInput, setChildIdInput] = useState("");

  async function assignToChild(id: string) {
    const childId = childIdInput || assigningTo;
    if (!childId) return alert("Enter child id");
    await apiRequest("POST", `/api/parent/owned-products/${id}/assign-to-child`, { childId });
    setAssigningTo(null);
    setChildIdInput("");
    queryClient.invalidateQueries({ queryKey: ["/api/parent/owned-products"] });
  }

  if (isLoading) return <div>Loading inventory...</div>;

  const products = Array.isArray(data) ? data : [];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">My Owned Products</h2>
      {products.length === 0 && <div>No owned products yet.</div>}
      <ul className="space-y-3">
        {products.map((p: any) => (
          <li key={p.id} className="p-3 border rounded">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{p.productName}</div>
                <div className="text-sm text-gray-600">Status: {p.status}</div>
              </div>
              <div className="space-x-2">
                <Button onClick={() => setAssigningTo(p.id)} className="bg-blue-600">Assign</Button>
              </div>
            </div>
            {assigningTo === p.id && (
              <div className="mt-3">
                <input className="border p-1 mr-2" placeholder="Child ID" value={childIdInput} onChange={(e) => setChildIdInput(e.target.value)} />
                <button onClick={() => assignToChild(p.id)} className="px-3 py-1 bg-green-600 text-white rounded">Confirm</button>
                <button onClick={() => setAssigningTo(null)} className="px-3 py-1 ml-2 bg-gray-200 rounded">Cancel</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
