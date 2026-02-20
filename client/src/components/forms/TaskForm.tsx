import React, { useEffect, useMemo, useState, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ImagePlus, Plus, Trash2, Upload, Smile } from "lucide-react";
import type { Media } from "@shared/media";

// Lazy-load the entire symbol library so Three.js bundle is never fetched until needed
const SymbolLibrary3D = lazy(() => import("@/components/symbol-library/SymbolLibrary3D"));

export type TaskFormValue = {
  title: string;
  question: string;
  answers: { id: string; text: string; isCorrect: boolean; imageUrl?: string; media?: Media }[];
  pointsReward: number;
  difficulty?: string;
  subjectId?: string;
  isPublic?: boolean;
  pointsCost?: number;
  taskMedia?: Media | null;
};

type TaskFormProps = {
  mode: "admin" | "parent";
  token?: string; // optional override (admin passes token prop). Parent falls back to localStorage token
  initialValue: TaskFormValue;
  onSubmit: (value: TaskFormValue) => Promise<void> | void;
  submitting?: boolean;
  subjects?: { id: string; name: string; emoji?: string }[];
  showSubject?: boolean;
  allowDifficulty?: boolean;
  allowPublic?: boolean;
  allowTaskMedia?: boolean;
  submitLabel?: string;
};

const DEFAULT_ANSWERS: TaskFormValue["answers"] = [
  { id: "1", text: "", isCorrect: true },
  { id: "2", text: "", isCorrect: false },
  { id: "3", text: "", isCorrect: false },
];

function useAuthHeaders(mode: "admin" | "parent", token?: string) {
  return useMemo(() => {
    const authToken = token || (mode === "parent" ? localStorage.getItem("token") || undefined : undefined);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return headers;
  }, [mode, token]);
}

