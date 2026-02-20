import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const Subjects = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const { toast } = useToast();
  const [selectedChild, setSelectedChild] = useState("");

  const { data: subjectsRaw } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!token,
  });

  const { data: templatesRaw } = useQuery({
    queryKey: [`/api/subjects/${selectedSubject?.id}/templates`],
    enabled: !!selectedSubject && !!token,
  });

  const { data: childrenRaw } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const subjects = Array.isArray(subjectsRaw) ? subjectsRaw : [];
  const templates = Array.isArray(templatesRaw) ? templatesRaw : [];
  const children = Array.isArray(childrenRaw) ? childrenRaw : [];

  const { data: walletRaw } = useQuery<any>({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const walletBalance = Number(walletRaw?.data?.balance ?? walletRaw?.balance ?? 0);

  const sendTaskMutation = useMutation({
    mutationFn: async ({ templateId, childId }: any) => {
      return apiRequest("POST", "/api/parent/create-task-from-template", { templateId, childId });
    },
    onSuccess: () => {
      toast({ title: t("subjects.taskSent") });
      setSelectedTemplate(null);
      setSelectedChild("");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
    },
  });

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("subjects.title")}
            </h1>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>
              {t("subjects.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <LanguageSelector />
            <ParentNotificationBell />
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg"
            >
              {t("subjects.back")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Subjects List */}
          <div className={`lg:col-span-1 ${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-6 shadow`}>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("subjects.subjectsLabel")}
            </h2>
            <div className="space-y-2">
              {subjects.map((subject: any) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all ${
                    selectedSubject?.id === subject.id
                      ? "bg-blue-500 text-white"
                      : isDark
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {subject.emoji} {subject.name}
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className={`lg:col-span-3 ${isDark ? "bg-gray-800" : "bg-white"} rounded-lg p-6 shadow`}>
            {selectedSubject ? (
              <div>
                <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {selectedSubject.emoji} {selectedSubject.name} - {t("subjects.readyTasks")}
                </h2>

                {templates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template: any) => (
                      <div
                        key={template.id}
                        className={`${isDark ? "bg-gray-700" : "bg-gray-50"} rounded-lg p-4 border-2 ${
                          isDark ? "border-gray-600" : "border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                            {template.title}
                          </h3>
                          <span className={`text-sm px-2 py-1 rounded ${
                            template.difficulty === "easy"
                              ? "bg-green-500"
                              : template.difficulty === "medium"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          } text-white`}>
                            {template.difficulty}
                          </span>
                        </div>
                        <p className={`text-sm mb-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {template.question.substring(0, 100)}...
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-yellow-500">⭐ {template.pointsReward}</span>
                          <button
                            onClick={() => setSelectedTemplate(template)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold text-sm"
                          >
                            {t("subjects.send")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                    {t("subjects.noReadyTasksInSubject")}
                  </p>
                )}
              </div>
            ) : (
              <p className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t("subjects.selectSubjectPrompt")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Send Task Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">{t("subjects.sendTask")}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{selectedTemplate.title}</p>

            {/* Select Child */}
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">{t("subjects.chooseChild")}</label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              >
                <option value="">{t("subjects.selectOption")}</option>
                {children.map((child: any) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-blue-50 text-sm">
              {t("subjects.currentBalance", { balance: walletBalance })}
            </div>

            {selectedTemplate.pointsReward > walletBalance && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                {t("subjects.insufficientBalance", { required: selectedTemplate.pointsReward })}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => sendTaskMutation.mutate({ templateId: selectedTemplate.id, childId: selectedChild })}
                disabled={!selectedChild || sendTaskMutation.isPending || selectedTemplate.pointsReward > walletBalance}
                className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50"
              >
                {sendTaskMutation.isPending ? t("subjects.sending") : t("subjects.send")}
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 px-4 py-3 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-lg"
              >
                {t("subjects.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
