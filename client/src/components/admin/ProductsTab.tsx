import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  pointsPrice: number;
  stock: number;
  image?: string;
}

export function ProductsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    pointsPrice: "",
    stock: "999",
    image: "",
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<Product[]>;
    },
    enabled: !!token,
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingProduct) {
        const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update product");
        return res.json();
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to create product");
        // If API returns created product, optimistic update cache
        if (json?.success && json?.data) {
          queryClient.setQueryData(["admin-products"], (old: any) => {
            const list = old?.data || old || [];
            return { ...old, data: [json.data, ...list] };
          });
        }
        await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: "", description: "", price: "", pointsPrice: "", stock: "999", image: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ name: "", description: "", price: "", pointsPrice: "", stock: "999", image: "" });
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: typeof product.price === "string" ? product.price : product.price.toString(),
      pointsPrice: product.pointsPrice.toString(),
      stock: product.stock.toString(),
      image: product.image || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.price || !formData.pointsPrice) {
      alert("Please fill all required fields (Name, Price, Points Price)");
      return;
    }
    addMutation.mutate({
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      pointsPrice: parseInt(formData.pointsPrice),
      stock: parseInt(formData.stock),
      image: formData.image,
    });
  };

  if (isLoading) return <div className="p-4">Loading products...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Products Management</h2>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="mb-3">
              {product.image && (
                <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded mb-2" />
              )}
              <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{product.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div>
                <p className="text-gray-600">Price</p>
                <p className="font-semibold text-lg">${parseFloat(typeof product.price === "string" ? product.price : product.price.toString()).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Points</p>
                <p className="font-semibold text-lg">{product.pointsPrice}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Stock</p>
                <p className="font-semibold">{product.stock} units</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(product)}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this product?")) {
                    deleteMutation.mutate(product.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {products?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No products yet</p>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create First Product
          </button>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Toy Car"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  placeholder="Product description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Points Price *</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={formData.pointsPrice}
                    onChange={(e) => setFormData({ ...formData, pointsPrice: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Stock</label>
                <input
                  type="number"
                  placeholder="999"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={addMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {addMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
