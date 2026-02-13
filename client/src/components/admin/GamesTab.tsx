import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, X } from "lucide-react";

interface Game {
  id: string;
  title: string;
  description: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  category: string;
  minAge: number | null;
  maxAge: number | null;
  pointsPerPlay: number;
  maxPlaysPerDay: number;
  isActive: boolean;
  createdAt: string;
}

interface GameForm {
  title: string;
  description: string;
  embedUrl: string;
  thumbnailUrl: string;
  category: string;
  minAge: string;
  maxAge: string;
  pointsPerPlay: string;
  maxPlaysPerDay: string;
}

const emptyForm: GameForm = {
  title: "",
  description: "",
  embedUrl: "",
  thumbnailUrl: "",
  category: "general",
  minAge: "",
  maxAge: "",
  pointsPerPlay: "5",
  maxPlaysPerDay: "0",
};

const CATEGORIES = [
  { value: "general", label: "عام" },
  { value: "educational", label: "تعليمي" },
  { value: "math", label: "رياضيات" },
  { value: "language", label: "لغات" },
  { value: "science", label: "علوم" },
  { value: "puzzle", label: "ألغاز" },
  { value: "creative", label: "إبداعي" },
  { value: "sport", label: "رياضة" },
];

export function GamesTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GameForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["admin-games"],
    queryFn: async () => {
      const res = await fetch("/api/admin/games", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: async (data: GameForm) => {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          embedUrl: data.embedUrl,
          thumbnailUrl: data.thumbnailUrl || null,
          category: data.category,
          minAge: data.minAge ? parseInt(data.minAge) : null,
          maxAge: data.maxAge ? parseInt(data.maxAge) : null,
          pointsPerPlay: parseInt(data.pointsPerPlay) || 5,
          maxPlaysPerDay: parseInt(data.maxPlaysPerDay) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to create game");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GameForm }) => {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          embedUrl: data.embedUrl,
          thumbnailUrl: data.thumbnailUrl || null,
          category: data.category,
          minAge: data.minAge ? parseInt(data.minAge) : null,
          maxAge: data.maxAge ? parseInt(data.maxAge) : null,
          pointsPerPlay: parseInt(data.pointsPerPlay) || 5,
          maxPlaysPerDay: parseInt(data.maxPlaysPerDay) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to update game");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete game");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-games"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/games/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to toggle game");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-games"] }),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (game: Game) => {
    setForm({
      title: game.title,
      description: game.description || "",
      embedUrl: game.embedUrl,
      thumbnailUrl: game.thumbnailUrl || "",
      category: game.category || "general",
      minAge: game.minAge?.toString() || "",
      maxAge: game.maxAge?.toString() || "",
      pointsPerPlay: game.pointsPerPlay.toString(),
      maxPlaysPerDay: game.maxPlaysPerDay?.toString() || "0",
    });
    setEditingId(game.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = games?.filter(g =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) return <div className="p-4">جاري التحميل...</div>;

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gamepad2 className="w-7 h-7" />
          إدارة الألعاب
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
          />
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            إضافة لعبة
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{editingId ? "تعديل لعبة" : "إضافة لعبة جديدة"}</h3>
            <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">عنوان اللعبة *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رابط التضمين (Embed URL) *</label>
              <input
                type="url"
                value={form.embedUrl}
                onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">صورة مصغرة (URL)</label>
              <input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الفئة</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">النقاط لكل لعبة</label>
              <input
                type="number"
                min="0"
                value={form.pointsPerPlay}
                onChange={(e) => setForm({ ...form, pointsPerPlay: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الحد الأقصى مرات اللعب يومياً</label>
              <input
                type="number"
                min="0"
                value={form.maxPlaysPerDay}
                onChange={(e) => setForm({ ...form, maxPlaysPerDay: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
                placeholder="0 = بلا حدود"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">الحد الأدنى للعمر</label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={form.minAge}
                  onChange={(e) => setForm({ ...form, minAge: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
                  placeholder="اختياري"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">الحد الأقصى للعمر</label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={form.maxAge}
                  onChange={(e) => setForm({ ...form, maxAge: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingId ? "تحديث" : "إنشاء"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Games Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">اللعبة</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الفئة</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">النقاط</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">حد يومي</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">العمر</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((game) => (
              <tr key={game.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {game.thumbnailUrl ? (
                      <img src={game.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Gamepad2 className="w-6 h-6 text-purple-500" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{game.title}</div>
                      {game.description && <div className="text-xs text-gray-500 truncate max-w-[200px]">{game.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {CATEGORIES.find(c => c.value === game.category)?.label || game.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-yellow-600">+{game.pointsPerPlay}</td>
                <td className="px-4 py-3 text-sm">{game.maxPlaysPerDay > 0 ? game.maxPlaysPerDay : "∞"}</td>
                <td className="px-4 py-3 text-sm">
                  {game.minAge || game.maxAge
                    ? `${game.minAge || "—"} - ${game.maxAge || "—"}`
                    : "الكل"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleMutation.mutate(game.id)}
                    className="flex items-center gap-1"
                    title={game.isActive ? "تعطيل" : "تفعيل"}
                  >
                    {game.isActive ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                    <span className={`text-xs ${game.isActive ? "text-green-600" : "text-gray-400"}`}>
                      {game.isActive ? "مفعل" : "معطل"}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(game)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذه اللعبة؟")) {
                          deleteMutation.mutate(game.id);
                        }
                      }}
                      className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد ألعاب</p>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500">
        إجمالي: {games?.length || 0} لعبة | مفعل: {games?.filter(g => g.isActive).length || 0} | معطل: {games?.filter(g => !g.isActive).length || 0}
      </div>
    </div>
  );
}
