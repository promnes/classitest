import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ClipboardList, Plus, Pencil, Trash2, Save, X, Search,
  ToggleLeft, ToggleRight, Settings2, CheckCircle2, AlertCircle
} from "lucide-react";

// ===== Types =====

interface TemplateTask {
  id: string;
  subjectId: string;
  title: string;
  question: string;
  answers: { id: string; text: string; isCorrect: boolean }[];
  pointsReward: number;
  difficulty: string;
  isActive: boolean;
  createdByParent: boolean;
  parentId: string | null;
  isPublic: boolean;
  pointsCost: number;
  usageCount: number;
  createdAt: string;
}

interface Subject {
  id: string;
  name: string;
  nameAr: string;
  icon: string | null;
}

interface TasksSettings {
  id: string;
  maxTasksPerDay: number;
  allowCustomTasks: boolean;
  updatedAt: string;
}

interface TaskForm {
  subjectId: string;
  title: string;
  question: string;
  pointsReward: string;
  difficulty: string;
  isActive: boolean;
  isPublic: boolean;
  pointsCost: string;
  answers: { text: string; isCorrect: boolean }[];
}

const emptyForm: TaskForm = {
  subjectId: "",
  title: "",
  question: "",
  pointsReward: "10",
  difficulty: "medium",
  isActive: true,
  isPublic: false,
  pointsCost: "5",
  answers: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
};

