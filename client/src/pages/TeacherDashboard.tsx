import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import ImageCropper from "@/components/ImageCropper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ShareMenu } from "@/components/ui/ShareMenu";
import {
  GraduationCap, BookOpen, Users, Star, LogOut, Plus, Edit, Trash2,
  DollarSign, TrendingUp, ArrowDownToLine, CheckCircle, Clock, MessageSquare,
  Image, Video, Upload, X, FileText, Settings, Camera, Link2, User,
  BarChart3, Lock, Unlock, Pin, PinOff,
} from "lucide-react";

interface Task {
  id: string;
  title?: string;
  question: string;
  answers: { id: string; text: string; isCorrect: boolean; imageUrl?: string; videoUrl?: string }[];
  explanation: string | null;
  imageUrl?: string | null;
  gifUrl?: string | null;
  videoUrl?: string | null;
  coverImageUrl?: string | null;
  questionImages?: string[];
  subjectLabel?: string | null;
  price: string;
  purchaseCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
}

// ===== File Upload Helper =====
async function uploadFileForTeacher(file: File, token: string, purpose: string): Promise<string> {
  // Step 1: Get presigned URL
  const presignRes = await fetch("/api/teacher/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
      purpose,
      originalName: file.name,
    }),
  });
  if (!presignRes.ok) throw new Error("فشل رفع الملف");
  const { data: presign } = await presignRes.json();

  // Step 2: Upload file — handle local vs remote URLs
  const isLocalUrl = presign.uploadURL.startsWith("/api/");
  if (isLocalUrl) {
    // Local storage: PUT directly to server endpoint
    const directRes = await fetch(presign.uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!directRes.ok) throw new Error("فشل رفع الملف إلى التخزين");
  } else {
    // Remote storage: Upload via proxy
    const proxyRes = await fetch("/api/teacher/uploads/proxy", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
        "x-upload-url": presign.uploadURL,
      },
      body: file,
    });
    if (!proxyRes.ok) throw new Error("فشل رفع الملف إلى التخزين");
  }

  // Step 3: Finalize
  const finalizeRes = await fetch("/api/teacher/uploads/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      objectPath: presign.objectPath,
      mimeType: file.type,
      size: file.size,
      originalName: file.name,
      purpose,
    }),
  });
  if (!finalizeRes.ok) throw new Error("فشل تأكيد رفع الملف");
  const { data: media } = await finalizeRes.json();
  return media.url;
}

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem("teacherToken");
  const teacherData = JSON.parse(localStorage.getItem("teacherData") || "{}");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [postContent, setPostContent] = useState("");
  const [postMediaFiles, setPostMediaFiles] = useState<File[]>([]);
  const [postMediaPreviews, setPostMediaPreviews] = useState<{ url: string; type: string }[]>([]);
  const [postUploading, setPostUploading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [taskImageFile, setTaskImageFile] = useState<File | null>(null);
  const [taskVideoFile, setTaskVideoFile] = useState<File | null>(null);
  const [taskCoverFile, setTaskCoverFile] = useState<File | null>(null);
  const [taskImagePreview, setTaskImagePreview] = useState<string | null>(null);
  const [taskVideoPreview, setTaskVideoPreview] = useState<string | null>(null);
  const [taskCoverPreview, setTaskCoverPreview] = useState<string | null>(null);
  const [taskUploading, setTaskUploading] = useState(false);
  // Answer media: per-answer image/video files
  const [answerMediaFiles, setAnswerMediaFiles] = useState<Record<string, { imageFile?: File; videoFile?: File }>>({}); 
  const [answerMediaPreviews, setAnswerMediaPreviews] = useState<Record<string, { imageUrl?: string; videoUrl?: string }>>({}); 
  // Question images (multiple)
  const [questionImageFiles, setQuestionImageFiles] = useState<File[]>([]);
  const [questionImagePreviews, setQuestionImagePreviews] = useState<string[]>([]);
  const questionImagesInputRef = useRef<HTMLInputElement>(null);
  // Profile editing
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", bio: "", subject: "", yearsExperience: 0, socialLinks: {} as Record<string, string> });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [cropperMode, setCropperMode] = useState<"avatar" | "cover">("avatar");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const postMediaInputRef = useRef<HTMLInputElement>(null);

  // Poll state
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: "",
    options: [{ text: "" }, { text: "" }],
    allowMultiple: false,
    isAnonymous: false,
    isPinned: false,
    expiresAt: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    question: "",
    explanation: "",
    subjectLabel: "",
    price: "",
    answers: [
      { id: "a1", text: "", isCorrect: true, imageUrl: undefined as string | undefined, videoUrl: undefined as string | undefined },
      { id: "a2", text: "", isCorrect: false, imageUrl: undefined as string | undefined, videoUrl: undefined as string | undefined },
      { id: "a3", text: "", isCorrect: false, imageUrl: undefined as string | undefined, videoUrl: undefined as string | undefined },
      { id: "a4", text: "", isCorrect: false, imageUrl: undefined as string | undefined, videoUrl: undefined as string | undefined },
    ],
  });

  useEffect(() => {
    if (!token) setLocation("/teacher/login");
  }, [token, setLocation]);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ===== Queries =====

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/profile", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery({
    queryKey: ["teacher-stats"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/stats", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["teacher-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/tasks", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: balance } = useQuery({
    queryKey: ["teacher-balance"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/balance", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["teacher-orders"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/orders", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["teacher-posts"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/posts", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["teacher-withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/withdrawals", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["teacher-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/reviews", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: teacherPolls = [] } = useQuery<any[]>({
    queryKey: ["teacher-polls"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/polls", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  // Subjects
  const { data: subjectsList = [] } = useQuery<any[]>({
    queryKey: ["teacher-subjects"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/subjects", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  // Template tasks for selected subject
  const { data: templateTasks = [] } = useQuery<any[]>({
    queryKey: ["teacher-templates", selectedSubjectId],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/subjects/${selectedSubjectId}/templates`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token && !!selectedSubjectId,
  });

  // ===== Mutations =====

  const createTask = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/teacher/tasks", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      setShowTaskModal(false);
      resetTaskForm();
      toast({ title: "تم إضافة المهمة بنجاح" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/teacher/tasks/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      setShowTaskModal(false);
      setEditingTask(null);
      resetTaskForm();
      toast({ title: "تم تحديث المهمة" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/tasks/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      toast({ title: "تم حذف المهمة" });
    },
  });

  const createPost = useMutation({
    mutationFn: async ({ content, mediaUrls, mediaTypes }: { content: string; mediaUrls: string[]; mediaTypes: string[] }) => {
      const res = await fetch("/api/teacher/posts", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content, mediaUrls, mediaTypes }),
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-posts"] });
      setShowPostModal(false);
      setPostContent("");
      setPostMediaFiles([]);
      setPostMediaPreviews([]);
      toast({ title: "تم نشر المنشور" });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/posts/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-posts"] });
      toast({ title: "تم حذف المنشور" });
    },
  });

  const requestWithdrawal = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/teacher/withdrawals", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-balance"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-withdrawals"] });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      toast({ title: "تم إرسال طلب السحب" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const createTaskFromTemplate = useMutation({
    mutationFn: async (data: { templateId: string; price: string; title?: string }) => {
      const res = await fetch("/api/teacher/create-task-from-template", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-tasks"] });
      setShowTemplateModal(false);
      toast({ title: "تم إنشاء المهمة من القالب بنجاح" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/teacher/profile", {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      setProfileEditMode(false);
      toast({ title: "تم تحديث الملف الشخصي" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const createPoll = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/teacher/polls", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-polls"] });
      setShowPollModal(false);
      resetPollForm();
      toast({ title: "تم إنشاء التصويت" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل إنشاء التصويت", variant: "destructive" }),
  });

  const updatePoll = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/teacher/polls/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-polls"] });
      toast({ title: "تم تحديث التصويت" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل التحديث", variant: "destructive" }),
  });

  const deletePoll = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/polls/${id}`, { method: "DELETE", headers: authHeaders });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-polls"] });
      toast({ title: "تم حذف التصويت" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل الحذف", variant: "destructive" }),
  });

  function resetPollForm() {
    setPollForm({
      question: "",
      options: [{ text: "" }, { text: "" }],
      allowMultiple: false,
      isAnonymous: false,
      isPinned: false,
      expiresAt: "",
    });
  }

  function handleSubmitPoll() {
    if (!pollForm.question.trim()) {
      toast({ title: "سؤال التصويت مطلوب", variant: "destructive" });
      return;
    }
    const validOptions = pollForm.options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      toast({ title: "يجب إضافة خيارين على الأقل", variant: "destructive" });
      return;
    }
    createPoll.mutate({
      question: pollForm.question.trim(),
      options: validOptions.map((o) => ({ text: o.text.trim() })),
      allowMultiple: pollForm.allowMultiple,
      isAnonymous: pollForm.isAnonymous,
      isPinned: pollForm.isPinned,
      expiresAt: pollForm.expiresAt || null,
    });
  }

  function resetTaskForm() {
    setTaskForm({
      title: "", question: "", explanation: "", subjectLabel: "", price: "",
      answers: [
        { id: "a1", text: "", isCorrect: true, imageUrl: undefined, videoUrl: undefined },
        { id: "a2", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
        { id: "a3", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
        { id: "a4", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
      ],
    });
    setTaskImageFile(null);
    setTaskVideoFile(null);
    setTaskCoverFile(null);
    setTaskImagePreview(null);
    setTaskVideoPreview(null);
    setTaskCoverPreview(null);
    setAnswerMediaFiles({});
    setAnswerMediaPreviews({});
    setQuestionImageFiles([]);
    setQuestionImagePreviews([]);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskForm({
      title: task.title || "",
      question: task.question,
      explanation: task.explanation || "",
      subjectLabel: task.subjectLabel || "",
      price: task.price,
      answers: task.answers.length > 0 ? task.answers.map(a => ({
        ...a,
        imageUrl: a.imageUrl || undefined,
        videoUrl: a.videoUrl || undefined,
      })) : [
        { id: "a1", text: "", isCorrect: true, imageUrl: undefined, videoUrl: undefined },
        { id: "a2", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
        { id: "a3", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
        { id: "a4", text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined },
      ],
    });
    setTaskImagePreview(task.imageUrl || null);
    setTaskVideoPreview(task.videoUrl || null);
    setTaskCoverPreview(task.coverImageUrl || null);
    setTaskImageFile(null);
    setTaskVideoFile(null);
    setTaskCoverFile(null);
    // Load answer media previews from existing data
    const previews: Record<string, { imageUrl?: string; videoUrl?: string }> = {};
    task.answers.forEach(a => {
      if (a.imageUrl || a.videoUrl) {
        previews[a.id] = { imageUrl: a.imageUrl, videoUrl: a.videoUrl };
      }
    });
    setAnswerMediaPreviews(previews);
    setAnswerMediaFiles({});
    // Load question images
    setQuestionImagePreviews(task.questionImages || []);
    setQuestionImageFiles([]);
    setShowTaskModal(true);
  }

  async function handleSubmitTask() {
    const filteredAnswers = taskForm.answers.filter(a => a.text.trim());
    if (!taskForm.question || !taskForm.price || filteredAnswers.length < 2) {
      toast({ title: "السؤال والسعر وإجابتين على الأقل مطلوبة", variant: "destructive" });
      return;
    }
    if (!filteredAnswers.some(a => a.isCorrect)) {
      toast({ title: "يجب تحديد إجابة صحيحة واحدة على الأقل", variant: "destructive" });
      return;
    }

    setTaskUploading(true);
    try {
      let imageUrl = editingTask?.imageUrl || null;
      let videoUrl = editingTask?.videoUrl || null;
      let coverImageUrl = editingTask?.coverImageUrl || null;

      if (taskImageFile && token) {
        imageUrl = await uploadFileForTeacher(taskImageFile, token, "task-image");
      }
      if (taskVideoFile && token) {
        videoUrl = await uploadFileForTeacher(taskVideoFile, token, "task-video");
      }
      if (taskCoverFile && token) {
        coverImageUrl = await uploadFileForTeacher(taskCoverFile, token, "task-cover");
      }

      // Upload answer media files
      const processedAnswers = await Promise.all(filteredAnswers.map(async (answer) => {
        const files = answerMediaFiles[answer.id];
        let answerImageUrl = answer.imageUrl || undefined;
        let answerVideoUrl = answer.videoUrl || undefined;
        
        if (files?.imageFile && token) {
          answerImageUrl = await uploadFileForTeacher(files.imageFile, token, `answer-img-${answer.id}`);
        }
        if (files?.videoFile && token) {
          answerVideoUrl = await uploadFileForTeacher(files.videoFile, token, `answer-vid-${answer.id}`);
        }
        
        return {
          id: answer.id,
          text: answer.text,
          isCorrect: answer.isCorrect,
          imageUrl: answerImageUrl,
          videoUrl: answerVideoUrl,
        };
      }));

      // Upload question images
      let questionImages: string[] = [...questionImagePreviews.filter(p => p.startsWith("http") || p.startsWith("/"))];
      if (questionImageFiles.length > 0 && token) {
        const uploaded = await Promise.all(
          questionImageFiles.map((f, i) => uploadFileForTeacher(f, token!, `question-img-${i}`))
        );
        questionImages = [...questionImages, ...uploaded];
      }

      const data: any = {
        title: taskForm.title || taskForm.question.substring(0, 60),
        question: taskForm.question,
        explanation: taskForm.explanation || null,
        subjectLabel: taskForm.subjectLabel || null,
        price: taskForm.price,
        answers: processedAnswers,
        imageUrl,
        videoUrl,
        coverImageUrl,
        questionImages,
      };

      if (editingTask) {
        updateTask.mutate({ id: editingTask.id, ...data });
      } else {
        createTask.mutate(data);
      }
    } catch (err: any) {
      toast({ title: err.message || "فشل رفع الملفات", variant: "destructive" });
    } finally {
      setTaskUploading(false);
    }
  }

  async function handleSubmitPost() {
    if (!postContent.trim()) return;
    setPostUploading(true);
    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      for (const file of postMediaFiles) {
        if (token) {
          const url = await uploadFileForTeacher(file, token, "post-media");
          mediaUrls.push(url);
          mediaTypes.push(file.type.startsWith("video/") ? "video" : "image");
        }
      }
      createPost.mutate({ content: postContent, mediaUrls, mediaTypes });
    } catch (err: any) {
      toast({ title: err.message || "فشل رفع الملفات", variant: "destructive" });
    } finally {
      setPostUploading(false);
    }
  }

  function handlePostMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.type.startsWith("video/")) {
        // Check duration (max 30 seconds)
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          if (video.duration > 30) {
            toast({ title: "الفيديو يجب أن يكون أقل من 30 ثانية", variant: "destructive" });
            return;
          }
          setPostMediaFiles(prev => [...prev, file]);
          setPostMediaPreviews(prev => [...prev, { url: URL.createObjectURL(file), type: "video" }]);
        };
        video.src = URL.createObjectURL(file);
      } else {
        setPostMediaFiles(prev => [...prev, file]);
        setPostMediaPreviews(prev => [...prev, { url: URL.createObjectURL(file), type: "image" }]);
      }
    }
    e.target.value = "";
  }

  function removePostMedia(index: number) {
    setPostMediaFiles(prev => prev.filter((_, i) => i !== index));
    setPostMediaPreviews(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSelectTeacherImage(e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "يرجى اختيار صورة فقط", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    setCropperMode(type);
    setCropperOpen(true);
    e.target.value = "";
  }

  async function handleCroppedTeacherImage(blob: Blob) {
    if (!token) return;
    const type = cropperMode;
    const file = new File([blob], `teacher-${type}.jpg`, { type: "image/jpeg" });

    if (type === "avatar") setAvatarUploading(true);
    else setCoverUploading(true);

    try {
      const url = await uploadFileForTeacher(file, token, type);
      if (type === "avatar") {
        await updateProfile.mutateAsync({ avatarUrl: url });
      } else {
        await updateProfile.mutateAsync({ coverImageUrl: url });
      }
    } catch {
      toast({ title: type === "avatar" ? "فشل رفع الصورة" : "فشل رفع صورة الغلاف", variant: "destructive" });
    } finally {
      if (type === "avatar") setAvatarUploading(false);
      else setCoverUploading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherData");
    setLocation("/teacher/login");
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <GraduationCap className="h-8 w-8" />
            )}
            <div>
              <h1 className="font-bold text-lg">{profile?.name || teacherData.name}</h1>
              <p className="text-green-100 text-xs">لوحة تحكم المعلم — {profile?.schoolName || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShareMenu
              url={typeof window !== "undefined" ? `${window.location.origin}/teacher/${profile?.id || ""}` : ""}
              title={`${profile?.name || "المعلم"} — Classify`}
              description={profile?.bio || `تعرّف على المعلم على منصة Classify`}
              variant="ghost"
              className="text-white hover:bg-green-700"
              buttonLabel="مشاركة"
            />
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-700" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
              <div className="text-xs text-muted-foreground">المهام</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{balance?.availableBalance || "0.00"}</div>
              <div className="text-xs text-muted-foreground">الرصيد المتاح</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <div className="text-xs text-muted-foreground">الطلبات</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats?.avgRating || 0}</div>
              <div className="text-xs text-muted-foreground">التقييم ({stats?.totalReviews || 0})</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" dir="rtl">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="tasks">المهام</TabsTrigger>
            <TabsTrigger value="templates">القوالب</TabsTrigger>
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="balance">المحفظة</TabsTrigger>
            <TabsTrigger value="posts">المنشورات</TabsTrigger>
            <TabsTrigger value="polls">التصويتات</TabsTrigger>
            <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">إدارة المهام</h2>
              <Button onClick={() => { resetTaskForm(); setEditingTask(null); setShowTaskModal(true); }} className="bg-green-600">
                <Plus className="h-4 w-4 ml-1" />
                مهمة جديدة
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لم يتم إضافة مهام بعد</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {tasks.map((task: Task) => (
                  <Card key={task.id} className="overflow-hidden">
                    {task.coverImageUrl && (
                      <img src={task.coverImageUrl} alt="" className="w-full h-32 object-cover" />
                    )}
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          {task.title && <h3 className="font-bold text-sm">{task.title}</h3>}
                          <p className="text-xs text-muted-foreground mt-1">{task.question}</p>
                        </div>
                        <Badge variant={task.isActive ? "default" : "secondary"}>
                          {task.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                      {task.subjectLabel && <Badge variant="outline" className="mt-2 text-xs">{task.subjectLabel}</Badge>}
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-green-600 font-bold">{task.price} ج.م</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{task.purchaseCount} شراء</span>
                        {task.imageUrl && <Image className="h-3 w-3 text-blue-500" />}
                        {task.videoUrl && <Video className="h-3 w-3 text-red-500" />}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditTask(task)}>
                          <Edit className="h-3 w-3 ml-1" />
                          تعديل
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm("هل تريد حذف هذه المهمة؟")) deleteTask.mutate(task.id); }}>
                          <Trash2 className="h-3 w-3 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <h2 className="text-lg font-bold">قوالب المهام الجاهزة</h2>
            <p className="text-sm text-muted-foreground">اختر مادة ثم اختر قالب لإنشاء مهمة جاهزة بسعرك</p>

            <div className="flex flex-wrap gap-2">
              {subjectsList.map((subj: any) => (
                <Button
                  key={subj.id}
                  size="sm"
                  variant={selectedSubjectId === subj.id ? "default" : "outline"}
                  onClick={() => setSelectedSubjectId(subj.id)}
                  className="gap-1"
                >
                  <span>{subj.emoji}</span>
                  {subj.name}
                </Button>
              ))}
            </div>

            {selectedSubjectId && templateTasks.length === 0 && (
              <Card><CardContent className="p-6 text-center text-muted-foreground">لا توجد قوالب لهذه المادة</CardContent></Card>
            )}

            {templateTasks.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                {templateTasks.map((tmpl: any) => (
                  <Card key={tmpl.id}>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-sm">{tmpl.title || tmpl.question}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{tmpl.question}</p>
                      <div className="mt-2 text-xs text-muted-foreground">{tmpl.answers?.length || 0} إجابات • {tmpl.pointsReward} نقطة</div>
                      <Button
                        size="sm"
                        className="mt-3 bg-green-600 gap-1"
                        onClick={() => {
                          setShowTemplateModal(true);
                          setTaskForm(f => ({
                            ...f,
                            title: tmpl.title || tmpl.question.substring(0, 60),
                            question: tmpl.question,
                            price: "",
                            subjectLabel: subjectsList.find((s: any) => s.id === tmpl.subjectId)?.name || "",
                          }));
                          setEditingTask(null);
                          // Store template ID for submission
                          (window as any).__selectedTemplateId = tmpl.id;
                        }}
                      >
                        <FileText className="h-3 w-3" />
                        استخدام القالب
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-lg font-bold">الطلبات</h2>
            {orders.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد طلبات بعد</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm">{order.taskQuestion || "مهمة"}</h3>
                          <p className="text-xs text-muted-foreground">المشتري: {order.childName || "طالب"}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-green-600">{order.teacherEarningAmount} ج.م</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {order.isSettled ? (
                              <><CheckCircle className="h-3 w-3 text-green-600" /> تم التسوية</>
                            ) : (
                              <><Clock className="h-3 w-3 text-yellow-600" /> معلق</>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Balance Tab */}
          <TabsContent value="balance" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">الرصيد المتاح</div>
                  <div className="text-2xl font-bold text-green-600">{balance?.availableBalance || "0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">الرصيد المعلق</div>
                  <div className="text-2xl font-bold text-yellow-600">{balance?.pendingBalance || "0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">إجمالي المسحوب</div>
                  <div className="text-2xl font-bold">{balance?.totalWithdrawnAmount || "0.00"}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-bold">طلبات السحب</h3>
              <Button onClick={() => setShowWithdrawModal(true)} className="bg-green-600">
                <ArrowDownToLine className="h-4 w-4 ml-1" />
                طلب سحب
              </Button>
            </div>

            {withdrawals.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">لا توجد طلبات سحب</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w: any) => (
                  <Card key={w.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{w.amount} ج.م</p>
                        <p className="text-xs text-muted-foreground">
                          صافي: {w.netAmount} ج.م (عمولة {w.withdrawalCommissionPct}%)
                        </p>
                      </div>
                      <Badge variant={w.status === "approved" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>
                        {w.status === "approved" ? "مقبول" : w.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">المنشورات</h2>
              <Button onClick={() => { setPostContent(""); setPostMediaFiles([]); setPostMediaPreviews([]); setShowPostModal(true); }} className="bg-green-600">
                <Plus className="h-4 w-4 ml-1" />
                منشور جديد
              </Button>
            </div>
            {posts.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد منشورات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post: Post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="text-sm whitespace-pre-wrap flex-1">{post.content}</p>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("حذف؟")) deletePost.mutate(post.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      {post.mediaUrls?.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {post.mediaUrls.map((url: string, i: number) => {
                            const mediaType = post.mediaTypes?.[i];
                            if (mediaType === "video") {
                              return <video key={i} src={url} controls className="w-48 h-32 rounded object-cover" />;
                            }
                            return <img key={i} src={url} alt="" className="w-24 h-24 rounded object-cover" />;
                          })}
                        </div>
                      )}
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>❤️ {post.likesCount}</span>
                        <span>💬 {post.commentsCount}</span>
                        <span>{new Date(post.createdAt).toLocaleDateString("ar")}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">التصويتات</h2>
              <Button onClick={() => { resetPollForm(); setShowPollModal(true); }} className="bg-green-600">
                <Plus className="h-4 w-4 ml-1" />
                إنشاء تصويت
              </Button>
            </div>

            {teacherPolls.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد تصويتات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {teacherPolls.map((poll: any) => {
                  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
                  return (
                    <Card key={poll.id} className={`overflow-hidden ${poll.isPinned ? "border-green-400 border-2" : ""}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-green-600" />
                            <h3 className="font-bold text-base">{poll.question}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            {poll.isPinned && <Badge variant="secondary">📌 مثبت</Badge>}
                            {poll.isClosed && <Badge variant="destructive">مغلق</Badge>}
                            {isExpired && !poll.isClosed && <Badge variant="outline">منتهي</Badge>}
                            {poll.isAnonymous && <Badge variant="outline">مجهول</Badge>}
                            {poll.allowMultiple && <Badge variant="outline">متعدد</Badge>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(poll.options || []).map((opt: any) => {
                            const count = poll.optionCounts?.[opt.id] || 0;
                            const pct = poll.votersCount > 0 ? Math.round((count / poll.votersCount) * 100) : 0;
                            return (
                              <div key={opt.id} className="relative">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="font-medium">{opt.text}</span>
                                  <span className="text-muted-foreground">{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>👥 {poll.votersCount} مصوّت</span>
                            <span>{new Date(poll.createdAt).toLocaleDateString("ar")}</span>
                            {poll.expiresAt && <span>⏰ {new Date(poll.expiresAt).toLocaleDateString("ar")}</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePoll.mutate({ id: poll.id, isPinned: !poll.isPinned })}
                              title={poll.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                            >
                              {poll.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updatePoll.mutate({ id: poll.id, isClosed: !poll.isClosed })}
                              title={poll.isClosed ? "فتح التصويت" : "إغلاق التصويت"}
                            >
                              {poll.isClosed ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-orange-600" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { if (confirm("حذف هذا التصويت؟")) deletePoll.mutate(poll.id); }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            {/* Cover Image */}
            <Card className="overflow-hidden">
              <div className="relative h-40 sm:h-48 md:h-56 bg-gradient-to-l from-green-500 to-green-700">
                {profile?.coverImageUrl && (
                  <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" />
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 left-2 gap-1 text-xs"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                >
                  <Camera className="h-3 w-3" />
                  {coverUploading ? "جاري الرفع..." : "تغيير الغلاف"}
                </Button>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelectTeacherImage(e, "cover")} />
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="relative -mt-12 sm:-mt-14">
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white object-cover shadow-lg bg-white" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white bg-green-100 flex items-center justify-center shadow-lg">
                        <User className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelectTeacherImage(e, "avatar")} />
                  </div>
                  <div className="flex-1 pt-2">
                    <h2 className="text-xl font-bold">{profile?.name}</h2>
                    <p className="text-sm text-muted-foreground">{profile?.subject || "لم يتم تحديد المادة"}</p>
                    <p className="text-sm text-muted-foreground">{profile?.schoolName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/teacher/${profile?.id}`, "_blank")}
                      className="gap-1"
                    >
                      <User className="h-3 w-3" />
                      عرض الصفحة العامة
                    </Button>
                    <ShareMenu
                      url={typeof window !== "undefined" ? `${window.location.origin}/teacher/${profile?.id || ""}` : ""}
                      title={`${profile?.name || "المعلم"} — Classify`}
                      description={profile?.bio || ""}
                    />
                    <Button
                      size="sm"
                      variant={profileEditMode ? "default" : "outline"}
                      onClick={() => {
                        if (!profileEditMode && profile) {
                          setProfileForm({
                            name: profile.name || "",
                            bio: profile.bio || "",
                            subject: profile.subject || "",
                            yearsExperience: profile.yearsExperience || 0,
                            socialLinks: profile.socialLinks || {},
                          });
                        }
                        setProfileEditMode(!profileEditMode);
                      }}
                      className="gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      {profileEditMode ? "إلغاء" : "تعديل"}
                    </Button>
                  </div>
                </div>

                {profile?.bio && !profileEditMode && (
                  <p className="mt-3 text-sm text-muted-foreground">{profile.bio}</p>
                )}

                {/* Profile Stats */}
                {!profileEditMode && (
                  <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                    <div><div className="text-lg font-bold">{profile?.stats?.tasksCount || 0}</div><div className="text-xs text-muted-foreground">مهمة</div></div>
                    <div><div className="text-lg font-bold">{profile?.stats?.studentsCount || 0}</div><div className="text-xs text-muted-foreground">طالب</div></div>
                    <div><div className="text-lg font-bold">{profile?.stats?.postsCount || 0}</div><div className="text-xs text-muted-foreground">منشور</div></div>
                    <div><div className="text-lg font-bold">{profile?.stats?.avgRating || 0}</div><div className="text-xs text-muted-foreground">تقييم</div></div>
                  </div>
                )}

                {/* Social Links Display */}
                {!profileEditMode && profile?.socialLinks && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(profile.socialLinks).filter(([, v]) => v).map(([key, value]) => (
                      <a key={key} href={value as string} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center gap-1 hover:bg-gray-200">
                        <Link2 className="h-3 w-3" />
                        {key}
                      </a>
                    ))}
                  </div>
                )}

                {/* Edit Form */}
                {profileEditMode && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label>الاسم</Label>
                      <Input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>نبذة عني</Label>
                      <Textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} />
                    </div>
                    <div>
                      <Label>المادة</Label>
                      <Input value={profileForm.subject} onChange={e => setProfileForm(f => ({ ...f, subject: e.target.value }))} />
                    </div>
                    <div>
                      <Label>سنوات الخبرة</Label>
                      <Input type="number" value={profileForm.yearsExperience} onChange={e => setProfileForm(f => ({ ...f, yearsExperience: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <Label>السوشيال ميديا</Label>
                      <div className="space-y-2 mt-1">
                        {["facebook", "instagram", "twitter", "youtube", "tiktok", "website"].map(platform => (
                          <div key={platform} className="flex items-center gap-2">
                            <span className="text-xs w-16 capitalize">{platform}</span>
                            <Input
                              placeholder={`رابط ${platform}`}
                              value={profileForm.socialLinks[platform] || ""}
                              onChange={e => setProfileForm(f => ({
                                ...f,
                                socialLinks: { ...f.socialLinks, [platform]: e.target.value },
                              }))}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-green-600"
                      onClick={() => updateProfile.mutate(profileForm)}
                      disabled={updateProfile.isPending}
                    >
                      حفظ التغييرات
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Modal - Enhanced with media */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "تعديل المهمة" : "مهمة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>عنوان المهمة</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="عنوان واضح للمهمة" />
            </div>
            <div>
              <Label>السؤال *</Label>
              <Textarea value={taskForm.question} onChange={e => setTaskForm(f => ({ ...f, question: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>السعر (ج.م) *</Label>
                <Input type="number" step="0.01" value={taskForm.price} onChange={e => setTaskForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>تصنيف المادة</Label>
                <Input value={taskForm.subjectLabel} onChange={e => setTaskForm(f => ({ ...f, subjectLabel: e.target.value }))} placeholder="مثال: رياضيات" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>الإجابات (حدد الصحيحة)</Label>
                <span className="text-xs text-muted-foreground">{taskForm.answers.length} إجابات</span>
              </div>
              <div className="space-y-3 mt-1">
                {taskForm.answers.map((answer, index) => (
                  <div key={answer.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={answer.isCorrect}
                        onChange={() => {
                          setTaskForm(f => ({
                            ...f,
                            answers: f.answers.map((a, i) => ({ ...a, isCorrect: i === index })),
                          }));
                        }}
                        className="accent-green-600"
                      />
                      <Input
                        placeholder={`إجابة ${index + 1}`}
                        value={answer.text}
                        onChange={e => {
                          setTaskForm(f => ({
                            ...f,
                            answers: f.answers.map((a, i) => i === index ? { ...a, text: e.target.value } : a),
                          }));
                        }}
                        className="flex-1"
                      />
                      {taskForm.answers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const removedId = answer.id;
                            setTaskForm(f => ({
                              ...f,
                              answers: f.answers.filter((_, i) => i !== index).map((a, i) => ({
                                ...a,
                                isCorrect: f.answers.filter((_, j) => j !== index).some(x => x.isCorrect) ? a.isCorrect : i === 0,
                              })),
                            }));
                            setAnswerMediaFiles(prev => { const n = { ...prev }; delete n[removedId]; return n; });
                            setAnswerMediaPreviews(prev => { const n = { ...prev }; delete n[removedId]; return n; });
                          }}
                          className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950"
                          title="حذف الإجابة"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {/* Answer media row */}
                    <div className="flex items-center gap-2 mr-6">
                      {/* Answer Image */}
                      {(answerMediaPreviews[answer.id]?.imageUrl || answer.imageUrl) ? (
                        <div className="relative">
                          <img src={answerMediaPreviews[answer.id]?.imageUrl || answer.imageUrl} alt="" className="w-14 h-14 rounded object-cover" />
                          <button onClick={() => {
                            setAnswerMediaPreviews(p => { const n = { ...p }; if (n[answer.id]) { delete n[answer.id].imageUrl; } return n; });
                            setAnswerMediaFiles(f => { const n = { ...f }; if (n[answer.id]) { delete n[answer.id].imageFile; } return n; });
                            setTaskForm(f => ({ ...f, answers: f.answers.map((a, i) => i === index ? { ...a, imageUrl: undefined } : a) }));
                          }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-2 w-2" /></button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1 px-2 py-1 border border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-xs text-muted-foreground">
                          <Image className="h-3 w-3" />
                          صورة
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAnswerMediaFiles(prev => ({ ...prev, [answer.id]: { ...prev[answer.id], imageFile: file } }));
                              setAnswerMediaPreviews(prev => ({ ...prev, [answer.id]: { ...prev[answer.id], imageUrl: URL.createObjectURL(file) } }));
                            }
                          }} />
                        </label>
                      )}
                      {/* Answer Video */}
                      {(answerMediaPreviews[answer.id]?.videoUrl || answer.videoUrl) ? (
                        <div className="relative">
                          <video src={answerMediaPreviews[answer.id]?.videoUrl || answer.videoUrl} className="w-14 h-14 rounded object-cover" />
                          <button onClick={() => {
                            setAnswerMediaPreviews(p => { const n = { ...p }; if (n[answer.id]) { delete n[answer.id].videoUrl; } return n; });
                            setAnswerMediaFiles(f => { const n = { ...f }; if (n[answer.id]) { delete n[answer.id].videoFile; } return n; });
                            setTaskForm(f => ({ ...f, answers: f.answers.map((a, i) => i === index ? { ...a, videoUrl: undefined } : a) }));
                          }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="h-2 w-2" /></button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1 px-2 py-1 border border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-xs text-muted-foreground">
                          <Video className="h-3 w-3" />
                          فيديو
                          <input type="file" accept="video/*" className="hidden" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAnswerMediaFiles(prev => ({ ...prev, [answer.id]: { ...prev[answer.id], videoFile: file } }));
                              setAnswerMediaPreviews(prev => ({ ...prev, [answer.id]: { ...prev[answer.id], videoUrl: URL.createObjectURL(file) } }));
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {taskForm.answers.length < 8 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full gap-1 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => {
                    const newId = `a${Date.now()}`;
                    setTaskForm(f => ({
                      ...f,
                      answers: [...f.answers, { id: newId, text: "", isCorrect: false, imageUrl: undefined, videoUrl: undefined }],
                    }));
                  }}
                >
                  <Plus className="h-3 w-3" />
                  إضافة إجابة
                </Button>
              )}
            </div>
            <div>
              <Label>شرح الإجابة (اختياري)</Label>
              <Textarea value={taskForm.explanation} onChange={e => setTaskForm(f => ({ ...f, explanation: e.target.value }))} />
            </div>

            {/* Question Images */}
            <div className="border-t pt-3">
              <Label className="text-sm font-bold">صور مع السؤال</Label>
              <p className="text-xs text-muted-foreground">أضف صور توضيحية أو صور فقط مع السؤال</p>
              <div className="flex gap-2 flex-wrap mt-2">
                {questionImagePreviews.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-20 h-20 rounded object-cover" />
                    <button onClick={() => {
                      setQuestionImagePreviews(p => p.filter((_, idx) => idx !== i));
                      // If it's a local file preview, also remove from files
                      if (url.startsWith("blob:")) {
                        const localIndex = i - questionImagePreviews.filter((u, idx) => idx < i && !u.startsWith("blob:")).length;
                        setQuestionImageFiles(f => f.filter((_, idx) => idx !== localIndex));
                        URL.revokeObjectURL(url);
                      }
                    }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">إضافة</span>
                  <input ref={questionImagesInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setQuestionImageFiles(prev => [...prev, ...files]);
                      setQuestionImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                    }
                  }} />
                </label>
              </div>
            </div>

            {/* Media Uploads */}
            <div className="border-t pt-3">
              <Label className="text-sm font-bold">الوسائط</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {/* Cover Image */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">صورة رئيسية</p>
                  {taskCoverPreview ? (
                    <div className="relative">
                      <img src={taskCoverPreview} alt="" className="w-full h-20 rounded object-cover" />
                      <button onClick={() => { setTaskCoverFile(null); setTaskCoverPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-1 p-3 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">غلاف</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setTaskCoverFile(f); setTaskCoverPreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  )}
                </div>
                {/* Task Image */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">صورة</p>
                  {taskImagePreview ? (
                    <div className="relative">
                      <img src={taskImagePreview} alt="" className="w-full h-20 rounded object-cover" />
                      <button onClick={() => { setTaskImageFile(null); setTaskImagePreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-1 p-3 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">صورة</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setTaskImageFile(f); setTaskImagePreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  )}
                </div>
                {/* Task Video */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">فيديو</p>
                  {taskVideoPreview ? (
                    <div className="relative">
                      <video src={taskVideoPreview} className="w-full h-20 rounded object-cover" />
                      <button onClick={() => { setTaskVideoFile(null); setTaskVideoPreview(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-1 p-3 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Video className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">فيديو</span>
                      <input type="file" accept="video/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setTaskVideoFile(f); setTaskVideoPreview(URL.createObjectURL(f)); }
                      }} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>إلغاء</Button>
            <Button className="bg-green-600" onClick={handleSubmitTask} disabled={taskUploading}>
              {taskUploading ? "جاري الرفع..." : editingTask ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Task Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء مهمة من قالب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
              <p className="text-sm font-bold">{taskForm.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{taskForm.question}</p>
            </div>
            <div>
              <Label>السعر (ج.م) *</Label>
              <Input type="number" step="0.01" value={taskForm.price} onChange={e => setTaskForm(f => ({ ...f, price: e.target.value }))} placeholder="حدد سعر المهمة" />
            </div>
            <div>
              <Label>العنوان (اختياري)</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>إلغاء</Button>
            <Button className="bg-green-600" onClick={() => {
              if (!taskForm.price) {
                toast({ title: "السعر مطلوب", variant: "destructive" });
                return;
              }
              createTaskFromTemplate.mutate({
                templateId: (window as any).__selectedTemplateId,
                price: taskForm.price,
                title: taskForm.title,
              });
            }} disabled={createTaskFromTemplate.isPending}>
              {createTaskFromTemplate.isPending ? "جاري الإنشاء..." : "إنشاء المهمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Modal - Enhanced with media */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>منشور جديد</DialogTitle></DialogHeader>
          <Textarea placeholder="اكتب محتوى المنشور..." value={postContent} onChange={e => setPostContent(e.target.value)} className="min-h-[100px]" />

          {/* Media previews */}
          {postMediaPreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {postMediaPreviews.map((media, i) => (
                <div key={i} className="relative">
                  {media.type === "video" ? (
                    <video src={media.url} className="w-20 h-20 rounded object-cover" />
                  ) : (
                    <img src={media.url} alt="" className="w-20 h-20 rounded object-cover" />
                  )}
                  <button onClick={() => removePostMedia(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => postMediaInputRef.current?.click()} className="gap-1">
              <Image className="h-4 w-4" />
              صورة
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "video/*";
              input.onchange = (e: any) => handlePostMediaSelect(e);
              input.click();
            }} className="gap-1">
              <Video className="h-4 w-4" />
              فيديو (30 ثانية كحد أقصى)
            </Button>
            <input ref={postMediaInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePostMediaSelect} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostModal(false)}>إلغاء</Button>
            <Button className="bg-green-600" onClick={handleSubmitPost} disabled={!postContent.trim() || postUploading || createPost.isPending}>
              {postUploading ? "جاري الرفع..." : "نشر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Poll Creation Modal */}
      <Dialog open={showPollModal} onOpenChange={setShowPollModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إنشاء تصويت جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>السؤال *</Label>
              <Input
                placeholder="ما سؤال التصويت؟"
                value={pollForm.question}
                onChange={(e) => setPollForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>الخيارات * (2-10)</Label>
              {pollForm.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`الخيار ${i + 1}`}
                    value={opt.text}
                    onChange={(e) => {
                      const newOpts = [...pollForm.options];
                      newOpts[i] = { text: e.target.value };
                      setPollForm((f) => ({ ...f, options: newOpts }));
                    }}
                  />
                  {pollForm.options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPollForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              {pollForm.options.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPollForm((f) => ({ ...f, options: [...f.options, { text: "" }] }))}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة خيار
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollForm.allowMultiple}
                  onChange={(e) => setPollForm((f) => ({ ...f, allowMultiple: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">السماح باختيار متعدد</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollForm.isAnonymous}
                  onChange={(e) => setPollForm((f) => ({ ...f, isAnonymous: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">تصويت مجهول</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollForm.isPinned}
                  onChange={(e) => setPollForm((f) => ({ ...f, isPinned: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">تثبيت التصويت</span>
              </label>
            </div>

            <div>
              <Label>تاريخ الانتهاء (اختياري)</Label>
              <Input
                type="datetime-local"
                value={pollForm.expiresAt}
                onChange={(e) => setPollForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPollModal(false)}>إلغاء</Button>
            <Button className="bg-green-600" onClick={handleSubmitPoll} disabled={createPoll.isPending}>
              {createPoll.isPending ? "جاري الإنشاء..." : "إنشاء التصويت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>طلب سحب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">الرصيد المتاح: <strong className="text-green-600">{balance?.availableBalance || "0.00"} ج.م</strong></p>
            <div>
              <Label>المبلغ (ج.م)</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="أدخل المبلغ المراد سحبه"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>إلغاء</Button>
            <Button className="bg-green-600" onClick={() => requestWithdrawal.mutate(parseFloat(withdrawAmount))} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}>
              إرسال الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => { setCropperOpen(false); setCropperImage(""); }}
        imageSrc={cropperImage}
        onCropComplete={handleCroppedTeacherImage}
        mode={cropperMode}
      />
    </div>
  );
}
