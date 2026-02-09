import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Smile } from "lucide-react";

interface Symbol {
  id: string;
  name: string;
  nameAr: string | null;
  emoji: string | null;
  imageUrl: string | null;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

const SYMBOL_CATEGORIES = [
  { value: "general", label: "عام" },
  { value: "education", label: "تعليم" },
  { value: "rewards", label: "مكافآت" },
  { value: "tasks", label: "مهام" },
  { value: "emotions", label: "مشاعر" },
  { value: "animals", label: "حيوانات" },
  { value: "sports", label: "رياضة" },
];

const COMMON_EMOJIS = [
  "⭐", "🌟", "💫", "✨", "🎯", "🏆", "🥇", "🎖️", "📚", "📝",
  "✅", "❤️", "💪", "👍", "🙌", "🎉", "🎊", "🎁", "🌈", "☀️",
  "🦁", "🐻", "🦊", "🐶", "🐱", "🦋", "🌺", "🌸", "🍎", "🍪"
];

export function SymbolsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<Symbol | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    emoji: "",
    imageUrl: "",
    category: "general",
    sortOrder: 0,
    isActive: true,
  });

  const { data: symbolsData, isLoading } = useQuery({
    queryKey: ["admin-symbols"],
    queryFn: async () => {
      const res = await fetch("/api/admin/symbols", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const symbolsList = Array.isArray(symbolsData) ? symbolsData : [];

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingSymbol
        ? `/api/admin/symbols/${editingSymbol.id}`
        : "/api/admin/symbols";
      const method = editingSymbol ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save symbol");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-symbols"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/symbols/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete symbol");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-symbols"] });
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSymbol(null);
    setFormData({
      name: "",
      nameAr: "",
      emoji: "",
      imageUrl: "",
      category: "general",
      sortOrder: 0,
      isActive: true,
    });
  };

  const handleAdd = () => {
    setEditingSymbol(null);
    setFormData({
      name: "",
      nameAr: "",
      emoji: "",
      imageUrl: "",
      category: "general",
      sortOrder: 0,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (symbol: Symbol) => {
    setEditingSymbol(symbol);
    setFormData({
      name: symbol.name,
      nameAr: symbol.nameAr || "",
      emoji: symbol.emoji || "",
      imageUrl: symbol.imageUrl || "",
      category: symbol.category,
      sortOrder: symbol.sortOrder,
      isActive: symbol.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      alert("Please enter a name");
      return;
    }
    if (!formData.emoji && !formData.imageUrl) {
      alert("Please select an emoji or provide an image URL");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الرمز؟")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-4">Loading symbols...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">مكتبة الرموز - Symbols Library</h2>
        <Button onClick={handleAdd} data-testid="button-add-symbol">
          <Plus className="w-4 h-4 mr-2" />
          إضافة رمز
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {symbolsList.map((symbol: Symbol) => (
          <Card key={symbol.id} className={`relative ${!symbol.isActive ? "opacity-50" : ""}`}>
            <CardContent className="p-4 text-center">
              <div className="text-4xl mb-2">
                {symbol.emoji || (
                  <img src={symbol.imageUrl || ""} alt={symbol.name} className="w-12 h-12 mx-auto object-contain" />
                )}
              </div>
              <p className="text-sm font-medium truncate">{symbol.nameAr || symbol.name}</p>
              <p className="text-xs text-muted-foreground">{symbol.category}</p>
              <div className="flex justify-center gap-1 mt-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(symbol)}
                  data-testid={`button-edit-symbol-${symbol.id}`}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(symbol.id)}
                  data-testid={`button-delete-symbol-${symbol.id}`}
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {symbolsList.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Smile className="w-16 h-16 mx-auto mb-4 opacity-50" />
          لا توجد رموز. اضغط على "إضافة رمز" لإنشاء رمز جديد.
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSymbol ? "تعديل الرمز" : "إضافة رمز جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم بالإنجليزية</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Star"
                data-testid="input-symbol-name"
              />
            </div>
            <div>
              <Label>الاسم بالعربية</Label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="نجمة"
                dir="rtl"
                data-testid="input-symbol-name-ar"
              />
            </div>
            <div>
              <Label>اختر رمز تعبيري</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-2 border rounded-lg max-h-32 overflow-y-auto">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, emoji, imageUrl: "" })}
                    className={`text-2xl p-1 rounded hover:bg-accent ${
                      formData.emoji === emoji ? "bg-accent ring-2 ring-primary" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>أو رابط صورة</Label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value, emoji: "" })}
                placeholder="https://example.com/symbol.png"
                data-testid="input-symbol-image-url"
              />
            </div>
            <div>
              <Label>الفئة</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger data-testid="select-symbol-category">
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الترتيب</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-symbol-sort-order"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-symbol-active"
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
                data-testid="button-save-symbol"
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