const DIFFICULTIES = [
  { value: "easy", labelAr: "سهل", labelEn: "Easy", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  { value: "medium", labelAr: "متوسط", labelEn: "Medium", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  { value: "hard", labelAr: "صعب", labelEn: "Hard", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
];

export function TasksTab({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === "ar";

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ maxTasksPerDay: 10, allowCustomTasks: true });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ===== Queries =====

  const { data: tasks = [], isLoading } = useQuery<TemplateTask[]>({
    queryKey: ["admin-template-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/template-tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const { data: tasksSettings } = useQuery<TasksSettings>({
    queryKey: ["admin-tasks-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tasks-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.data) {
        setSettingsForm({
          maxTasksPerDay: json.data.maxTasksPerDay,
          allowCustomTasks: json.data.allowCustomTasks,
        });
      }
      return json?.data || null;
    },
    enabled: !!token,
  });

  // ===== Mutations =====

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const createMutation = useMutation({
    mutationFn: async (data: TaskForm) => {
      const payload = {
        subjectId: data.subjectId,
        title: data.title,
        question: data.question,
        pointsReward: parseInt(data.pointsReward) || 10,
        difficulty: data.difficulty,
        isActive: data.isActive,
        isPublic: data.isPublic,
        pointsCost: parseInt(data.pointsCost) || 5,
        answers: data.answers
          .filter((a) => a.text.trim())
          .map((a, i) => ({ id: `ans-${i}`, text: a.text, isCorrect: a.isCorrect })),
      };
      const res = await fetch("/api/admin/template-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || "Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] });
      resetForm();
      showToast("success", isRTL ? "تم إنشاء المهمة بنجاح" : "Task created successfully");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskForm }) => {
      const payload = {
        title: data.title,
        question: data.question,
        pointsReward: parseInt(data.pointsReward) || 10,
        difficulty: data.difficulty,
        isActive: data.isActive,
        isPublic: data.isPublic,
        pointsCost: parseInt(data.pointsCost) || 5,
        answers: data.answers
          .filter((a) => a.text.trim())
          .map((a, i) => ({ id: `ans-${i}`, text: a.text, isCorrect: a.isCorrect })),
      };
      const res = await fetch(`/api/admin/template-tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || "Failed to update task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] });
      resetForm();
      showToast("success", isRTL ? "تم تحديث المهمة بنجاح" : "Task updated successfully");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/template-tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] });
      showToast("success", isRTL ? "تم حذف المهمة" : "Task deleted");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/template-tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-template-tasks"] }),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { maxTasksPerDay: number; allowCustomTasks: boolean }) => {
      const res = await fetch("/api/admin/tasks-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks-settings"] });
      showToast("success", isRTL ? "تم حفظ الإعدادات" : "Settings saved");
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  // ===== Helpers =====

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (task: TemplateTask) => {
    const answers = Array.isArray(task.answers) ? task.answers : [];
    // Pad to 4 answers minimum
    while (answers.length < 4) {
      answers.push({ id: `ans-${answers.length}`, text: "", isCorrect: false });
    }
    setForm({
      subjectId: task.subjectId,
      title: task.title,
      question: task.question,
      pointsReward: String(task.pointsReward),
      difficulty: task.difficulty,
      isActive: task.isActive,
      isPublic: task.isPublic,
      pointsCost: String(task.pointsCost),
      answers: answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectId || !form.title || !form.question) return;
    const validAnswers = form.answers.filter((a) => a.text.trim());
    if (validAnswers.length < 2 || !validAnswers.some((a) => a.isCorrect)) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const updateAnswer = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
    setForm((prev) => {
      const answers = [...prev.answers];
      const current = answers[index];
      if (!current) return prev;
      if (field === "isCorrect") {
        // Only one correct answer
        answers.forEach((a, i) => (a.isCorrect = i === index));
      } else {
        answers[index] = { ...current, text: value as string };
      }
      return { ...prev, answers };
    });
  };

  const getSubjectName = (id: string) => {
    const s = subjects.find((sub) => sub.id === id);
    return s ? (isRTL ? s.nameAr || s.name : s.name) : "—";
  };

  const getDifficultyBadge = (d: string) => {
    const diff = DIFFICULTIES.find((x) => x.value === d) || DIFFICULTIES[1];
    return diff!;
  };

  // ===== Filtering =====

  const filtered = tasks.filter((t) => {
    const matchSearch =
      !searchTerm ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = !filterSubject || t.subjectId === filterSubject;
    const matchDiff = !filterDifficulty || t.difficulty === filterDifficulty;
    return matchSearch && matchSubject && matchDiff;
  });

  // Stats
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.isActive).length;
  const easyCount = tasks.filter((t) => t.difficulty === "easy").length;
  const mediumCount = tasks.filter((t) => t.difficulty === "medium").length;
  const hardCount = tasks.filter((t) => t.difficulty === "hard").length;

  // ===== Render =====

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white transition-all ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isDark ? "bg-purple-500/20" : "bg-purple-100"}`}>
            <ClipboardList className={`h-6 w-6 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {isRTL ? "إدارة المهام الجاهزة" : "Template Tasks"}
            </h2>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {isRTL ? "إنشاء وإدارة المهام الجاهزة للأطفال" : "Create and manage template tasks for children"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
              isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <Settings2 size={18} />
            {isRTL ? "الإعدادات" : "Settings"}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
          >
            <Plus size={18} />
            {isRTL ? "مهمة جديدة" : "New Task"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: isRTL ? "إجمالي المهام" : "Total", value: totalTasks, color: "blue" },
          { label: isRTL ? "نشطة" : "Active", value: activeTasks, color: "green" },
          { label: isRTL ? "سهل" : "Easy", value: easyCount, color: "emerald" },
          { label: isRTL ? "متوسط" : "Medium", value: mediumCount, color: "yellow" },
          { label: isRTL ? "صعب" : "Hard", value: hardCount, color: "red" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`p-4 rounded-xl text-center ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200 shadow-sm"}`}
          >
            <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stat.value}</div>
            <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}>
          <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
            {isRTL ? "إعدادات المهام" : "Task Settings"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {isRTL ? "الحد الأقصى للمهام يومياً لكل طفل" : "Max tasks per day per child"}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={settingsForm.maxTasksPerDay}
                onChange={(e) => setSettingsForm((p) => ({ ...p, maxTasksPerDay: parseInt(e.target.value) || 10 }))}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {isRTL ? "السماح بالمهام المخصصة من الآباء" : "Allow custom tasks from parents"}
              </label>
              <button
                type="button"
                onClick={() => setSettingsForm((p) => ({ ...p, allowCustomTasks: !p.allowCustomTasks }))}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                  settingsForm.allowCustomTasks
                    ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
                    : "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                }`}
              >
                {settingsForm.allowCustomTasks ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                {settingsForm.allowCustomTasks
                  ? (isRTL ? "مفعّل" : "Enabled")
                  : (isRTL ? "معطّل" : "Disabled")}
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {isRTL ? "حفظ الإعدادات" : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "right-3" : "left-3"} w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
          <input
            type="text"
            placeholder={isRTL ? "بحث في المهام..." : "Search tasks..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 rounded-xl border ${
              isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            }`}
          />
        </div>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className={`px-4 py-2.5 rounded-xl border ${
            isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
          }`}
        >
          <option value="">{isRTL ? "كل المواد" : "All Subjects"}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{isRTL ? s.nameAr || s.name : s.name}</option>
          ))}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className={`px-4 py-2.5 rounded-xl border ${
            isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
          }`}
        >
          <option value="">{isRTL ? "كل المستويات" : "All Levels"}</option>
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>{isRTL ? d.labelAr : d.labelEn}</option>
          ))}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}
        >
          <h3 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
            {editingId ? (isRTL ? "تعديل المهمة" : "Edit Task") : (isRTL ? "إنشاء مهمة جديدة" : "Create New Task")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {isRTL ? "المادة *" : "Subject *"}
              </label>
              <select
                value={form.subjectId}
                onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
                required
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="">{isRTL ? "اختر المادة" : "Select Subject"}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{isRTL ? s.nameAr || s.name : s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {isRTL ? "العنوان *" : "Title *"}
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {isRTL ? "السؤال *" : "Question *"}
            </label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
              required
              rows={3}
              className={`w-full px-4 py-2.5 rounded-xl border ${
                isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>

          {/* Answers */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {isRTL ? "الإجابات (حدد الإجابة الصحيحة) *" : "Answers (select the correct one) *"}
            </label>
            <div className="space-y-2">
              {form.answers.map((ans, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateAnswer(i, "isCorrect", true)}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      ans.isCorrect
                        ? "bg-green-500 border-green-500 text-white"
                        : isDark
                        ? "border-gray-600 text-gray-500 hover:border-green-400"
                        : "border-gray-300 text-gray-400 hover:border-green-400"
                    }`}
                  >
                    {ans.isCorrect ? "✓" : String.fromCharCode(65 + i)}
                  </button>
                  <input
                    type="text"
                    value={ans.text}
                    onChange={(e) => updateAnswer(i, "text", e.target.value)}
                    placeholder={`${isRTL ? "الإجابة" : "Answer"} ${i + 1}`}
                    className={`flex-1 px-4 py-2 rounded-xl border ${
                      isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {isRTL ? "النقاط" : "Points"}
              </label>
              <input
                type="number"
                min={1}
                value={form.pointsReward}
                onChange={(e) => setForm((p) => ({ ...p, pointsReward: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {isRTL ? "الصعوبة" : "Difficulty"}
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>{isRTL ? d.labelAr : d.labelEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {isRTL ? "تكلفة النقاط" : "Point Cost"}
              </label>
              <input
                type="number"
                min={0}
                value={form.pointsCost}
                onChange={(e) => setForm((p) => ({ ...p, pointsCost: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {isRTL ? "الحالة" : "Status"}
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  className={`flex items-center gap-1 text-sm ${form.isActive ? "text-green-600" : "text-red-500"}`}
                >
                  {form.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {form.isActive ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطّل" : "Inactive")}
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isPublic: !p.isPublic }))}
                  className={`flex items-center gap-1 text-sm ${form.isPublic ? "text-blue-600" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {form.isPublic ? "🌐" : "🔒"}
                  {form.isPublic ? (isRTL ? "عام" : "Public") : (isRTL ? "خاص" : "Private")}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
                isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <X size={16} />
              {isRTL ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {editingId ? (isRTL ? "تحديث" : "Update") : (isRTL ? "إنشاء" : "Create")}
            </button>
          </div>
        </form>
      )}

      {/* Tasks Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>{isRTL ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-16 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <ClipboardList className={`h-12 w-12 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
          <p className={`text-lg font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {searchTerm || filterSubject || filterDifficulty
              ? (isRTL ? "لا توجد نتائج" : "No results found")
              : (isRTL ? "لا توجد مهام جاهزة بعد" : "No template tasks yet")}
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={isDark ? "bg-gray-800" : "bg-gray-50"}>
                <tr>
                  <th className={`px-4 py-3 text-start font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {isRTL ? "العنوان" : "Title"}
                  </th>
                  <th className={`px-4 py-3 text-start font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {isRTL ? "المادة" : "Subject"}
                  </th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {isRTL ? "الصعوبة" : "Difficulty"}
                  </th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {isRTL ? "النقاط" : "Points"}
                  </th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {isRTL ? "الاستخدام" : "Usage"}
                  </th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {isRTL ? "الحالة" : "Status"}
                  </th>
                  <th className={`px-4 py-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {isRTL ? "إجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                {filtered.map((task) => {
                  const diff = getDifficultyBadge(task.difficulty);
                  return (
                    <tr key={task.id} className={isDark ? "bg-gray-800/50 hover:bg-gray-700/50" : "bg-white hover:bg-gray-50"}>
                      <td className={`px-4 py-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                        <div className="font-medium">{task.title}</div>
                        <div className={`text-xs mt-0.5 line-clamp-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {task.question}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {getSubjectName(task.subjectId)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${diff.color}`}>
                          {isRTL ? diff.labelAr : diff.labelEn}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-center font-medium ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
                        {task.pointsReward} ⭐
                      </td>
                      <td className={`px-4 py-3 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {task.usageCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: task.id, isActive: !task.isActive })}
                          className="inline-flex"
                        >
                          {task.isActive ? (
                            <span className="text-green-500"><ToggleRight size={22} /></span>
                          ) : (
                            <span className="text-gray-400"><ToggleLeft size={22} /></span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(task)}
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-gray-600 text-blue-400" : "hover:bg-gray-100 text-blue-600"}`}
                            title={isRTL ? "تعديل" : "Edit"}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(isRTL ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
                                deleteMutation.mutate(task.id);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-gray-600 text-red-400" : "hover:bg-gray-100 text-red-600"}`}
                            title={isRTL ? "حذف" : "Delete"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
