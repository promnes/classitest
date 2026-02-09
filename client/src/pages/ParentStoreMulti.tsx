import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

async function fetchProducts() {
  return fetch("/api/parent/store/products", {
    headers: { Authorization: `Bearer ${localStorage.getItem("parentToken")}` },
  }).then((r) => r.json());
}

export default function ParentStoreMulti() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("token");
  const { data, isLoading, refetch } = useQuery<any, Error>({ queryKey: ["parent", "store", "products"], queryFn: async () => {
    const res = await apiRequest("GET", "/api/parent/store/products");
    return res.json();
  } });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<any>(null);

  function addToCart(productId: string) {
    setCart((c) => ({ ...c, [productId]: (c[productId] || 0) + 1 }));
  }

  function removeFromCart(productId: string) {
    setCart((c) => {
      const copy = { ...c };
      if (!copy[productId]) return copy;
      copy[productId] = copy[productId] - 1;
      if (copy[productId] <= 0) delete copy[productId];
      return copy;
    });
  }

  async function previewCheckout() {
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    const r = await apiRequest("POST", "/api/parent/store/checkout", { items });
    const resp = await r.json();
    setPreview(resp.data);
  }

  async function confirmCheckout() {
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    await apiRequest("POST", "/api/parent/store/checkout/confirm", { items });
    setCart({});
    setPreview(null);
    queryClient.invalidateQueries({ queryKey: ["parent", "store", "products"] });
    alert("Purchase completed. Awaiting admin approval.");
  }

  if (isLoading) return <div>Loading store...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Store</h2>
      <div className="grid grid-cols-3 gap-4">
        {data?.data?.map((p: any) => (
          <div key={p.id} className="p-3 border rounded">
            <div className="font-semibold">{p.name || p.title || p.productName}</div>
              <div className="text-sm text-gray-600">Price: {p.price}</div>
            <div className="mt-2">
              <Button onClick={() => addToCart(p.id)} className="bg-blue-600">Add</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="font-bold">Cart</h3>
        {Object.keys(cart).length === 0 && <div>Cart is empty.</div>}
        <ul className="space-y-2">
          {Object.entries(cart).map(([pid, qty]) => (
            <li key={pid} className="flex items-center justify-between">
              <div>{pid} x {qty}</div>
              <div>
                <button onClick={() => removeFromCart(pid)} className="px-2 py-1 bg-gray-200 rounded">-</button>
              </div>
            </li>
          ))}
        </ul>
        {Object.keys(cart).length > 0 && (
          <div className="mt-3 space-x-2">
            <button onClick={previewCheckout} className="px-3 py-1 bg-indigo-600 text-white rounded">Preview</button>
            <button onClick={confirmCheckout} className="px-3 py-1 bg-green-600 text-white rounded">Confirm Purchase</button>
          </div>
        )}
      </div>

      {preview && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <h4 className="font-semibold">Preview</h4>
          <div>Total: {preview.totalAmount}</div>
          <div>Items: {preview.items?.length}</div>
        </div>
      )}
    </div>
  );
}
