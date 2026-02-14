import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, FileText, Save, Loader2, RefreshCw, Clock, Users, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LegalTabProps {
  token: string;
}

export const LegalTab = ({ token }: LegalTabProps): JSX.Element => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<"privacy" | "terms">("privacy");
  const [privacyContent, setPrivacyContent] = useState("");
  const [termsContent, setTermsContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch current legal content
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-legal"],
    queryFn: async () => {
      const res = await fetch("/api/admin/legal", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch legal pages");
      const json = await res.json();
      return json.data as {
        privacy: string;
        terms: string;
        privacyUpdatedAt: string;
        termsUpdatedAt: string;
      };
    },
    refetchOnWindowFocus: false,
  });

  // Set content when data loads
  React.useEffect(() => {
    if (data && !initialized) {
      setPrivacyContent(data.privacy || "");
      setTermsContent(data.terms || "");
      setInitialized(true);
    }
  }, [data, initialized]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (params: { type: "privacy" | "terms"; content: string }) => {
      const res = await fetch("/api/admin/legal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-legal"] });
      setInitialized(false);
      toast({
        title: "✅ تم الحفظ",
        description: result.message || "تم حفظ المحتوى وإشعار أولياء الأمور",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "❌ خطأ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const content = activeSection === "privacy" ? privacyContent : termsContent;
    if (!content.trim() || content.trim().length < 10) {
      toast({
        title: "⚠️ المحتوى قصير جداً",
        description: "يجب أن يكون المحتوى 10 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate({ type: activeSection, content });
  };

  const currentContent = activeSection === "privacy" ? privacyContent : termsContent;
  const setCurrentContent = activeSection === "privacy" ? setPrivacyContent : setTermsContent;
  const updatedAt = activeSection === "privacy" ? data?.privacyUpdatedAt : data?.termsUpdatedAt;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">الصفحات القانونية</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">تعديل سياسة الخصوصية وشروط الاستخدام</p>
          </div>
        </div>
        <button
          onClick={() => { setInitialized(false); refetch(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection("privacy")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
            activeSection === "privacy"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50"
              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          <Shield className="w-5 h-5" />
          🔒 سياسة الخصوصية
        </button>
        <button
          onClick={() => setActiveSection("terms")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
            activeSection === "terms"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50"
              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          <FileText className="w-5 h-5" />
          📋 شروط الاستخدام
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="mr-3 text-gray-500">جاري التحميل...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Info bar */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {updatedAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>آخر تعديل: {new Date(updatedAt).toLocaleString("ar-EG")}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{currentContent.length} حرف</span>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? "إخفاء المعاينة" : "معاينة"}
            </button>
          </div>

          {/* Alert */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-700 dark:text-amber-300">تنبيه مهم</p>
              <p className="text-amber-600 dark:text-amber-400 mt-1">
                عند الحفظ سيتم <strong>إشعار جميع أولياء الأمور</strong> تلقائياً بأن {activeSection === "privacy" ? "سياسة الخصوصية" : "شروط الاستخدام"} قد تم تحديثها.
              </p>
            </div>
          </div>

          {/* Editor */}
          <div className="relative">
            <label className="block text-sm font-semibold mb-2">
              {activeSection === "privacy" ? "محتوى سياسة الخصوصية" : "محتوى شروط الاستخدام"}
            </label>
            <textarea
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              rows={18}
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono text-sm leading-relaxed resize-y focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition"
              placeholder={`اكتب ${activeSection === "privacy" ? "سياسة الخصوصية" : "شروط الاستخدام"} هنا...\n\nيمكنك استخدام HTML للتنسيق:\n<h3>عنوان</h3>\n<p>فقرة</p>\n<ul><li>عنصر</li></ul>`}
              dir="auto"
            />
          </div>

          {/* Preview */}
          {showPreview && currentContent && (
            <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 pb-3 border-b dark:border-gray-700">
                <Eye className="w-4 h-4" />
                معاينة المحتوى كما سيظهر للمستخدم
              </div>
              <div
                className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentContent }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>سيتم إشعار جميع أولياء الأمور عند الحفظ</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all ${
                activeSection === "privacy"
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50"
              } ${saveMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saveMutation.isPending ? "جاري الحفظ..." : `حفظ ${activeSection === "privacy" ? "سياسة الخصوصية" : "شروط الاستخدام"} وإشعار الجميع`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
