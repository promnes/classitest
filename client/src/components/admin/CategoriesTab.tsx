import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus, Package } from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

const ICONS = [
  "Package", "ShoppingBag", "Gift", "Star", "Heart", "Book", "Gamepad2", 
  "Shirt", "Watch", "Headphones", "Camera", "Music", "Palette", "Trophy"
];

const COLORS = [
  "#667eea", "#4ade80", "#f97316", "#ec4899", "#8b5cf6", 
  "#06b6d4", "#eab308", "#ef4444", "#22c55e", "#3b82f6"
];

export function CategoriesTab({
  token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    icon: "Package",
    color: "#667eea",
    sortOrder: 0,
    isActive: true,
  });

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";
      const method = editingCategory ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      nameAr: "",
      icon: "Package",
      color: "#667eea",
      sortOrder: 0,
      isActive: true,
    });
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      nameAr: "",
      icon: "Package",
      color: "#667eea",
      sortOrder: 0,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      nameAr: category.nameAr,
      icon: category.icon,
      color: category.color,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.nameAr) {
      alert("Please fill name and Arabic name");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-4">Loading categories...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">أقسام المتجر - Store Categories</h2>
        <Button onClick={handleAdd} data-testid="button-add-category">
          <Plus className="w-4 h-4 mr-2" />
          إضافة قسم
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category: Category) => (
          <Card key={category.id} className={`${!category.isActive ? "opacity-50" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: category.color }}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{category.nameAr}</CardTitle>
                  <p className="text-sm text-muted-foreground">{category.name}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleEdit(category)}
                  data-testid={`button-edit-category-${category.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleDelete(category.id)}
                  data-testid={`button-delete-category-${category.id}`}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span>الترتيب: {category.sortOrder}</span>
                <span className={category.isActive ? "text-green-600" : "text-red-600"}>
                  {category.isActive ? t("admin.categories.active") : t("admin.categories.inactive")}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد أقسام. اضغط على "إضافة قسم" لإنشاء قسم جديد.
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "تعديل القسم" : "إضافة قسم جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Electronics"
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label>الاسم بالعربية</Label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="إلكترونيات"
                data-testid="input-category-name-ar"
              />
            </div>
            <div>
              <Label>اللون</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-black dark:border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>الترتيب</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-category-sort-order"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-category-active"
              />
              <Label>نشط</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeModal}>
                إلغاء
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                data-testid="button-save-category"
              >
                {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
