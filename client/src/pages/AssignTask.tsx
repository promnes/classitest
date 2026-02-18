import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { LanguageSelector } from "@/components/LanguageSelector";

export const AssignTask = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const token = localStorage.getItem("token");
  const isRTL = i18n.language === 'ar';

  const [selectedChild, setSelectedChild] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [createCustom, setCreateCustom] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customPoints, setCustomPoints] = useState(10);
  const [customAnswers, setCustomAnswers] = useState([
    { id: "1", text: "", isCorrect: true },
    { id: "2", text: "", isCorrect: false },
    { id: "3", text: "", isCorrect: false },
    { id: "4", text: "", isCorrect: false },
  ]);

  const { data: childrenRaw } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const { data: subjectsRaw } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!token,
  });

  const { data: templatesRaw } = useQuery({
    queryKey: [`/api/subjects/${selectedSubject}/templates`],
    enabled: !!selectedSubject && !!token,
  });

  const { data: walletRaw } = useQuery<any>({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });

  const children = Array.isArray(childrenRaw) ? childrenRaw : [];
  const subjects = Array.isArray(subjectsRaw) ? subjectsRaw : [];
  const templates = Array.isArray(templatesRaw) ? templatesRaw : [];
  const walletBalance = Number(walletRaw?.data?.balance ?? walletRaw?.balance ?? 0);

  const assignMutation = useMutation({
    mutationFn: async () => {
      let taskData;
      
      if (createCustom) {
        taskData = {
          childId: selectedChild,
          question: customQuestion,
          pointsReward: customPoints,
          answers: customAnswers.filter(a => a.text.trim()),
          subjectId: selectedSubject || undefined,
        };
      } else {
        const template = templates.find((t: any) => t.id === selectedTemplate);
        if (!template) throw new Error("Template not found");
        taskData = {
          childId: selectedChild,
          question: template.question,
          pointsReward: template.pointsReward,
          answers: template.answers,
          templateId: template.id,
          subjectId: selectedSubject || undefined,
        };
      }

      if (createCustom) {
        return apiRequest("POST", "/api/parent/create-task", taskData);
      } else {
        return apiRequest("POST", "/api/parent/create-task-from-template", {
          childId: selectedChild,
          templateId: selectedTemplate,
          pointsReward: taskData.pointsReward,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      navigate("/parent-dashboard");
    },
  });

  const selectedTemplateData = templates.find((t: any) => t.id === selectedTemplate);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-blue-50 to-purple-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
            📝 {t("assignTask.title")}
          </h1>
          <div className="flex gap-2">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold"
              data-testid="button-theme-toggle"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => navigate("/parent-dashboard")}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold"
              data-testid="button-back"
            >
              ← {t("assignTask.back")}
            </button>
          </div>
        </div>

        <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-lg p-8`}>
          {/* Wallet Balance */}
          <div className={`flex items-center gap-2 mb-6 p-3 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
            <span className="text-xl">💰</span>
            <span className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>رصيدك: {walletBalance}</span>
          </div>

          <div className="space-y-6">
            <div>
              <label className={`block text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>
                👶 {t("assignTask.selectChild")}
              </label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 text-lg ${
                  isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                }`}
                data-testid="select-child"
              >
                <option value="">{t("assignTask.selectChildPlaceholder")}</option>
                {children.map((child: any) => (
                  <option key={child.id} value={child.id}>
                    {child.name} - ⭐ {child.points} {t("assignTask.childPoints")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>
                📚 {t("assignTask.selectSubject")}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {subjects.map((subject: any) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(subject.id);
                      setSelectedTemplate("");
                    }}
                    className={`p-4 rounded-xl border-2 font-bold transition-all ${
                      selectedSubject === subject.id
                        ? "border-blue-500 bg-blue-500 text-white"
                        : isDark
                        ? "border-gray-600 bg-gray-700 text-white hover:border-blue-400"
                        : "border-gray-300 bg-white hover:border-blue-400"
                    }`}
                    style={{ borderColor: selectedSubject === subject.id ? subject.color : undefined }}
                    data-testid={`button-subject-${subject.id}`}
                  >
                    <span className="text-2xl block mb-1">{subject.emoji}</span>
                    {subject.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedSubject && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setCreateCustom(false)}
                    className={`flex-1 p-4 rounded-xl border-2 font-bold ${
                      !createCustom
                        ? "border-green-500 bg-green-500 text-white"
                        : isDark
                        ? "border-gray-600 bg-gray-700 text-white"
                        : "border-gray-300"
                    }`}
                    data-testid="button-use-template"
                  >
                    📋 {t("assignTask.useTemplate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateCustom(true)}
                    className={`flex-1 p-4 rounded-xl border-2 font-bold ${
                      createCustom
                        ? "border-purple-500 bg-purple-500 text-white"
                        : isDark
                        ? "border-gray-600 bg-gray-700 text-white"
                        : "border-gray-300"
                    }`}
                    data-testid="button-create-custom"
                  >
                    ✏️ {t("assignTask.createCustom")}
                  </button>
                </div>

                {!createCustom && (
                  <div>
                    <label className={`block text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-800"}`}>
                      📝 {t("assignTask.selectTask")}
                    </label>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {templates.length === 0 && (
                        <p className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {t("assignTask.noTemplates")}
                        </p>
                      )}
                      {templates.map((template: any) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`w-full p-4 rounded-xl border-2 text-right transition-all ${
                            selectedTemplate === template.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                              : isDark
                              ? "border-gray-600 bg-gray-700 hover:border-blue-400"
                              : "border-gray-300 bg-white hover:border-blue-400"
                          }`}
                          data-testid={`button-template-${template.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                              {template.title}
                            </span>
                            <span className="text-yellow-500 font-bold">⭐ {template.pointsReward}</span>
                          </div>
                          <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {template.question.substring(0, 100)}...
                          </p>
                          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                            template.difficulty === "easy" ? "bg-green-100 text-green-800" :
                            template.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {template.difficulty === "easy" ? t("assignTask.easy") :
                             template.difficulty === "medium" ? t("assignTask.medium") : t("assignTask.hard")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {createCustom && (
                  <div className="space-y-4">
                    <div>
                      <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("assignTask.question")}
                      </label>
                      <textarea
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder={t("assignTask.questionPlaceholder")}
                        className={`w-full px-4 py-3 rounded-xl border-2 min-h-24 ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                        }`}
                        data-testid="input-custom-question"
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("assignTask.points")}
                      </label>
                      <input
                        type="number"
                        value={customPoints}
                        onChange={(e) => setCustomPoints(parseInt(e.target.value))}
                        min="1"
                        className={`w-full px-4 py-3 rounded-xl border-2 ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                        }`}
                        data-testid="input-custom-points"
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("assignTask.answersHint")}
                      </label>
                      <div className="space-y-2">
                        {customAnswers.map((answer, index) => (
                          <div key={answer.id} className="flex gap-2">
                            <input
                              type="text"
                              value={answer.text}
                              onChange={(e) => setCustomAnswers(
                                customAnswers.map(a => a.id === answer.id ? { ...a, text: e.target.value } : a)
                              )}
                              placeholder={`${t("assignTask.answerPlaceholder")} ${index + 1}`}
                              className={`flex-1 px-4 py-3 rounded-xl border-2 ${
                                isDark ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                              }`}
                              data-testid={`input-answer-${index}`}
                            />
                            <button
                              type="button"
                              onClick={() => setCustomAnswers(
                                customAnswers.map(a => ({ ...a, isCorrect: a.id === answer.id }))
                              )}
                              className={`px-4 py-3 rounded-xl font-bold ${
                                answer.isCorrect
                                  ? "bg-green-500 text-white"
                                  : isDark ? "bg-gray-600 text-gray-300" : "bg-gray-200"
                              }`}
                              data-testid={`button-correct-${index}`}
                            >
                              ✓
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTemplateData && !createCustom && (
              <div className={`p-4 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                <h3 className={`font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("assignTask.taskPreview")}
                </h3>
                <p className={isDark ? "text-gray-300" : "text-gray-700"}>{selectedTemplateData.question}</p>
                <div className="mt-3 space-y-1">
                  {selectedTemplateData.answers.map((ans: any, i: number) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded ${
                        ans.isCorrect
                          ? "bg-green-100 text-green-800"
                          : isDark ? "bg-gray-600 text-gray-300" : "bg-gray-100"
                      }`}
                    >
                      {ans.isCorrect && "✓ "}{ans.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(() => {
              const taskReward = createCustom ? customPoints : (selectedTemplateData?.pointsReward || 0);
              const insufficientBalance = taskReward > 0 && walletBalance < taskReward;
              return (
                <>
                  {insufficientBalance && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                      رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: {walletBalance}، المطلوب: {taskReward}
                    </div>
                  )}
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={
                      !selectedChild ||
                      (!createCustom && !selectedTemplate) ||
                      (createCustom && (!customQuestion.trim() || customAnswers.filter(a => a.text.trim()).length < 2)) ||
                      assignMutation.isPending ||
                      insufficientBalance
                    }
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-emerald-700 transition-all"
                    data-testid="button-assign-task"
                  >
                    {assignMutation.isPending ? t("assignTask.sending") : `📤 ${t("assignTask.sendTask")}`}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
