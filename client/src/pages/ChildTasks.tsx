import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ChildNotificationBell } from "@/components/ChildNotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Clock, ArrowLeft, BookOpen, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Task {
  id: string;
  question: string;
  answers: Array<{ id: string; text: string; isCorrect: boolean; imageUrl?: string }>;
  pointsReward: number;
  status: string;
  createdAt: string;
  subject?: { name: string; emoji: string; color: string };
}

export const ChildTasks = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const token = localStorage.getItem("childToken");
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<{ correct: boolean; points: number } | null>(null);

  const { data: tasksRaw, isLoading } = useQuery({
    queryKey: ["/api/child/tasks"],
    enabled: !!token,
    refetchInterval: token ? 15000 : false,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["/api/child/info"],
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const tasks: Task[] = Array.isArray(tasksRaw) ? tasksRaw : [];
  const pendingTasks = tasks.filter(t => t.status === "pending");
  const completedTasks = tasks.filter(t => t.status === "completed");

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ taskId, selectedAnswerId }: { taskId: string; selectedAnswerId: string }) => {
      const res = await fetch("/api/child/submit-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, selectedAnswerId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Failed to submit" }));
        throw new Error(error.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const payload = (data as any)?.data ?? data;
      setShowResult({ correct: payload.isCorrect, points: payload.pointsEarned || 0 });
      queryClient.invalidateQueries({ queryKey: ["/api/child/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/child/info"] });
      setTimeout(() => {
        setShowResult(null);
        setSelectedTask(null);
        setSelectedAnswer(null);
      }, 2500);
    },
    onError: (error: any) => {
      console.error("Task submission error:", error);
      setShowResult(null);
      setSelectedTask(null);
      setSelectedAnswer(null);
    },
  });

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-blue-100 to-purple-100"}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-blue-100 to-purple-100"}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.length > 1 ? window.history.back() : navigate("/child-games")}
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
            {t("child.back")}
          </Button>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {(childInfo as any)?.points || 0} {t("child.point")}
            </span>
            <LanguageSelector />
            <ChildNotificationBell />
          </div>
        </div>

        <h1 className={`text-3xl font-bold text-center mb-8 ${isDark ? "text-white" : "text-gray-800"}`}>
          <BookOpen className="inline-block h-8 w-8 text-blue-500" />
          {t("child.myTasks")}
        </h1>

        {pendingTasks.length === 0 && completedTasks.length === 0 ? (
          <Card className={`p-8 text-center ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <Award className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className={`text-xl ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {t("child.noTasksNow")}
            </p>
            <p className={`mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {t("child.whenParentSendTask")}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingTasks.length > 0 && (
              <div>
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  <Clock className="h-5 w-5 text-orange-500" />
                  {t("child.pendingTasks")} ({pendingTasks.length})
                </h2>
                <div className="grid gap-4">
                  {pendingTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card
                        className={`p-4 cursor-pointer hover-elevate ${isDark ? "bg-gray-800 border-gray-700" : "bg-white"}`}
                        onClick={() => setSelectedTask(task)}
                        data-testid={`card-task-${task.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {task.subject && (
                                <span className="text-lg">{task.subject.emoji}</span>
                              )}
                              <span className={`font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                {task.subject?.name || t("childTasks.task")}
                              </span>
                            </div>
                            <p className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                              {task.question}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900 px-3 py-1 rounded-full">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                              +{task.pointsReward}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {t("childTasks.completedTasks")} ({completedTasks.length})
                </h2>
                <div className="grid gap-3">
                  {completedTasks.map((task) => (
                    <Card
                      key={task.id}
                      className={`p-3 opacity-70 ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white/50"}`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className={isDark ? "text-gray-300" : "text-gray-600"}>
                          {task.question}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {selectedTask && !showResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedTask(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? "bg-gray-800" : "bg-white"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {selectedTask.question}
                </h3>
                <div className="space-y-3">
                  {selectedTask.answers.map((answer, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAnswer(index)}
                      className={`w-full p-4 rounded-xl text-right transition-all ${
                        selectedAnswer === index
                          ? "bg-blue-500 text-white ring-4 ring-blue-300"
                          : isDark
                          ? "bg-gray-700 text-white hover:bg-gray-600"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                      data-testid={`button-answer-${index}`}
                    >
                      {answer.imageUrl && (
                        <img
                          src={answer.imageUrl}
                          alt=""
                          className="w-full h-32 object-contain mb-2 rounded"
                        />
                      )}
                      {answer.text}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={() => {
                      if (selectedAnswer !== null && selectedTask) {
                        const answerId = selectedTask.answers[selectedAnswer]?.id;
                        if (answerId) {
                          submitAnswerMutation.mutate({
                            taskId: selectedTask.id,
                            selectedAnswerId: answerId,
                          });
                        }
                      }
                    }}
                    disabled={selectedAnswer === null || submitAnswerMutation.isPending}
                    className="flex-1"
                    data-testid="button-submit-answer"
                  >
                    {submitAnswerMutation.isPending ? t("childTasks.sending") : t("childTasks.submitAnswer")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTask(null);
                      setSelectedAnswer(null);
                    }}
                    data-testid="button-cancel"
                  >
                    {t("childTasks.cancel")}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.5 }}
                className={`rounded-3xl p-8 text-center ${
                  showResult.correct ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {showResult.correct ? (
                  <>
                    <CheckCircle className="h-20 w-20 text-white mx-auto mb-4" />
                    <h3 className="text-3xl font-bold text-white mb-2">{t("childTasks.wellDone")}</h3>
                    <p className="text-white text-xl">+{showResult.points} {t("childTasks.point")}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="h-20 w-20 text-white mx-auto mb-4" />
                    <h3 className="text-3xl font-bold text-white mb-2">{t("childTasks.tryAgain")}</h3>
                    <p className="text-white text-xl">{t("childTasks.incorrectAnswer")}</p>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChildTasks;
