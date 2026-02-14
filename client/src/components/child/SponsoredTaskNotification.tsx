import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TaskNotification {
  id: string;
  title: string;
  description?: string;
  type: "task" | "question" | "quiz";
  question?: string;
  answers?: { id: string; text: string; isCorrect?: boolean; emoji?: string; imageUrl?: string }[];
  points: number;
  expiresAt?: Date;
}

interface SponsoredTaskNotificationProps {
  notification: TaskNotification;
  onComplete: (notificationId: string, answerId?: string) => void;
  onDismiss: (notificationId: string) => void;
}

const CANCEL_BUTTON_POSITIONS = [
  "top-2 right-2",
  "top-2 left-2", 
  "bottom-2 right-2",
  "bottom-2 left-2",
  "top-1/2 right-2 -translate-y-1/2",
  "top-1/2 left-2 -translate-y-1/2",
];

export function SponsoredTaskNotification({
  notification,
  onComplete,
  onDismiss,
}: SponsoredTaskNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [inputAnswer, setInputAnswer] = useState("");

  const cancelButtonPosition = CANCEL_BUTTON_POSITIONS[dismissCount % CANCEL_BUTTON_POSITIONS.length];

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setDismissCount((prev) => prev + 1);
    onDismiss(notification.id);
    
    setTimeout(() => {
      setIsVisible(true);
      setShowError(false);
      setSelectedAnswer(null);
    }, 20000);
  }, [notification.id, onDismiss]);

  const handleSubmitAnswer = useCallback(() => {
    if (!selectedAnswer && !inputAnswer) return;

    const answerId = selectedAnswer || inputAnswer;
    
    if (notification.answers) {
      const selectedAnswerObj = notification.answers.find((a) => a.id === selectedAnswer);
      if (selectedAnswerObj?.isCorrect === false) {
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        return;
      }
    }
    
    onComplete(notification.id, answerId);
    setIsVisible(false);
  }, [selectedAnswer, inputAnswer, notification, onComplete]);

  const handleCompleteTask = useCallback(() => {
    onComplete(notification.id);
    setIsVisible(false);
  }, [notification.id, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className="relative w-full max-w-md"
        >
          <Card className="relative overflow-hidden border-4 border-yellow-400 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400" />
            
            <button
              onClick={handleDismiss}
              className={`absolute ${cancelButtonPosition} z-10 p-2 rounded-full bg-gray-200/80 hover:bg-gray-300 transition-all`}
              data-testid="button-dismiss-notification"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <CardHeader className="text-center pt-8 pb-4">
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Star className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold">
                {notification.title}
              </CardTitle>
              {notification.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.description}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-lg font-bold text-yellow-600">
                  +{notification.points}
                </span>
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-6">
              {notification.type === "question" && notification.question && (
                <div className="space-y-4">
                  <p className="text-center font-medium text-lg">
                    {notification.question}
                  </p>

                  {notification.answers && notification.answers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {notification.answers.map((answer) => (
                        <motion.button
                          key={answer.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedAnswer(answer.id)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            selectedAnswer === answer.id
                              ? "border-primary bg-primary/10"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {answer.emoji && (
                            <span className="text-3xl mb-2 block">{answer.emoji}</span>
                          )}
                          {answer.imageUrl && (
                            <img
                              src={answer.imageUrl}
                              alt={answer.text}
                              className="w-12 h-12 mx-auto mb-2 object-contain"
                            />
                          )}
                          <span className="text-sm font-medium">
                            {answer.text}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      value={inputAnswer}
                      onChange={(e) => setInputAnswer(e.target.value)}
                      placeholder="اكتب إجابتك هنا..."
                      className="text-center"
                      data-testid="input-task-answer"
                    />
                  )}
                </div>
              )}

              {showError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center gap-2 text-red-500 font-medium"
                >
                  <XCircle className="w-5 h-5" />
                  <span>إجابة خاطئة! حاول مرة أخرى</span>
                </motion.div>
              )}

              <div className="flex gap-3">
                {notification.type === "task" ? (
                  <Button
                    onClick={handleCompleteTask}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    data-testid="button-complete-task"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    أكملت المهمة
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer && !inputAnswer}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                    data-testid="button-submit-answer"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    إرسال الإجابة
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ChildTaskNotificationManager() {
  const [activeNotification, setActiveNotification] = useState<TaskNotification | null>(null);
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("childToken");
    if (!token) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/child/task-notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          return;
        }
        if (res.ok) {
          const json = await res.json();
          const data = json?.data || json || [];
          if (Array.isArray(data) && data.length > 0) {
            setNotifications(data);
            if (!activeNotification) {
              setActiveNotification(data[0]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch task notifications:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [activeNotification]);

  const handleComplete = useCallback(
    async (notificationId: string, answerId?: string) => {
      const token = localStorage.getItem("childToken");
      if (!token) return;

      try {
        await fetch("/api/child/task-notifications/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notificationId, answerId }),
        });

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setActiveNotification((prev) =>
          prev?.id === notificationId ? null : prev
        );
      } catch (error) {
        console.error("Failed to complete task notification:", error);
      }
    },
    []
  );

  const handleDismiss = useCallback((notificationId: string) => {
    setActiveNotification(null);
    setTimeout(() => {
      setActiveNotification(
        (prev) => notifications.find((n) => n.id === notificationId) || prev
      );
    }, 20000);
  }, [notifications]);

  if (!activeNotification) return null;

  return (
    <SponsoredTaskNotification
      notification={activeNotification}
      onComplete={handleComplete}
      onDismiss={handleDismiss}
    />
  );
}
