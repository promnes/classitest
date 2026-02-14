import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, X, BookOpen, ChevronDown, ChevronUp, ExternalLink, Download, Globe, Code, Upload, CheckCircle2, AlertTriangle, Lightbulb, FolderOpen } from "lucide-react";

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
  const [showGuide, setShowGuide] = useState(false);

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

  if (isLoading) return <div className="p-4 text-gray-700 dark:text-gray-200">جاري التحميل...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
          <Gamepad2 className="w-7 h-7" />
          إدارة الألعاب
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            إضافة لعبة
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition"
          >
            <BookOpen className="w-5 h-5" />
            دليل الألعاب
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========== GUIDE PANEL ========== */}
      {showGuide && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border-2 border-amber-200 dark:border-amber-700/50 rounded-2xl p-6 space-y-6 shadow-lg">
          
          {/* Guide Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">📖 دليل إضافة الألعاب الشامل</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">من الصفر حتى تشغيل اللعبة على المنصة</p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-amber-200/50 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Section 1: How it works */}
          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Gamepad2 className="w-5 h-5" /> كيف يعمل نظام الألعاب؟
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p>الألعاب تعمل عبر <strong>iframe</strong> — أي صفحة ويب (HTML) يمكن تحميلها داخل إطار في صفحة الطفل.</p>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 font-mono text-xs" dir="ltr">
                الأدمن يضيف اللعبة → الولي يتحكم بالوصول → الطفل يلعب → يضغط "أنهيت" → يحصل نقاط
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🎮</div>
                  <div className="font-semibold text-blue-700 dark:text-blue-300 text-xs">نوع اللعبة</div>
                  <div className="text-xs mt-1">HTML5 / ويب</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📦</div>
                  <div className="font-semibold text-green-700 dark:text-green-300 text-xs">التضمين</div>
                  <div className="text-xs mt-1">iframe بداخل الموقع</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">⭐</div>
                  <div className="font-semibold text-yellow-700 dark:text-yellow-300 text-xs">المكافأة</div>
                  <div className="text-xs mt-1">نقاط عند الانتهاء</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Game types */}
          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Code className="w-5 h-5" /> أنواع الألعاب المدعومة
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p>أي لعبة تعمل في المتصفح (HTML5) مدعومة. أشهر الأنواع:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border dark:border-gray-600 rounded-lg p-3">
                  <div className="font-semibold flex items-center gap-2">✅ مدعوم</div>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• ألعاب HTML5 + CSS + JavaScript (ملف واحد أو مجلد)</li>
                    <li>• ألعاب مصنوعة بـ Construct 2/3, GDevelop, Phaser</li>
                    <li>• ألعاب Canvas / WebGL</li>
                    <li>• ألعاب من مواقع التضمين (embed URL)</li>
                    <li>• أي صفحة ويب تفاعلية</li>
                  </ul>
                </div>
                <div className="border dark:border-gray-600 rounded-lg p-3">
                  <div className="font-semibold flex items-center gap-2">❌ غير مدعوم</div>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• ألعاب Flash (SWF) — متوقفة من 2020</li>
                    <li>• ألعاب تحتاج تثبيت (EXE, APK)</li>
                    <li>• ألعاب Unity WebGL ثقيلة جداً (&gt;50MB)</li>
                    <li>• ألعاب تحتاج اتصال بسيرفر خاص</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Free sources */}
          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
              <Download className="w-5 h-5" /> مصادر ألعاب مجانية 🆓
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                <a href="https://itch.io/games/html5/free" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition group">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline">🎮 itch.io</div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs mt-1">أكبر مكتبة ألعاب HTML5 مجانية. آلاف الألعاب التعليمية والترفيهية.</p>
                  <div className="text-xs mt-2 text-green-600 dark:text-green-400 font-medium">💡 ابحث عن: "educational HTML5 game"</div>
                </a>

                <a href="https://github.com/nicknamedev/html5-games" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition group">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline">🐙 GitHub</div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs mt-1">مستودعات مفتوحة المصدر. حمّل الكود وضعه في مجلد public/games/</p>
                  <div className="text-xs mt-2 text-green-600 dark:text-green-400 font-medium">💡 ابحث عن: "html5 math game for kids"</div>
                </a>

                <a href="https://www.crazygames.com/t/html5" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition group">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline">🤪 CrazyGames</div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs mt-1">ألعاب مجانية يمكن تضمينها عبر رابط مباشر (embed URL).</p>
                  <div className="text-xs mt-2 text-green-600 dark:text-green-400 font-medium">💡 استخدم رابط اللعبة مباشرة</div>
                </a>

                <a href="https://html5games.com" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition group">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline">🌐 HTML5Games.com</div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs mt-1">مكتبة كبيرة من ألعاب HTML5 مصنفة حسب النوع.</p>
                  <div className="text-xs mt-2 text-green-600 dark:text-green-400 font-medium">💡 مناسبة للتضمين المباشر</div>
                </a>

                <a href="https://gdevelop.io/game-example" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition group">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline">🔧 GDevelop</div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs mt-1">أداة مجانية لصنع ألعاب HTML5 بدون برمجة! + أمثلة جاهزة.</p>
                  <div className="text-xs mt-2 text-green-600 dark:text-green-400 font-medium">💡 صدّر اللعبة كـ HTML5 وارفعها</div>
                </a>

                <a href="https://www.codepen.io/search/pens?q=html5+game" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition group">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-green-700 dark:text-green-400 group-hover:underline">✏️ CodePen</div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs mt-1">ألعاب صغيرة مصنوعة بـ HTML/CSS/JS. انسخ الكود واحفظه كملف HTML.</p>
                  <div className="text-xs mt-2 text-green-600 dark:text-green-400 font-medium">💡 ابحث عن: "kids math game"</div>
                </a>
              </div>
            </div>
          </div>

          {/* Section 4: Paid sources */}
          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Globe className="w-5 h-5" /> مصادر ألعاب مدفوعة 💰
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <a href="https://codecanyon.net/category/games/html5" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-orange-400 transition group">
                  <div className="font-bold text-orange-700 dark:text-orange-400 group-hover:underline flex items-center justify-between">
                    CodeCanyon <ExternalLink className="w-3 h-3" />
                  </div>
                  <p className="text-xs mt-1">ألعاب HTML5 احترافية</p>
                  <p className="text-xs font-bold text-orange-600 mt-1">💲 $5 - $50</p>
                </a>
                <a href="https://www.construct.net/en/game-jams" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-orange-400 transition group">
                  <div className="font-bold text-orange-700 dark:text-orange-400 group-hover:underline flex items-center justify-between">
                    Construct Store <ExternalLink className="w-3 h-3" />
                  </div>
                  <p className="text-xs mt-1">ألعاب + قوالب Construct 3</p>
                  <p className="text-xs font-bold text-orange-600 mt-1">💲 $5 - $30</p>
                </a>
                <a href="https://www.gamegorillaz.com" target="_blank" rel="noopener noreferrer" className="block border dark:border-gray-600 rounded-lg p-4 hover:border-orange-400 transition group">
                  <div className="font-bold text-orange-700 dark:text-orange-400 group-hover:underline flex items-center justify-between">
                    GameGorillaz <ExternalLink className="w-3 h-3" />
                  </div>
                  <p className="text-xs mt-1">ألعاب تعليمية جاهزة</p>
                  <p className="text-xs font-bold text-orange-600 mt-1">💲 اشتراك شهري</p>
                </a>
              </div>
            </div>
          </div>

          {/* Section 5: Step by step */}
          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-4">
            <h4 className="font-bold text-lg flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <CheckCircle2 className="w-5 h-5" /> خطوات إضافة لعبة (من الصفر)
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              
              {/* Method A */}
              <div className="mb-4">
                <div className="font-bold text-base mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">A</span>
                  الطريقة الأولى: رابط خارجي (الأسَهل) ⚡
                </div>
                <ol className="space-y-2 mr-6">
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <span>اذهب لأحد المواقع أعلاه (مثل CrazyGames, HTML5Games)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    <span>اختر لعبة مناسبة وانسخ <strong>رابط اللعبة المباشر</strong> (URL)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    <span>اضغط <strong>"إضافة لعبة"</strong> أعلاه</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                    <span>ضع الرابط في حقل <strong>"رابط التضمين (Embed URL)"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</span>
                    <span>املأ الاسم والوصف والنقاط → اضغط <strong>"إنشاء"</strong> ✅</span>
                  </li>
                </ol>
              </div>

              {/* Method B */}
              <div className="mb-4">
                <div className="font-bold text-base mb-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <span className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">B</span>
                  الطريقة الثانية: رفع لعبة محلية (مستحسن) 🏠
                </div>
                <ol className="space-y-2 mr-6">
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <span>حمّل لعبة HTML5 (ملف .html واحد أو مجلد فيه index.html)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                    <div>
                      <span>ارفع الملف إلى مجلد المشروع:</span>
                      <code className="block mt-1 bg-gray-100 dark:bg-gray-800 rounded px-3 py-1.5 text-xs font-mono" dir="ltr">client/public/games/اسم-اللعبة.html</code>
                      <span className="text-xs text-gray-500">أو لعبة بعدة ملفات:</span>
                      <code className="block mt-1 bg-gray-100 dark:bg-gray-800 rounded px-3 py-1.5 text-xs font-mono" dir="ltr">client/public/games/game-name/index.html</code>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                    <div>
                      <span>في حقل "رابط التضمين" اكتب المسار المحلي:</span>
                      <code className="block mt-1 bg-gray-100 dark:bg-gray-800 rounded px-3 py-1.5 text-xs font-mono" dir="ltr">/games/اسم-اللعبة.html</code>
                      <span className="text-xs text-gray-500">أو:</span>
                      <code className="block mt-1 bg-gray-100 dark:bg-gray-800 rounded px-3 py-1.5 text-xs font-mono" dir="ltr">/games/game-name/index.html</code>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                    <span>أعد البناء: <code className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-xs font-mono" dir="ltr">npm run build</code> ثم أعد الدبلوي</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</span>
                    <span>أضف اللعبة من هنا بالمسار المحلي ✅</span>
                  </li>
                </ol>
              </div>

              {/* Tip Box */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-700 dark:text-amber-300 text-sm">نصيحة مهمة</div>
                  <p className="text-xs mt-1">الألعاب المحلية <strong>أسرع وأضمن</strong> — لا تعتمد على موقع خارجي قد يتوقف. كما أنها تعمل بدون إنترنت قوي للطفل.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Form fields explained */}
          <div className="bg-white dark:bg-gray-700/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
              <FolderOpen className="w-5 h-5" /> شرح حقول النموذج
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-cyan-50 dark:bg-cyan-900/20">
                      <th className="border dark:border-gray-600 px-3 py-2 text-right font-bold">الحقل</th>
                      <th className="border dark:border-gray-600 px-3 py-2 text-right font-bold">مطلوب</th>
                      <th className="border dark:border-gray-600 px-3 py-2 text-right font-bold">الشرح</th>
                      <th className="border dark:border-gray-600 px-3 py-2 text-right font-bold">مثال</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border dark:border-gray-600 px-3 py-2 font-semibold">عنوان اللعبة</td>
                      <td className="border dark:border-gray-600 px-3 py-2 text-center">✅</td>
                      <td className="border dark:border-gray-600 px-3 py-2">اسم اللعبة كما يظهر للطفل</td>
                      <td className="border dark:border-gray-600 px-3 py-2 font-mono" dir="ltr">تحدي الرياضيات 🧮</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td className="border dark:border-gray-600 px-3 py-2 font-semibold">رابط التضمين</td>
                      <td className="border dark:border-gray-600 px-3 py-2 text-center">✅</td>
                      <td className="border dark:border-gray-600 px-3 py-2">URL اللعبة — رابط خارجي أو مسار محلي</td>
                      <td className="border dark:border-gray-600 px-3 py-2 font-mono" dir="ltr">/games/math.html</td>
                    </tr>
                    <tr>
                      <td className="border dark:border-gray-600 px-3 py-2 font-semibold">الوصف</td>
                      <td className="border dark:border-gray-600 px-3 py-2 text-center">❌</td>
                      <td className="border dark:border-gray-600 px-3 py-2">وصف مختصر يظهر تحت اسم اللعبة</td>
                      <td className="border dark:border-gray-600 px-3 py-2">لعبة رياضيات ممتعة!</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td className="border dark:border-gray-600 px-3 py-2 font-semibold">صورة مصغرة</td>
                      <td className="border dark:border-gray-600 px-3 py-2 text-center">❌</td>
                      <td className="border dark:border-gray-600 px-3 py-2">رابط صورة بطاقة اللعبة (إن لم توجد تظهر أيقونة)</td>
                      <td className="border dark:border-gray-600 px-3 py-2 font-mono" dir="ltr">https://...png</td>
                    </tr>
                    <tr>
                      <td className="border dark:border-gray-600 px-3 py-2 font-semibold">الفئة</td>
                      <td className="border dark:border-gray-600 px-3 py-2 text-center">❌</td>
                      <td className="border dark:border-gray-600 px-3 py-2">تصنيف اللعبة (تعليمي، رياضيات، ألغاز...)</td>
                      <td className="border dark:border-gray-600 px-3 py-2">رياضيات</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td className="border dark:border-gray-600 px-3 py-2 font-semibold">النقاط</td>
                      <td className="border dark:border-gray-600 px-3 py-2 text-center">❌</td>
                      <td className="border dark:border-gray-600 px-3 py-2">كم نقطة يحصل الطفل عند إكمال اللعب (افتراضي: 5)</td>
                      <td className="border dark:border-gray-600 px-3 py-2">10</td>
                    </tr>
                    <tr>
                      <td className="border dark:border-gray-600 px-3 py-2 font-semibold">حد يومي</td>
                      <td className="border dark:border-gray-600 px-3 py-2 text-center">❌</td>
                      <td className="border dark:border-gray-600 px-3 py-2">أقصى مرات لعب يومياً (0 = بلا حدود)</td>
                      <td className="border dark:border-gray-600 px-3 py-2">10</td>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td className="border dark:border-gray-600 px-3 py-2 font-semibold">العمر</td>
                      <td className="border dark:border-gray-600 px-3 py-2 text-center">❌</td>
                      <td className="border dark:border-gray-600 px-3 py-2">نطاق العمر المناسب (معلوماتي فقط حالياً)</td>
                      <td className="border dark:border-gray-600 px-3 py-2">6 - 14</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 7: Warnings */}
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" /> تنبيهات مهمة
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">⚠️</span>
                <span>تأكد أن اللعبة الخارجية تسمح بالتضمين (بعض المواقع تمنع iframe)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">⚠️</span>
                <span>اختبر اللعبة على الموبايل — أغلب الأطفال يستخدمون الجوال</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">⚠️</span>
                <span>تحقق أن اللعبة آمنة وخالية من إعلانات غير مناسبة للأطفال</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">⚠️</span>
                <span>النقاط تُمنح عند ضغط الطفل "أنهيت" — لا يوجد تحقق تلقائي من إنهاء اللعبة</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">⚠️</span>
                <span>بعد رفع لعبة محلية يجب إعادة البناء والنشر: <code className="bg-red-100 dark:bg-red-900/30 rounded px-2 py-0.5 font-mono text-xs" dir="ltr">npm run build</code></span>
              </div>
            </div>
          </div>

          {/* Example game */}
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-lg flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Gamepad2 className="w-5 h-5" /> اللعبة المضمنة: تحدي الرياضيات 🧮
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p>تم تضمين لعبة <strong>تحدي الرياضيات</strong> كنموذج جاهز:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500">المسار</div>
                  <code className="text-xs font-mono" dir="ltr">/games/math-challenge.html</code>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500">المميزات</div>
                  <div className="text-xs">10 أسئلة × 3 مستويات × مؤقت</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">💡 استخدم ملف هذه اللعبة كنموذج لإنشاء ألعاب مشابهة. الملف موجود في: <code className="font-mono" dir="ltr">client/public/games/math-challenge.html</code></p>
            </div>
          </div>

        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editingId ? "تعديل لعبة" : "إضافة لعبة جديدة"}</h3>
            <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">عنوان اللعبة *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">رابط التضمين (Embed URL) *</label>
              <input
                type="url"
                value={form.embedUrl}
                onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">الوصف</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">صورة مصغرة (URL)</label>
              <input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">الفئة</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">النقاط لكل لعبة</label>
              <input
                type="number"
                min="0"
                value={form.pointsPerPlay}
                onChange={(e) => setForm({ ...form, pointsPerPlay: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">الحد الأقصى مرات اللعب يومياً</label>
              <input
                type="number"
                min="0"
                value={form.maxPlaysPerDay}
                onChange={(e) => setForm({ ...form, maxPlaysPerDay: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="0 = بلا حدود"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">الحد الأدنى للعمر</label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={form.minAge}
                  onChange={(e) => setForm({ ...form, minAge: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="اختياري"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">الحد الأقصى للعمر</label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={form.maxAge}
                  onChange={(e) => setForm({ ...form, maxAge: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto border dark:border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">اللعبة</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">الفئة</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">النقاط</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">حد يومي</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">العمر</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">الحالة</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((game) => (
              <tr key={game.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {game.thumbnailUrl ? (
                      <img src={game.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Gamepad2 className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white">{game.title}</div>
                      {game.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{game.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                    {CATEGORIES.find(c => c.value === game.category)?.label || game.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-yellow-600 dark:text-yellow-400">+{game.pointsPerPlay}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{game.maxPlaysPerDay > 0 ? game.maxPlaysPerDay : "∞"}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
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
                    <span className={`text-xs ${game.isActive ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                      {game.isActive ? "مفعل" : "معطل"}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(game)}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition text-blue-600 dark:text-blue-400"
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
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition text-red-600 dark:text-red-400"
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
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد ألعاب</p>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        إجمالي: {games?.length || 0} لعبة | مفعل: {games?.filter(g => g.isActive).length || 0} | معطل: {games?.filter(g => !g.isActive).length || 0}
      </div>
    </div>
  );
}
