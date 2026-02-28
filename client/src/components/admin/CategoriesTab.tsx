import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, Trash2, Plus, Package, ChevronDown, ChevronRight, 
  FolderOpen, Layers 
} from "lucide-react";

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  nameAr: string;
  namePt: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

const COLORS = [
  "#667eea", "#4ade80", "#f97316", "#ec4899", "#8b5cf6", 
  "#06b6d4", "#eab308", "#ef4444", "#22c55e", "#3b82f6"
];

export function CategoriesTab({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    namePt: "",
    icon: "Package",
    color: "#667eea",
    sortOrder: 0,
    isActive: true,
    parentId: null as string | null,
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

  const categories: Category[] = Array.isArray(categoriesData) ? categoriesData : [];
  const mainCategories = categories.filter(c => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const getSubcategories = (parentId: string) => 
    categories.filter(c => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

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
    setAddingSubcategoryTo(null);
    setFormData({
      name: "",
      nameAr: "",
      namePt: "",
      icon: "Package",
      color: "#667eea",
      sortOrder: 0,
      isActive: true,
      parentId: null,
    });
  };

  const handleAddMain = () => {
    setEditingCategory(null);
    setAddingSubcategoryTo(null);
    setFormData({
      name: "",
      nameAr: "",
      namePt: "",
      icon: "Package",
      color: "#667eea",
      sortOrder: mainCategories.length,
      isActive: true,
      parentId: null,
    });
    setIsModalOpen(true);
  };

  const handleAddSubcategory = (parentId: string) => {
    const subs = getSubcategories(parentId);
    const parent = categories.find(c => c.id === parentId);
    setEditingCategory(null);
    setAddingSubcategoryTo(parentId);
    setFormData({
      name: "",
      nameAr: "",
      namePt: "",
      icon: parent?.icon || "Package",
      color: parent?.color || "#667eea",
      sortOrder: subs.length,
      isActive: true,
      parentId,
    });
    setExpandedCategories(prev => new Set([...prev, parentId]));
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setAddingSubcategoryTo(null);
    setFormData({
      name: category.name,
      nameAr: category.nameAr,
      namePt: category.namePt || "",
      icon: category.icon,
      color: category.color,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      parentId: category.parentId,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.nameAr) {
      alert(t("admin.categories.fillRequired"));
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDelete = (category: Category) => {
    const subs = getSubcategories(category.id);
    const msg = subs.length > 0 
      ? t("admin.categories.deleteWithSubs", { count: subs.length })
      : t("admin.categories.confirmDelete");
    if (confirm(msg)) {
      deleteMutation.mutate(category.id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) return <div className="p-4">{t("admin.categories.loading")}</div>;

  const getModalTitle = () => {
    if (editingCategory) {
      return editingCategory.parentId 
        ? t("admin.categories.editSubcategory")
        : t("admin.categories.editCategory");
    }
    return addingSubcategoryTo 
      ? t("admin.categories.addSubcategory")
      : t("admin.categories.addCategory");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-500" />
            {t("admin.categories.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.categories.subtitle")}</p>
        </div>
        <Button onClick={handleAddMain} data-testid="button-add-category">
          <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
          {t("admin.categories.addMainCategory")}
        </Button>
      </div>

      <div className="space-y-3">
        {mainCategories.map((mainCat) => {
          const subs = getSubcategories(mainCat.id);
          const isExpanded = expandedCategories.has(mainCat.id);

          return (
            <Card key={mainCat.id} className={`${!mainCat.isActive ? "opacity-50" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleExpand(mainCat.id)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: mainCat.color }}
                    >
                      <Package className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{isAr ? mainCat.nameAr : mainCat.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {isAr ? mainCat.name : mainCat.nameAr}
                      </p>
                    </div>

                    <Badge variant="secondary" className="shrink-0">
                      {subs.length} {t("admin.categories.subcategories")}
                    </Badge>

                    {!mainCat.isActive && (
                      <Badge variant="destructive" className="shrink-0">
                        {t("admin.categories.inactive")}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-1 shrink-0 ltr:ml-2 rtl:mr-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleAddSubcategory(mainCat.id)}
                      title={t("admin.categories.addSubcategory")}
                    >
                      <Plus className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                      {t("admin.categories.sub")}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleEdit(mainCat)}
                      data-testid={`button-edit-category-${mainCat.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleDelete(mainCat)}
                      data-testid={`button-delete-category-${mainCat.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  {subs.length > 0 ? (
                    <div className="ltr:ml-10 rtl:mr-10 space-y-2 border-t pt-3 mt-2">
                      {subs.map((sub) => (
                        <div 
                          key={sub.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            sub.isActive 
                              ? "bg-gray-50 dark:bg-gray-800/50" 
                              : "bg-gray-100 dark:bg-gray-900/50 opacity-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-md flex items-center justify-center text-white"
                              style={{ backgroundColor: sub.color }}
                            >
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{isAr ? sub.nameAr : sub.name}</p>
                              <p className="text-xs text-muted-foreground">{isAr ? sub.name : sub.nameAr}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(sub)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(sub)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ltr:ml-10 rtl:mr-10 text-center py-4 text-sm text-muted-foreground border-t mt-2">
                      <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      {t("admin.categories.noSubcategories")}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {mainCategories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          {t("admin.categories.empty")}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getModalTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.categories.nameEn")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Electronics"
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label>{t("admin.categories.nameAr")}</Label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="إلكترونيات"
                data-testid="input-category-name-ar"
                dir="rtl"
              />
            </div>
            <div>
              <Label>{t("admin.categories.namePt")}</Label>
              <Input
                value={formData.namePt}
                onChange={(e) => setFormData({ ...formData, namePt: e.target.value })}
                placeholder="Eletrônicos"
              />
            </div>
            <div>
              <Label>{t("admin.categories.color")}</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      formData.color === color ? "border-black dark:border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>{t("admin.categories.sortOrder")}</Label>
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
              <Label>{t("admin.categories.activeLabel")}</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeModal}>
                {t("admin.categories.cancel")}
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                data-testid="button-save-category"
              >
                {saveMutation.isPending ? t("admin.categories.saving") : t("admin.categories.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
