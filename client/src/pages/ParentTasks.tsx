import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getDateLocale } from "@/i18n/config";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Plus, Star, Users, BookOpen, Send, Coins, Loader2, Calendar, Clock, X, Pencil, Wallet, ShoppingCart, Heart, Sparkles, Search, ShoppingBag, Library, Infinity, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskForm, type TaskFormValue } from "@/components/forms/TaskForm";

export default function ParentTasks() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("classy");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showScheduledTasks, setShowScheduledTasks] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [selectedChildForCreate, setSelectedChildForCreate] = useState<string>("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showLibrarySendDialog, setShowLibrarySendDialog] = useState(false);
  const [selectedLibraryTask, setSelectedLibraryTask] = useState<any>(null);
  const [libraryCustomize, setLibraryCustomize] = useState(false);
  const [libraryChildId, setLibraryChildId] = useState<string>("");
  const [libraryCustomPoints, setLibraryCustomPoints] = useState<number>(0);
  const NO_CHILD_VALUE = "__none__";

  const { data: subjectsData } = useQuery<any>({
    queryKey: ["/api/subjects"],
  });

  const { data: childrenData } = useQuery<any>({
    queryKey: ["/api/parent/children"],
  });

  const { data: classyTasks, isLoading: loadingClassy } = useQuery<any>({
    queryKey: ["/api/subjects", selectedSubject, "template-tasks"],
    queryFn: async () => {
      if (!selectedSubject) return [];
      const res = await fetch(`/api/subjects/${selectedSubject}/template-tasks`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: activeTab === "classy" && !!selectedSubject,
  });

  const { data: myTasks, isLoading: loadingMy } = useQuery<any>({
    queryKey: ["/api/parent/my-tasks", selectedSubject],
    queryFn: async () => {
      let url = "/api/parent/my-tasks";
      if (selectedSubject) url += `?subjectId=${selectedSubject}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: activeTab === "my",
  });

  const { data: publicTasks, isLoading: loadingPublic } = useQuery<any>({
    queryKey: ["/api/parent/public-tasks", selectedSubject],
    queryFn: async () => {
      let url = "/api/parent/public-tasks";
      if (selectedSubject) url += `?subjectId=${selectedSubject}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      return data.data || [];
    },
    enabled: activeTab === "public",
  });

  const { data: walletData } = useQuery<any>({
    queryKey: ["/api/parent/wallet"],
  });

  const { data: libraryData, isLoading: loadingLibrary } = useQuery<any>({
    queryKey: ["/api/parent/task-library"],
    queryFn: async () => {
      const res = await fetch("/api/parent/task-library", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data?.tasks || [];
    },
    enabled: activeTab === "library" && !!token,
  });

  // Marketplace state & queries
  const [marketSearch, setMarketSearch] = useState("");
  const { data: browseData, isLoading: loadingBrowse } = useQuery<any>({
    queryKey: ["browse-tasks", marketSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ sort: "popular", limit: "12" });
      if (marketSearch.trim().length >= 2) params.set("q", marketSearch.trim());
      const res = await fetch(`/api/parent/browse-tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data;
    },
    enabled: activeTab === "marketplace" && !!token,
  });

  const { data: cartData } = useQuery<any>({
    queryKey: ["cart-count"],
    queryFn: async () => {
      const res = await fetch("/api/parent/cart/count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { count: 0 };
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
  });

  const likeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/parent/tasks/${taskId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["browse-tasks"] }),
    onError: () => toast({ title: t("taskMarketplace.errorOccurred"), variant: "destructive" }),
  });

  const addToCartMutation = useMutation({
    mutationFn: async (teacherTaskId: string) => {
      const res = await fetch("/api/parent/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacherTaskId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart-count"] });
      qc.invalidateQueries({ queryKey: ["browse-tasks"] });
      toast({ title: t("taskMarketplace.addedToCart") });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const browseTasks = browseData?.tasks || [];
  const cartCount = cartData?.count || 0;

  const subjects = subjectsData?.data || subjectsData || [];
  const children = childrenData?.data || childrenData || [];
  const walletBalance = Number(walletData?.data?.balance ?? walletData?.balance ?? 0);

  const buildDefaultForm = (): TaskFormValue => ({
    title: "",
    question: "",
    answers: [
      { id: "1", text: "", isCorrect: true },
      { id: "2", text: "", isCorrect: false },
      { id: "3", text: "", isCorrect: false },
    ],
    pointsReward: 10,
    difficulty: "medium",
    subjectId: selectedSubject && selectedSubject !== "all" ? selectedSubject : "",
    isPublic: false,
    pointsCost: 5,
    taskMedia: null,
  });

  const mapTaskToFormValue = (task: any): TaskFormValue => ({
    title: task.title || "",
    question: task.question || "",
    answers: (task.answers || []).map((a: any, idx: number) => ({
      id: a.id || String(idx + 1),
      text: a.text || "",
      isCorrect: !!a.isCorrect,
      imageUrl: a.imageUrl,
      media: a.media,
    })),
    pointsReward: task.pointsReward || 10,
    difficulty: task.difficulty || "medium",
    subjectId: task.subjectId || "",
    isPublic: !!task.isPublic,
    pointsCost: task.pointsCost ?? 5,
    taskMedia: task.taskMedia || null,
  });

  const { data: scheduledTasks, isLoading: loadingScheduled, error: scheduledError } = useQuery<any>({
    queryKey: ["/api/parent/scheduled-tasks"],
    enabled: showScheduledTasks,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/parent/create-custom-task", data);
    },
    onSuccess: () => {
      toast({ title: t("parentTasks.taskCreated") });
      setShowCreateDialog(false);
      setCreateFormKey((k) => k + 1);
      setSelectedChildForCreate("");
      setSaveAsTemplate(false);
      queryClient.invalidateQueries({ queryKey: ["/api/parent/my-tasks"] });
    },
    onError: () => {
      toast({ title: t("parentTasks.taskCreateFailed"), variant: "destructive" });
    },
  });

  const createAndSendTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/parent/create-and-send-task", data);
    },
    onSuccess: (response: any) => {
      const savedTemplate = response?.data?.templateTaskId;
      toast({ 
        title: savedTemplate 
          ? t("parentTasks.taskCreatedAndSent") 
          : t("parentTasks.taskSentSuccess"),
        description: savedTemplate ? t("parentTasks.templateSaved") : undefined
      });
      setShowCreateDialog(false);
      setCreateFormKey((k) => k + 1);
      setSelectedChildForCreate("");
      setSaveAsTemplate(false);
      queryClient.invalidateQueries({ queryKey: ["/api/parent/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
    },
    onError: (error: any) => {
      toast({ 
        title: error?.message || t("parentTasks.taskCreateFailed"), 
        variant: "destructive" 
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, title, question, answers, pointsReward, subjectId, isPublic, pointsCost } = data;
      const payload = { title, question, answers, pointsReward, subjectId, isPublic, pointsCost };
      const res = await fetch(`/api/parent/my-tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("parentTasks.taskUpdated") });
      setShowEditDialog(false);
      setEditTask(null);
      queryClient.invalidateQueries({ queryKey: ["/api/parent/my-tasks"] });
    },
    onError: () => {
      toast({ title: t("parentTasks.taskUpdateFailed"), variant: "destructive" });
    },
  });

  const sendTaskMutation = useMutation({
    mutationFn: async (data: { templateTaskId: string; childId: string; points?: number }) => {
      return apiRequest("POST", "/api/parent/send-template-task", data);
    },
    onSuccess: () => {
      toast({ title: t("parentTasks.taskSentSuccess") });
      setShowSendDialog(false);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
    },
    onError: (error: any) => {
      toast({ 
        title: error?.message || t("errors.failedToSendTask"), 
        variant: "destructive" 
      });
    },
  });

  const scheduleTaskMutation = useMutation({
    mutationFn: async (data: { templateTaskId: string; childId: string; scheduledAt: string }) => {
      return apiRequest("POST", "/api/parent/scheduled-tasks", data);
    },
    onSuccess: () => {
      toast({ title: t("taskScheduled") });
      setShowSendDialog(false);
      setSelectedTask(null);
      setScheduleMode(false);
      setScheduleDate("");
      setScheduleTime("");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/scheduled-tasks"] });
    },
    onError: (error: any) => {
      toast({ 
        title: error?.message || t("errors.failedToScheduleTask"), 
        variant: "destructive" 
      });
    },
  });

  const cancelScheduledMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/parent/scheduled-tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to cancel");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("parentTasks.scheduleCancelled") });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/scheduled-tasks"] });
    },
    onError: (error: any) => {
      toast({ title: error?.message || t("parentTasks.scheduleCancelFailed"), variant: "destructive" });
    },
  });

  const libraryUseMutation = useMutation({
    mutationFn: async (data: { libraryId: string; childId: string; pointsReward?: number; question?: string; answers?: any[]; imageUrl?: string; gifUrl?: string }) => {
      const res = await fetch(`/api/parent/task-library/${data.libraryId}/use`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          childId: data.childId,
          pointsReward: data.pointsReward,
          question: data.question,
          answers: data.answers,
          imageUrl: data.imageUrl,
          gifUrl: data.gifUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      return json.data;
    },
    onSuccess: (data) => {
      toast({ title: t("parentTasks.libraryTaskSent") });
      setShowLibrarySendDialog(false);
      setSelectedLibraryTask(null);
      setLibraryChildId("");
      setLibraryCustomize(false);
      setLibraryCustomPoints(0);
      queryClient.invalidateQueries({ queryKey: ["/api/parent/task-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
    },
    onError: (error: any) => {
      toast({ title: error?.message || t("parentTasks.libraryTaskSendFailed"), variant: "destructive" });
    },
  });

  const handleCreateTaskSubmit = async (form: TaskFormValue) => {
    const subjectId = form.subjectId || (selectedSubject && selectedSubject !== "all" ? selectedSubject : "");

    // If sending directly to child
    if (selectedChildForCreate) {
      if (!form.question) {
        toast({ title: t("parentTasks.fillRequiredFields"), variant: "destructive" });
        return;
      }
      try {
        await createAndSendTaskMutation.mutateAsync({
          title: form.title,
          question: form.question,
          answers: form.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, imageUrl: a.imageUrl })),
          pointsReward: form.pointsReward,
          subjectId: subjectId || null,
          difficulty: form.difficulty,
          childId: selectedChildForCreate,
          saveAsTemplate,
          taskMedia: form.taskMedia,
        });
      } catch (error) {
        console.error("Task creation error:", error);
        toast({ title: t("parentTasks.taskCreateFailed"), variant: "destructive" });
      }
      return;
    }

    // Creating template only (no child selected)
    if (!form.title || !form.question || !subjectId) {
      toast({ title: t("parentTasks.fillRequiredFields"), variant: "destructive" });
      return;
    }

    try {
      await createTaskMutation.mutateAsync({
        title: form.title,
        question: form.question,
        answers: form.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, imageUrl: a.imageUrl })),
        pointsReward: form.pointsReward,
        subjectId,
        isPublic: form.isPublic,
        pointsCost: form.pointsCost,
      });
    } catch (error) {
      console.error("Task creation error:", error);
      toast({ title: t("parentTasks.taskCreateFailed"), variant: "destructive" });
    }
  };

  const handleEditTaskSubmit = async (form: TaskFormValue) => {
    if (!editTask?.id) return;
    if (!form.title || !form.question) {
      toast({ title: t("parentTasks.fillRequiredFields"), variant: "destructive" });
      return;
    }

    await updateTaskMutation.mutateAsync({
      id: editTask.id,
      title: form.title,
      question: form.question,
      answers: form.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, imageUrl: a.imageUrl })),
      pointsReward: form.pointsReward,
      subjectId: form.subjectId,
      isPublic: form.isPublic,
      pointsCost: form.pointsCost,
    });
  };

  const openEditDialog = (task: any) => {
    setEditTask({ id: task.id, ...mapTaskToFormValue(task) });
    setShowEditDialog(true);
  };

  const handleSendTask = () => {
    if (!selectedTask || !selectedChild) {
      toast({ title: t("parentTasks.selectChildRequired"), variant: "destructive" });
      return;
    }
    
    if (scheduleMode) {
      if (!scheduleDate || !scheduleTime) {
        toast({ title: t("parentTasks.selectDateTimeRequired"), variant: "destructive" });
        return;
      }
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      scheduleTaskMutation.mutate({
        templateTaskId: selectedTask.id,
        childId: selectedChild,
        scheduledAt,
      });
    } else {
      sendTaskMutation.mutate({
        templateTaskId: selectedTask.id,
        childId: selectedChild,
      });
    }
  };

  const openSendDialog = (task: any) => {
    setSelectedTask(task);
    setShowSendDialog(true);
  };

  const openLibrarySendDialog = (item: any) => {
    setSelectedLibraryTask(item);
    setLibraryChildId("");
    setLibraryCustomize(false);
    setLibraryCustomPoints(item.pointsReward || 10);
    setShowLibrarySendDialog(true);
  };

  const handleLibrarySend = async (form?: TaskFormValue) => {
    if (!selectedLibraryTask || !libraryChildId) {
      toast({ title: t("parentTasks.selectChildRequired"), variant: "destructive" });
      return;
    }
    const payload: any = {
      libraryId: selectedLibraryTask.id,
      childId: libraryChildId,
    };
    if (libraryCustomize && form) {
      payload.pointsReward = form.pointsReward;
      payload.question = form.question;
      payload.answers = form.answers.map((a: any) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, imageUrl: a.imageUrl }));
    } else {
      payload.pointsReward = libraryCustomPoints || selectedLibraryTask.pointsReward;
    }
    libraryUseMutation.mutate(payload);
  };

  const mapLibraryToFormValue = (item: any): TaskFormValue => ({
    title: item.title || "",
    question: item.question || "",
    answers: (item.answers || []).map((a: any, idx: number) => ({
      id: a.id || String(idx + 1),
      text: a.text || "",
      isCorrect: !!a.isCorrect,
      imageUrl: a.imageUrl,
    })),
    pointsReward: item.pointsReward || 10,
    difficulty: "medium",
    subjectId: "",
    isPublic: false,
    pointsCost: 0,
    taskMedia: null,
  });

  const libraryTasks = libraryData || [];

  const TaskCard = ({ task, showCost = false, showCreator = false, showEdit = false }: any) => (
    <Card className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white"} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm mb-1 truncate">{task.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{task.question}</p>
            {showCreator && task.creatorName && (
              <p className="text-xs text-muted-foreground mt-1">
                <Users className="h-3 w-3 inline ml-1" />
                {task.creatorName}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary" className="shrink-0">
              <Star className="h-3 w-3 ml-1" />
              {task.pointsReward} {t("parentTasks.points")}
            </Badge>
            {showCost && task.pointsCost > 0 && (
              <Badge variant="outline" className="shrink-0 text-orange-600 border-orange-300">
                <Coins className="h-3 w-3 ml-1" />
                {task.pointsCost} {t("parentTasks.points")}
              </Badge>
            )}
            <div className="flex gap-2">
              {showEdit && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openEditDialog(task)}
                  data-testid={`edit-task-${task.id}`}
                >
                  <Pencil className="h-3 w-3 ml-1" />
                  {t("parentTasks.edit")}
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={() => openSendDialog(task)}
                data-testid={`send-task-${task.id}`}
              >
                <Send className="h-3 w-3 ml-1" />
                {t("parentTasks.send")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`min-h-screen p-4 ${isDark ? "bg-gray-900 text-white" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")} data-testid="back-button">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t("parentTasks.tasksSection")}</h1>
          <Badge variant="outline" className="mr-auto text-sm px-3 py-1">
            <Wallet className="h-4 w-4 ml-1" />
            {t("parentTasks.balanceLabel")} {walletBalance}
          </Badge>
          <LanguageSelector />
          <ParentNotificationBell />
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48" data-testid="select-subject">
              <SelectValue placeholder={t("parentTasks.selectSubject")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("parentTasks.allSubjects")}</SelectItem>
              {subjects.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={() => setShowScheduledTasks(true)}
            data-testid="view-scheduled-tasks"
          >
            <Clock className="h-4 w-4 ml-2" />
            {t("parentTasks.scheduledTasks")}
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              setSelectedChildForCreate("");
              setSaveAsTemplate(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="create-task-button">
                <Plus className="h-4 w-4 ml-2" />
                {t("parentTasks.createNewTask")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("parentTasks.createNewTask")}</DialogTitle>
              </DialogHeader>
              
              {/* Direct Assignment Section */}
              <div className="space-y-4 mb-4 p-4 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-sm font-medium">{t("parentTasks.sendDirectlyToChild")}</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("parentTasks.selectChildOrLeaveEmpty")}
                  </p>
                  <Select
                    value={selectedChildForCreate || NO_CHILD_VALUE}
                    onValueChange={(value) => setSelectedChildForCreate(value === NO_CHILD_VALUE ? "" : value)}
                  >
                    <SelectTrigger data-testid="select-child-for-create">
                      <SelectValue placeholder={t("parentTasks.selectChildPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CHILD_VALUE}>{t("parentTasks.noChildTemplateOnly")}</SelectItem>
                      {children.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedChildForCreate && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                    <div>
                      <Label className="text-sm">{t("parentTasks.saveAsTemplate")}</Label>
                      <p className="text-xs text-muted-foreground">{t("parentTasks.saveAsTemplateDesc")}</p>
                    </div>
                    <Switch
                      checked={saveAsTemplate}
                      onCheckedChange={setSaveAsTemplate}
                      data-testid="save-as-template-switch"
                    />
                  </div>
                )}
              </div>

              <TaskForm
                key={`create-${createFormKey}`}
                mode="parent"
                initialValue={buildDefaultForm()}
                subjects={subjects}
                showSubject
                allowPublic={!selectedChildForCreate}
                allowDifficulty
                onSubmit={handleCreateTaskSubmit}
                submitting={createTaskMutation.isPending || createAndSendTaskMutation.isPending}
                submitLabel={selectedChildForCreate ? t("parentTasks.createAndSend") : t("parentTasks.createTask")}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="classy" data-testid="tab-classy">
              <BookOpen className="h-4 w-4 ml-2" />
              {t("parentTasks.tabClassy")}
            </TabsTrigger>
            <TabsTrigger value="my" data-testid="tab-my">
              <Star className="h-4 w-4 ml-2" />
              {t("parentTasks.tabMy")}
            </TabsTrigger>
            <TabsTrigger value="library" data-testid="tab-library">
              <Library className="h-4 w-4 ml-2" />
              {t("parentTasks.tabLibrary")}
            </TabsTrigger>
            <TabsTrigger value="public" data-testid="tab-public">
              <Users className="h-4 w-4 ml-2" />
              {t("parentTasks.tabPublic")}
            </TabsTrigger>
            <TabsTrigger value="marketplace" data-testid="tab-marketplace" className="relative">
              <Sparkles className="h-4 w-4 ml-2" />
              {t("parentTasks.tabMarketplace")}
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classy" className="mt-4">
            {!selectedSubject ? (
              <Card className={isDark ? "bg-gray-800" : ""}>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>{t("parentTasks.selectSubjectToView")}</p>
                </CardContent>
              </Card>
            ) : loadingClassy ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-3">
                {(classyTasks || []).length === 0 ? (
                  <Card className={isDark ? "bg-gray-800" : ""}>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">{t("parentTasks.noTasksInSubject")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  (classyTasks || []).map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="mt-4">
            {loadingMy ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-3">
                {(myTasks || []).length === 0 ? (
                  <Card className={isDark ? "bg-gray-800" : ""}>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">{t("parentTasks.noTasksCreated")}</p>
                      <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 ml-2" />
                        {t("parentTasks.createTask")}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  (myTasks || []).map((task: any) => (
                    <TaskCard key={task.id} task={task} showEdit />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="library" className="mt-4">
            {loadingLibrary ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : libraryTasks.length === 0 ? (
              <Card className={isDark ? "bg-gray-800" : ""}>
                <CardContent className="p-8 text-center">
                  <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-bold mb-2">{t("parentTasks.libraryEmpty")}</p>
                  <p className="text-sm text-muted-foreground mb-4">{t("parentTasks.libraryEmptyDesc")}</p>
                  <Button onClick={() => setActiveTab("marketplace")}>
                    <Sparkles className="h-4 w-4 ml-2" />
                    {t("parentTasks.tabMarketplace")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {libraryTasks.map((item: any) => {
                  const isExhausted = item.maxUsageCount !== null && item.usageCount >= item.maxUsageCount;
                  const purchaseLabel = item.purchaseType === "one_time"
                    ? t("parentTasks.purchaseOnce")
                    : item.purchaseType === "limited"
                    ? t("parentTasks.purchaseLimited")
                    : t("parentTasks.purchasePermanent");
                  
                  return (
                    <Card key={item.id} className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white"} hover:shadow-md transition-shadow ${isExhausted ? "opacity-60" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm mb-1 truncate">{item.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.question}</p>
                            
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge variant={item.purchaseType === "permanent" ? "default" : "secondary"} className="text-[10px]">
                                {item.purchaseType === "permanent" ? <Infinity className="h-2.5 w-2.5 ml-0.5" /> : <RotateCcw className="h-2.5 w-2.5 ml-0.5" />}
                                {purchaseLabel}
                              </Badge>
                              
                              {item.maxUsageCount !== null ? (
                                <Badge variant={isExhausted ? "destructive" : "outline"} className="text-[10px]">
                                  {isExhausted 
                                    ? t("parentTasks.usageExhausted")
                                    : t("parentTasks.usageCount", { used: item.usageCount, total: item.maxUsageCount })
                                  }
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  {t("parentTasks.usageUnlimited")}
                                </Badge>
                              )}

                              {item.subjectLabel && (
                                <Badge variant="outline" className="text-[10px]">{item.subjectLabel}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary" className="shrink-0">
                              <Star className="h-3 w-3 ml-1" />
                              {item.pointsReward} {t("parentTasks.points")}
                            </Badge>
                            {!isExhausted && item.isActive && (
                              <Button 
                                size="sm" 
                                onClick={() => openLibrarySendDialog(item)}
                                data-testid={`send-library-${item.id}`}
                              >
                                <Send className="h-3 w-3 ml-1" />
                                {t("parentTasks.send")}
                              </Button>
                            )}
                            {isExhausted && (
                              <Badge variant="destructive" className="text-xs">{t("parentTasks.usageExhausted")}</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="public" className="mt-4">
            <Card className={`mb-4 ${isDark ? "bg-orange-900/20 border-orange-500/30" : "bg-orange-50 border-orange-200"}`}>
              <CardContent className="p-3 text-sm">
                <Coins className="h-4 w-4 inline ml-2 text-orange-500" />
                {t("parentTasks.publicTasksNote")}
              </CardContent>
            </Card>
            
            {loadingPublic ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-3">
                {(publicTasks || []).length === 0 ? (
                  <Card className={isDark ? "bg-gray-800" : ""}>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">{t("parentTasks.noPublicTasksAvailable")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  (publicTasks || []).map((task: any) => (
                    <TaskCard key={task.id} task={task} showCost showCreator />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="marketplace" className="mt-4">
            {/* Search + Cart */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  placeholder={t("taskMarketplace.searchPlaceholder")}
                  className="pr-10 rounded-xl"
                />
              </div>
              <Button
                variant="outline"
                className="relative shrink-0"
                onClick={() => navigate("/task-cart")}
              >
                <ShoppingCart className="h-4 w-4 ml-2" />
                {t("parentTasks.cart")}
                {cartCount > 0 && (
                  <Badge className="mr-2 bg-red-500 text-white text-xs px-1.5">{cartCount}</Badge>
                )}
              </Button>
            </div>

            {loadingBrowse ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : browseTasks.length === 0 ? (
              <Card className={isDark ? "bg-gray-800" : ""}>
                <CardContent className="p-8 text-center">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">{t("taskMarketplace.noTasks")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("taskMarketplace.tryDifferentCriteria")}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {browseTasks.map((task: any) => (
                    <Card key={task.id} className={`overflow-hidden hover:shadow-lg transition-all ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
                      {task.coverImageUrl && (
                        <div className="relative h-32 overflow-hidden">
                          <img
                            src={task.coverImageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                          {task.isPurchased && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              {t("taskMarketplace.purchased")}
                            </div>
                          )}
                        </div>
                      )}
                      <CardContent className="p-4">
                        {/* Teacher */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                            {task.teacherAvatar ? (
                              <img src={task.teacherAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              task.teacherName?.charAt(0) || "?"
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{task.teacherName}</span>
                        </div>

                        <h3 className="font-bold text-sm line-clamp-2 mb-1">{task.title || task.question}</h3>
                        {task.title && task.question !== task.title && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.question}</p>
                        )}

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {task.subjectLabel && (
                            <Badge variant="outline" className="text-[10px] py-0">{task.subjectLabel}</Badge>
                          )}
                          {task.pointsReward > 0 && (
                            <Badge variant="secondary" className="text-[10px] py-0 gap-0.5">
                              <Star className="h-2.5 w-2.5" /> {task.pointsReward}
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t">
                          <button
                            onClick={() => likeMutation.mutate(task.id)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              task.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${task.isLiked ? "fill-red-500" : ""}`} />
                            <span>{task.likesCount || 0}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-600">{task.price} {t("taskMarketplace.currency")}</span>
                            {task.isPurchased ? (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                {t("taskMarketplace.purchasedBadge")}
                              </Badge>
                            ) : task.inCart ? (
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                {t("taskMarketplace.inCart")}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs px-3 bg-purple-600 hover:bg-purple-700 gap-1"
                                onClick={() => addToCartMutation.mutate(task.id)}
                              >
                                <ShoppingCart className="h-3 w-3" />
                                {t("taskMarketplace.addBtn")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Browse all link */}
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => navigate("/task-marketplace")}
                  >
                    <Sparkles className="h-4 w-4" />
                    {t("parentTasks.browseAllMarketplace")}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showSendDialog} onOpenChange={(open: boolean) => {
        setShowSendDialog(open);
        if (!open) {
          setScheduleMode(false);
          setScheduleDate("");
          setScheduleTime("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{scheduleMode ? t("parentTasks.scheduleTask") : t("parentTasks.sendToChild")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTask && (
              <Card className={isDark ? "bg-gray-800" : "bg-muted"}>
                <CardContent className="p-3">
                  <p className="font-bold">{selectedTask.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedTask.question}</p>
                  {selectedTask.pointsCost > 0 && selectedTask.isPublic && (
                    <Badge variant="outline" className="mt-2 text-orange-600">
                      <Coins className="h-3 w-3 ml-1" />
                      {t("parentTasks.pointsDeductWarning", { points: selectedTask.pointsCost })}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            <div>
              <Label>{t("parentTasks.chooseSendChild")}</Label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger data-testid="select-child-send">
                  <SelectValue placeholder={t("parentTasks.selectChild")} />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.totalPoints} {t("parentTasks.points")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={scheduleMode}
                onCheckedChange={setScheduleMode}
                data-testid="toggle-schedule-mode"
              />
              <Label className="flex items-center gap-2 cursor-pointer">
                <Calendar className="h-4 w-4" />
                {t("parentTasks.scheduleLaterLabel")}
              </Label>
            </div>

            {scheduleMode && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("parentTasks.dateLabel")}</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    data-testid="input-schedule-date"
                  />
                </div>
                <div>
                  <Label>{t("parentTasks.timeLabel")}</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setScheduleTime(e.target.value)}
                    data-testid="input-schedule-time"
                  />
                </div>
              </div>
            )}

            {selectedTask && walletBalance < (selectedTask.pointsReward || 0) && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
                <Wallet className="h-4 w-4 inline ml-1" />
                {t("parentTasks.insufficientBalanceDetail", { balance: walletBalance, required: selectedTask.pointsReward })}
              </div>
            )}

            <Button
              onClick={handleSendTask}
              className="w-full"
              disabled={(scheduleMode ? scheduleTaskMutation.isPending : sendTaskMutation.isPending) || !selectedChild || (!!selectedTask && walletBalance < (selectedTask.pointsReward || 0))}
              data-testid="confirm-send-task"
            >
              {(scheduleMode ? scheduleTaskMutation.isPending : sendTaskMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : scheduleMode ? (
                <>
                  <Clock className="h-4 w-4 ml-2" />
                  {t("parentTasks.scheduleTask")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  {t("parentTasks.sendTask")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduledTasks} onOpenChange={setShowScheduledTasks}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("parentTasks.scheduledTasks")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {loadingScheduled ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (scheduledTasks || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("parentTasks.noScheduledTasks")}</p>
              </div>
            ) : (
              (scheduledTasks || []).map((st: any) => (
                <Card key={st.id} className={isDark ? "bg-gray-800" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{st.templateTask?.title || t("parentTasks.task")}</p>
                        <p className="text-xs text-muted-foreground">{t("parentTasks.forChild")}: {st.child?.name || t("parentTasks.unknownChild")}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <Badge variant={st.status === "pending" ? "secondary" : st.status === "sent" ? "default" : "outline"}>
                            {st.status === "pending" ? t("parentTasks.pending") : st.status === "sent" ? t("parentTasks.sent") : t("parentTasks.cancelled")}
                          </Badge>
                          <span className="text-muted-foreground">
                            <Clock className="h-3 w-3 inline ml-1" />
                            {new Date(st.scheduledAt).toLocaleString(getDateLocale())}
                          </span>
                        </div>
                      </div>
                      {st.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelScheduledMutation.mutate(st.id)}
                          disabled={cancelScheduledMutation.isPending}
                          data-testid={`cancel-scheduled-${st.id}`}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowEditDialog(false);
          setEditTask(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("parentTasks.editTask")}</DialogTitle>
          </DialogHeader>
          {editTask && (
            <TaskForm
              key={`edit-${editTask.id}`}
              mode="parent"
              initialValue={mapTaskToFormValue(editTask)}
              subjects={subjects}
              showSubject
              allowPublic
              allowDifficulty
              onSubmit={handleEditTaskSubmit}
              submitting={updateTaskMutation.isPending}
              submitLabel={t("parentTasks.saveChanges")}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Library Send Dialog */}
      <Dialog open={showLibrarySendDialog} onOpenChange={(open: boolean) => {
        if (!open) {
          setShowLibrarySendDialog(false);
          setSelectedLibraryTask(null);
          setLibraryChildId("");
          setLibraryCustomize(false);
          setLibraryCustomPoints(0);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("parentTasks.sendFromLibrary")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLibraryTask && (
              <Card className={isDark ? "bg-gray-800" : "bg-muted"}>
                <CardContent className="p-3">
                  <p className="font-bold">{selectedLibraryTask.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedLibraryTask.question}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 ml-1" />
                      {selectedLibraryTask.pointsReward} {t("parentTasks.points")}
                    </Badge>
                    {selectedLibraryTask.maxUsageCount !== null && (
                      <Badge variant="outline" className="text-xs">
                        {t("parentTasks.remainingUses", { count: Math.max(0, selectedLibraryTask.maxUsageCount - selectedLibraryTask.usageCount) })}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label>{t("parentTasks.chooseSendChild")}</Label>
              <Select value={libraryChildId} onValueChange={setLibraryChildId}>
                <SelectTrigger data-testid="select-library-child">
                  <SelectValue placeholder={t("parentTasks.selectChild")} />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.totalPoints} {t("parentTasks.points")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!libraryCustomize && (
              <div>
                <Label>{t("parentTasks.customPoints")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={libraryCustomPoints || ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLibraryCustomPoints(parseInt(e.target.value) || 0)}
                  data-testid="library-custom-points"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={libraryCustomize}
                onCheckedChange={setLibraryCustomize}
                data-testid="toggle-library-customize"
              />
              <Label className="flex items-center gap-2 cursor-pointer">
                <Pencil className="h-4 w-4" />
                {t("parentTasks.customizeBeforeSend")}
              </Label>
            </div>

            {libraryCustomize && selectedLibraryTask ? (
              <TaskForm
                key={`library-${selectedLibraryTask.id}`}
                mode="parent"
                initialValue={mapLibraryToFormValue(selectedLibraryTask)}
                subjects={subjects}
                showSubject={false}
                allowPublic={false}
                allowDifficulty={false}
                onSubmit={(form) => handleLibrarySend(form)}
                submitting={libraryUseMutation.isPending}
                submitLabel={t("parentTasks.sendTask")}
              />
            ) : (
              <>
                {selectedLibraryTask && walletBalance < (libraryCustomPoints || selectedLibraryTask.pointsReward || 0) && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
                    <Wallet className="h-4 w-4 inline ml-1" />
                    {t("parentTasks.insufficientBalance")}
                  </div>
                )}

                <Button
                  onClick={() => handleLibrarySend()}
                  className="w-full"
                  disabled={libraryUseMutation.isPending || !libraryChildId || (!!selectedLibraryTask && walletBalance < (libraryCustomPoints || selectedLibraryTask.pointsReward || 0))}
                  data-testid="confirm-library-send"
                >
                  {libraryUseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 ml-2" />
                      {t("parentTasks.sendAsIs")}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
