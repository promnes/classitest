/**
 * @deprecated DEPRECATED: Remove after 2026-02-20
 * This component has been merged into ParentTasks.tsx
 * The /create-task route now redirects to /parent-tasks
 * Users can create and send tasks directly from the unified task management page
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, Copy, Check, Link2 } from "lucide-react";

export const CreateTask = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const token = localStorage.getItem("token");
  const [question, setQuestion] = useState("");
  const [pointsReward, setPointsReward] = useState(10);
  const [selectedChild, setSelectedChild] = useState("");
  const [showLinkCode, setShowLinkCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [answers, setAnswers] = useState([
    { id: "1", text: "", isCorrect: false },
    { id: "2", text: "", isCorrect: false },
    { id: "3", text: "", isCorrect: false },
    { id: "4", text: "", isCorrect: false },
  ]);

  const { data: childrenRaw } = useQuery({
    queryKey: ["/api/parent/children"],
    enabled: !!token,
  });

  const { data: parentInfo } = useQuery({
    queryKey: ["/api/parent/info"],
    enabled: !!token,
  });
  
  const children = Array.isArray(childrenRaw) ? childrenRaw : [];
  const parentData = parentInfo as any || {};

  const { data: walletRaw } = useQuery<any>({
    queryKey: ["/api/parent/wallet"],
    enabled: !!token,
  });
  const walletBalance = Number(walletRaw?.data?.balance ?? walletRaw?.balance ?? 0);
  const insufficientBalance = pointsReward > 0 && walletBalance < pointsReward;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/parent/create-task", {
        question,
        pointsReward,
        childId: selectedChild,
        answers: answers.filter((a) => a.text.trim()),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      navigate("/parent-dashboard");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-orange-600 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">{t("createNewTask")}</h1>
          <button
            onClick={() => navigate("/parent-dashboard")}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg"
          >
            {t("back")}
          </button>
        </div>

        {/* Linking Code Card */}
        {parentData?.uniqueCode && (
          <div className="bg-white/90 backdrop-blur rounded-xl p-4 shadow-lg mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">كود الربط الخاص بك</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-bold text-lg text-orange-600 tracking-widest">
                    {showLinkCode 
                      ? parentData.uniqueCode 
                      : "●".repeat(parentData.uniqueCode.length)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowLinkCode(!showLinkCode)}
                    className="p-1 hover:bg-gray-100 rounded"
                    data-testid="button-toggle-code-task"
                  >
                    {showLinkCode ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyCode(parentData.uniqueCode)}
                    className="p-1 hover:bg-gray-100 rounded"
                    data-testid="button-copy-code-task"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-500" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-6"
          >
            {/* Child Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t("selectChild")}
              </label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-400 text-gray-900 bg-white"
                required
              >
                <option value="">{t("selectChildPlaceholder")}</option>
                {children.map((child: any) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t("question")}
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("writeQuestion")}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-400 min-h-24 text-gray-900 bg-white"
                required
              />
            </div>

            {/* Points */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t("pointsReward")} <span className="text-xs font-normal text-gray-500">(رصيدك: {walletBalance})</span>
              </label>
              <input
                type="number"
                value={pointsReward}
                onChange={(e) => setPointsReward(parseInt(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-400 text-gray-900 bg-white"
                min="1"
              />
            </div>

            {/* Answers */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                {t("answers")}
              </label>
              <div className="space-y-3">
                {answers.map((answer) => (
                  <div key={answer.id} className="flex gap-2">
                    <input
                      type="text"
                      value={answer.text}
                      onChange={(e) =>
                        setAnswers(
                          answers.map((a) =>
                            a.id === answer.id
                              ? { ...a, text: e.target.value }
                              : a
                          )
                        )
                      }
                      placeholder={`${t("answer")} ${answer.id}`}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAnswers(
                          answers.map((a) => ({
                            ...a,
                            isCorrect: a.id === answer.id,
                          }))
                        )
                      }
                      className={`px-4 py-3 rounded-lg font-bold ${
                        answer.isCorrect
                          ? "bg-green-500 text-white"
                          : "bg-gray-300 text-gray-700"
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {insufficientBalance && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: {walletBalance}، المطلوب: {pointsReward}
              </div>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending || !selectedChild || !question || insufficientBalance}
              className="w-full px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {createMutation.isPending ? t("creatingTask") : t("createTask")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