async function uploadMedia({
  file,
  mode,
  headers,
  purpose,
}: {
  file: File;
  mode: "admin" | "parent";
  headers: Record<string, string>;
  purpose: string;
}): Promise<Media> {
  const presignRes = await fetch(`/api/${mode}/uploads/presign`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
      purpose,
      originalName: file.name,
    }),
  });
  const presignJson = await presignRes.json();
  if (!presignRes.ok || presignJson?.success === false) {
    throw new Error(presignJson?.message || "Failed to presign upload");
  }

  const presignData = presignJson.data || presignJson;

  const putHeaders: Record<string, string> = {};
  if (file.type) putHeaders["Content-Type"] = file.type;

  const putRes = await fetch(presignData.uploadURL, {
    method: "PUT",
    headers: putHeaders,
    body: file,
  });
  if (!putRes.ok) {
    throw new Error("Failed to upload object to storage");
  }

  const finalizeRes = await fetch(`/api/${mode}/uploads/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      objectPath: presignData.objectPath || presignData.uploadURL,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      originalName: file.name,
      purpose,
    }),
  });
  const finalizeJson = await finalizeRes.json();
  if (!finalizeRes.ok || finalizeJson?.success === false) {
    throw new Error(finalizeJson?.message || "Failed to finalize upload");
  }
  return finalizeJson.data || finalizeJson;
}

export function TaskForm({
  mode,
  token,
  initialValue,
  onSubmit,
  submitting,
  subjects,
  showSubject,
  allowDifficulty = true,
  allowPublic = false,
  allowTaskMedia = true,
  submitLabel,
}: TaskFormProps) {
  const { t } = useTranslation();
  const effectiveSubmitLabel = submitLabel || t("taskForm.saveTask");
  const [form, setForm] = useState<TaskFormValue>({ ...initialValue });
  const [uploadingAnswer, setUploadingAnswer] = useState<string | null>(null);
  const [uploadingTaskMedia, setUploadingTaskMedia] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);
  const [symbolTarget, setSymbolTarget] = useState<"question" | "title" | `answer-${number}`>("question");
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const headers = useAuthHeaders(mode, token);

  useEffect(() => {
    setForm({ ...initialValue });
  }, [initialValue]);

  const answers = form.answers?.length ? form.answers : DEFAULT_ANSWERS;

  const setAnswer = (idx: number, updater: (a: TaskFormValue["answers"][number]) => TaskFormValue["answers"][number]) => {
    const updated = [...answers];
    updated[idx] = updater({ ...updated[idx] });
    setForm({ ...form, answers: updated });
  };

  const handleToggleCorrect = (idx: number) => {
    const updated = answers.map((a, i) => ({ ...a, isCorrect: i === idx }));
    setForm({ ...form, answers: updated });
  };

  const handleAddAnswer = () => {
    const nextId = String(answers.length + 1);
    setForm({ ...form, answers: [...answers, { id: nextId, text: "", isCorrect: false }] });
  };

  const handleRemoveAnswer = (idx: number) => {
    if (answers.length <= 2) return;
    const updated = answers.filter((_, i) => i !== idx);
    // Ensure one correct remains; default to first item
    if (!updated.some((a) => a.isCorrect)) {
      updated[0].isCorrect = true;
    }
    setForm({ ...form, answers: updated });
  };

  const handleAnswerUpload = async (file: File, idx: number) => {
    try {
      setUploadingAnswer(answers[idx].id);
      const media = await uploadMedia({ file, mode, headers, purpose: "answer_media" });
      setAnswer(idx, (a) => ({ ...a, imageUrl: media.url, media }));
    } finally {
      setUploadingAnswer(null);
    }
  };

  const handleTaskMediaUpload = async (file: File) => {
    try {
      setUploadingTaskMedia(true);
      const media = await uploadMedia({ file, mode, headers, purpose: "task_media" });
      setForm({ ...form, taskMedia: media });
    } finally {
      setUploadingTaskMedia(false);
    }
  };

  const openSymbolPicker = (target: "question" | "title" | `answer-${number}`) => {
    setSymbolTarget(target);
    setSymbolPickerOpen(true);
  };

  const handleSymbolSelect = (symbol: { char: string }) => {
    if (symbolTarget === "question") {
      const el = questionRef.current;
      if (el) {
        const start = el.selectionStart ?? form.question.length;
        const end = el.selectionEnd ?? start;
        const newText = form.question.slice(0, start) + symbol.char + form.question.slice(end);
        setForm({ ...form, question: newText });
        // Restore cursor position after render
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + symbol.char.length; el.focus(); });
      } else {
        setForm({ ...form, question: form.question + symbol.char });
      }
    } else if (symbolTarget === "title") {
      const el = titleRef.current;
      if (el) {
        const start = el.selectionStart ?? form.title.length;
        const end = el.selectionEnd ?? start;
        const newText = form.title.slice(0, start) + symbol.char + form.title.slice(end);
        setForm({ ...form, title: newText });
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + symbol.char.length; el.focus(); });
      } else {
        setForm({ ...form, title: form.title + symbol.char });
      }
    } else if (symbolTarget.startsWith("answer-")) {
      const idx = parseInt(symbolTarget.split("-")[1]);
      if (!isNaN(idx) && idx < answers.length) {
        setAnswer(idx, a => ({ ...a, text: a.text + symbol.char }));
      }
    }
    setSymbolPickerOpen(false);
  };

  const handleSubmit = async () => {
    try {
      setSubmitError(null);
      await onSubmit(form);
    } catch (error) {
      console.error("Task submission error:", error);
      setSubmitError("فشل إنشاء المهمة. حاول مرة أخرى.");
    }
  };

  return (
    <div className="space-y-5">
      {showSubject && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("taskForm.subject")}</Label>
            <Select
              value={form.subjectId || ""}
              onValueChange={(v) => setForm({ ...form, subjectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المادة" />
              </SelectTrigger>
              <SelectContent>
                {(subjects || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.emoji ? `${s.emoji} ` : ""}{s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("taskForm.points")}</Label>
              <Input
                type="number"
                value={form.pointsReward}
                onChange={(e) => setForm({ ...form, pointsReward: parseInt(e.target.value) || 0 })}
              />
            </div>
            {allowDifficulty && (
              <div>
                <Label>الصعوبة</Label>
                <Select
                  value={form.difficulty || "medium"}
                  onValueChange={(v) => setForm({ ...form, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="الصعوبة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">سهل</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="hard">صعب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {!showSubject && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("taskForm.points")}</Label>
            <Input
              type="number"
              value={form.pointsReward}
              onChange={(e) => setForm({ ...form, pointsReward: parseInt(e.target.value) || 0 })}
            />
          </div>
          {allowDifficulty && (
            <div>
              <Label>الصعوبة</Label>
              <Select
                value={form.difficulty || "medium"}
                onValueChange={(v) => setForm({ ...form, difficulty: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الصعوبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">سهل</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="hard">صعب</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>عنوان المهمة</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => openSymbolPicker("title")}
          >
            <Smile className="h-3.5 w-3.5" />
            رمز
          </Button>
        </div>
        <Input
          ref={titleRef}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="اكتب العنوان"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>السؤال</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => openSymbolPicker("question")}
          >
            <Smile className="h-3.5 w-3.5" />
            إدراج رمز
          </Button>
        </div>
        <Textarea
          ref={questionRef}
          value={form.question}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          placeholder="اكتب السؤال هنا..."
        />
      </div>

      {allowTaskMedia && (
        <div>
          <Label>وسائط السؤال (اختياري)</Label>
          <div className="flex items-center gap-3 flex-wrap">
            <Button asChild variant="outline" disabled={uploadingTaskMedia}>
              <label className="cursor-pointer flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {uploadingTaskMedia ? "جاري الرفع..." : "رفع وسائط"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTaskMediaUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
            {form.taskMedia?.url && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <span>تم الرفع</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setForm({ ...form, taskMedia: null })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>الإجابات (الأولى صحيحة افتراضيًا)</Label>
          <Button size="sm" variant="outline" onClick={handleAddAnswer}>
            <Plus className="h-4 w-4 ml-1" />
            إضافة إجابة
          </Button>
        </div>
        <div className="space-y-3">
          {answers.map((answer, idx) => (
            <Card key={answer.id} className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant={answer.isCorrect ? "default" : "outline"}
                  onClick={() => handleToggleCorrect(idx)}
                  className="shrink-0"
                >
                  {answer.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </Button>
                <Input
                  value={answer.text}
                  onChange={(e) => setAnswer(idx, (a) => ({ ...a, text: e.target.value }))}
                  placeholder={`الإجابة ${idx + 1}`}
                  className={answer.isCorrect ? "border-green-500" : ""}
                />
                <Button
                  size="icon"
                  variant="destructive"
                  disabled={answers.length <= 2}
                  onClick={() => handleRemoveAnswer(idx)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button asChild variant="outline" size="sm" disabled={uploadingAnswer === answer.id}>
                  <label className="cursor-pointer flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    {uploadingAnswer === answer.id ? "جاري الرفع..." : "إضافة صورة/فيديو"}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAnswerUpload(file, idx);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => openSymbolPicker(`answer-${idx}`)}
                >
                  <Smile className="h-4 w-4" />
                  رمز
                </Button>
                {answer.imageUrl && (
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <span>تم الرفع</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setAnswer(idx, (a) => ({ ...a, imageUrl: "", media: undefined }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {allowPublic && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div>
            <Label>المشاركة العامة</Label>
            <p className="text-xs text-muted-foreground">السماح بظهور المهمة في المتجر العام</p>
          </div>
          <Switch
            checked={!!form.isPublic}
            onCheckedChange={(v) => setForm({ ...form, isPublic: v })}
          />
        </div>
      )}

      {allowPublic && form.isPublic && (
        <div>
          <Label>تكلفة الاستخدام (نقاط)</Label>
          <Input
            type="number"
            value={form.pointsCost || 0}
            onChange={(e) => setForm({ ...form, pointsCost: parseInt(e.target.value) || 0 })}
          />
        </div>
      )}

      {submitError && (
        <p className="text-sm text-red-600" role="alert">
          {submitError}
        </p>
      )}
      <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : effectiveSubmitLabel}
      </Button>

      {symbolPickerOpen && (
        <Suspense fallback={null}>
          <SymbolLibrary3D
            open={symbolPickerOpen}
            onOpenChange={setSymbolPickerOpen}
            onSelect={handleSymbolSelect}
            insertTarget={symbolTarget}
          />
        </Suspense>
      )}
    </div>
  );
}
