import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import ImageCropper from "@/components/ImageCropper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ShareMenu } from "@/components/ui/ShareMenu";
import {
  Copy,
  Edit,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  MapPin,
  LogOut,
  MessageSquare,
  Pin,
  PinOff,
  Plus,
  School,
  Send,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Loader2,
  BarChart3,
  Lock,
  Unlock,
  CheckCircle,
} from "lucide-react";

type SocialLinks = {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
};

interface Teacher {
  id: string;
  name: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  birthday: string | null;
  bio: string | null;
  subject: string | null;
  yearsExperience: number;
  username: string;
  monthlyRate: string | null;
  perTaskRate: string | null;
  pricingModel: string;
  socialLinks: SocialLinks | null;
  isActive: boolean;
  totalTasksSold: number;
  totalStudents: number;
  activityScore: number;
  createdAt: string;
}

interface Post {
  id: string;
  authorType: "school" | "teacher";
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  isActive: boolean;
  teacherName?: string;
  teacherAvatar?: string;
  createdAt: string;
}

interface SchoolProfile {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  governorate?: string | null;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  referralCode: string;
  socialLinks?: SocialLinks | null;
  stats: {
    teachersCount: number;
    studentsCount: number;
    postsCount: number;
    reviewsCount: number;
    avgRating: number;
  };
}

interface SchoolStats {
  activityScore: number;
  totalTeachers: number;
  activeTeachers: number;
  totalStudents: number;
  totalPosts: number;
  totalReviews: number;
  avgRating: number;
}

interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface PostComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface Poll {
  id: string;
  authorType: "school" | "teacher";
  question: string;
  options: { id: string; text: string; imageUrl?: string }[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  isPinned: boolean;
  isClosed: boolean;
  expiresAt: string | null;
  totalVotes: number;
  isActive: boolean;
  optionCounts: Record<string, number>;
  votersCount: number;
  createdAt: string;
}

const emptySocial = { facebook: "", twitter: "", instagram: "", youtube: "", tiktok: "", website: "" };

const PAGE_SIZE = 10;

function getActivityLabel(action: string) {
  const map: Record<string, string> = {
    teacher_added: "تمت إضافة معلم",
    teacher_updated: "تم تحديث بيانات معلم",
    teacher_transferred_out: "تم نقل معلم لمدرسة أخرى",
    teacher_transferred_in: "تم استقبال معلم من مدرسة أخرى",
    post_created: "تم إنشاء منشور",
    profile_updated: "تم تحديث ملف المدرسة",
  };
  return map[action] || action;
}

export default function SchoolDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem("schoolToken");
  const schoolData = JSON.parse(localStorage.getItem("schoolData") || "{}");

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingProfileCover, setUploadingProfileCover] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [cropperMode, setCropperMode] = useState<"avatar" | "cover">("avatar");
  const [pendingPostFiles, setPendingPostFiles] = useState<File[]>([]);
  const [pendingPostPreviews, setPendingPostPreviews] = useState<{ url: string; type: string }[]>([]);
  const [publishingPost, setPublishingPost] = useState(false);
  const [studentsPage, setStudentsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentsSearch, setStudentsSearch] = useState("");
  const [reviewsSearch, setReviewsSearch] = useState("");
  const [debouncedTeacherSearch, setDebouncedTeacherSearch] = useState("");
  const [debouncedStudentsSearch, setDebouncedStudentsSearch] = useState("");
  const [debouncedReviewsSearch, setDebouncedReviewsSearch] = useState("");
  const [teacherSort, setTeacherSort] = useState<"newest" | "oldest" | "mostActive" | "mostStudents">("newest");
  const [studentsSort, setStudentsSort] = useState<"newest" | "oldest" | "nameAsc" | "nameDesc">("newest");
  const [reviewsSort, setReviewsSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [showCommentsByPost, setShowCommentsByPost] = useState<Record<string, boolean>>({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTeacherId, setTransferTeacherId] = useState<string | null>(null);
  const [transferTeacherName, setTransferTeacherName] = useState("");
  const [transferForm, setTransferForm] = useState({ toSchoolId: "", performanceRating: 0, performanceComment: "", reason: "" });
  const [commentInputByPost, setCommentInputByPost] = useState<Record<string, string>>({});
  const [commentsLoadingByPost, setCommentsLoadingByPost] = useState<Record<string, boolean>>({});

  // Poll state
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollForm, setPollForm] = useState({
    question: "",
    options: [{ text: "", imageUrl: "" }, { text: "", imageUrl: "" }] as { text: string; imageUrl: string }[],
    allowMultiple: false,
    isAnonymous: false,
    isPinned: false,
    expiresAt: "",
  });
  const [uploadingPollOptionIdx, setUploadingPollOptionIdx] = useState<number | null>(null);

  const [teacherForm, setTeacherForm] = useState({
    name: "",
    username: "",
    password: "",
    avatarUrl: "",
    coverImageUrl: "",
    birthday: "",
    bio: "",
    subject: "",
    yearsExperience: 0,
    monthlyRate: "",
    perTaskRate: "",
    pricingModel: "per_task",
    socialLinks: { ...emptySocial },
    isActive: true,
  });

  const [profileForm, setProfileForm] = useState({
    name: "",
    nameAr: "",
    description: "",
    address: "",
    city: "",
    governorate: "",
    imageUrl: "",
    coverImageUrl: "",
    phoneNumber: "",
    email: "",
    socialLinks: { ...emptySocial },
  });

  const [postForm, setPostForm] = useState({
    content: "",
    isPinned: false,
    mediaUrls: [] as string[],
    mediaTypes: [] as string[],
  });

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      pendingPostPreviews.forEach((p) => {
        if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
      });
    };
  }, []);

  useEffect(() => {
    if (!token) setLocation("/school/login");
  }, [token, setLocation]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTeacherSearch(teacherSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [teacherSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedStudentsSearch(studentsSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [studentsSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedReviewsSearch(reviewsSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [reviewsSearch]);

  useEffect(() => {
    setStudentsPage(1);
  }, [debouncedStudentsSearch]);

  useEffect(() => {
    setReviewsPage(1);
  }, [debouncedReviewsSearch]);

  const { data: profile } = useQuery<SchoolProfile>({
    queryKey: ["school-profile"],
    queryFn: async () => {
      const res = await fetch("/api/school/profile", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery<SchoolStats>({
    queryKey: ["school-stats"],
    queryFn: async () => {
      const res = await fetch("/api/school/stats", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: teachers = [], isFetching: isTeachersFetching } = useQuery<Teacher[]>({
    queryKey: ["school-teachers", debouncedTeacherSearch, teacherSort],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedTeacherSearch,
        sort: teacherSort,
      });
      const res = await fetch(`/api/school/teachers?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch teachers");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: feed = [] } = useQuery<Post[]>({
    queryKey: ["school-feed"],
    queryFn: async () => {
      const res = await fetch("/api/school/feed", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch feed");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: studentsRes, isFetching: isStudentsFetching } = useQuery<PagedResult<any>>({
    queryKey: ["school-students", debouncedStudentsSearch, studentsSort, studentsPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedStudentsSearch,
        sort: studentsSort,
        page: String(studentsPage),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/school/students?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch students");
      const body = await res.json();
      return {
        data: body.data || [],
        total: body.total || 0,
        page: body.page || 1,
        limit: body.limit || PAGE_SIZE,
      };
    },
    enabled: !!token,
  });

  const { data: reviewsRes, isFetching: isReviewsFetching } = useQuery<PagedResult<any>>({
    queryKey: ["school-reviews", debouncedReviewsSearch, reviewsSort, reviewsPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedReviewsSearch,
        sort: reviewsSort,
        page: String(reviewsPage),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/school/reviews?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const body = await res.json();
      return {
        data: body.data || [],
        total: body.total || 0,
        page: body.page || 1,
        limit: body.limit || PAGE_SIZE,
      };
    },
    enabled: !!token,
  });

  const { data: activity = [] } = useQuery<any[]>({
    queryKey: ["school-activity"],
    queryFn: async () => {
      const res = await fetch("/api/school/activity", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const { data: polls = [] } = useQuery<Poll[]>({
    queryKey: ["school-polls"],
    queryFn: async () => {
      const res = await fetch("/api/school/polls", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to fetch polls");
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const students = studentsRes?.data || [];
  const studentsPagesCount = Math.max(1, Math.ceil((studentsRes?.total || 0) / PAGE_SIZE));

  const reviews = reviewsRes?.data || [];
  const reviewsPagesCount = Math.max(1, Math.ceil((reviewsRes?.total || 0) / PAGE_SIZE));

  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/school/profile", {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-profile"] });
      toast({ title: "تم تحديث بيانات المدرسة" });
      setShowProfileModal(false);
    },
    onError: (err: any) => toast({ title: err.message || "فشل التحديث", variant: "destructive" }),
  });

  const createTeacher = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/school/teachers", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      setShowTeacherModal(false);
      setEditingTeacher(null);
      resetTeacherForm();
      toast({ title: "تم إضافة المعلم" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل إضافة المعلم", variant: "destructive" }),
  });

  const updateTeacher = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/school/teachers/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      setShowTeacherModal(false);
      setEditingTeacher(null);
      resetTeacherForm();
      toast({ title: "تم تحديث بيانات المعلم" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل تحديث المعلم", variant: "destructive" }),
  });

  const deleteTeacher = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/school/teachers/${id}`, { method: "DELETE", headers: authHeaders });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      toast({ title: "تم حذف المعلم" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل حذف المعلم", variant: "destructive" }),
  });

  const { data: availableSchools = [] } = useQuery<{ id: string; name: string; imageUrl: string | null; isActive: boolean; isVerified: boolean }[]>({
    queryKey: ["available-schools"],
    queryFn: async () => {
      const res = await fetch("/api/school/available-schools", { headers: authHeaders });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data || [];
    },
    enabled: showTransferModal,
  });

  const transferTeacher = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/school/teachers/${id}/transfer`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      setShowTransferModal(false);
      setTransferTeacherId(null);
      setTransferForm({ toSchoolId: "", performanceRating: 0, performanceComment: "", reason: "" });
      toast({ title: "تم نقل المعلم بنجاح" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل نقل المعلم", variant: "destructive" }),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/school/posts/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-feed"] });
      resetPostForm();
      setEditingPost(null);
      setShowPostModal(false);
      toast({ title: "تم تحديث المنشور" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل تحديث المنشور", variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/school/posts/${id}`, { method: "DELETE", headers: authHeaders });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-feed"] });
      queryClient.invalidateQueries({ queryKey: ["school-stats"] });
      toast({ title: "تم حذف المنشور" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل حذف المنشور", variant: "destructive" }),
  });

  const addPostComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const res = await fetch(`/api/store/schools/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: profile?.name || "المدرسة",
          content,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: async (_data, vars) => {
      setCommentInputByPost((prev) => ({ ...prev, [vars.postId]: "" }));
      await loadPostComments(vars.postId);
      queryClient.invalidateQueries({ queryKey: ["school-feed"] });
      toast({ title: "تم إرسال الرد" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل إرسال الرد", variant: "destructive" }),
  });

  const createPoll = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/school/polls", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-polls"] });
      setShowPollModal(false);
      resetPollForm();
      toast({ title: "تم إنشاء التصويت" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل إنشاء التصويت", variant: "destructive" }),
  });

  const updatePoll = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const res = await fetch(`/api/school/polls/${id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-polls"] });
      toast({ title: "تم تحديث التصويت" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل التحديث", variant: "destructive" }),
  });

  const deletePoll = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/school/polls/${id}`, { method: "DELETE", headers: authHeaders });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-polls"] });
      toast({ title: "تم حذف التصويت" });
    },
    onError: (err: any) => toast({ title: err.message || "فشل الحذف", variant: "destructive" }),
  });

  function cleanSocialLinks(input: any): SocialLinks | null {
    const trimmed = {
      facebook: input.facebook?.trim() || "",
      twitter: input.twitter?.trim() || "",
      instagram: input.instagram?.trim() || "",
      youtube: input.youtube?.trim() || "",
      tiktok: input.tiktok?.trim() || "",
      website: input.website?.trim() || "",
    };
    const hasAny = Object.values(trimmed).some(Boolean);
    return hasAny ? trimmed : null;
  }

  function resetTeacherForm() {
    setTeacherForm({
      name: "",
      username: "",
      password: "",
      avatarUrl: "",
      coverImageUrl: "",
      birthday: "",
      bio: "",
      subject: "",
      yearsExperience: 0,
      monthlyRate: "",
      perTaskRate: "",
      pricingModel: "per_task",
      socialLinks: { ...emptySocial },
      isActive: true,
    });
  }

  function resetPostForm() {
    // Revoke blob URLs before clearing
    pendingPostPreviews.forEach((p) => {
      if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
    });
    setPostForm({ content: "", isPinned: false, mediaUrls: [], mediaTypes: [] });
    setPendingPostFiles([]);
    setPendingPostPreviews([]);
  }

  function resetPollForm() {
    setPollForm({
      question: "",
      options: [{ text: "", imageUrl: "" }, { text: "", imageUrl: "" }],
      allowMultiple: false,
      isAnonymous: false,
      isPinned: false,
      expiresAt: "",
    });
    setUploadingPollOptionIdx(null);
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
      options: validOptions.map((o) => ({ text: o.text.trim(), ...(o.imageUrl ? { imageUrl: o.imageUrl } : {}) })),
      allowMultiple: pollForm.allowMultiple,
      isAnonymous: pollForm.isAnonymous,
      isPinned: pollForm.isPinned,
      expiresAt: pollForm.expiresAt || null,
    });
  }

  function openEditTeacher(teacher: Teacher) {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      username: teacher.username,
      password: "",
      avatarUrl: teacher.avatarUrl || "",
      coverImageUrl: teacher.coverImageUrl || "",
      birthday: teacher.birthday || "",
      bio: teacher.bio || "",
      subject: teacher.subject || "",
      yearsExperience: teacher.yearsExperience || 0,
      monthlyRate: teacher.monthlyRate || "",
      perTaskRate: teacher.perTaskRate || "",
      pricingModel: teacher.pricingModel || "per_task",
      socialLinks: {
        ...emptySocial,
        ...(teacher.socialLinks || {}),
      },
      isActive: teacher.isActive,
    });
    setShowTeacherModal(true);
  }

  function openEditProfile() {
    if (!profile) return;
    setProfileForm({
      name: profile.name || "",
      nameAr: profile.nameAr || "",
      description: profile.description || "",
      address: profile.address || "",
      city: profile.city || "",
      governorate: profile.governorate || "",
      imageUrl: profile.imageUrl || "",
      coverImageUrl: profile.coverImageUrl || "",
      phoneNumber: profile.phoneNumber || "",
      email: profile.email || "",
      socialLinks: { ...emptySocial, ...(profile.socialLinks || {}) },
    });
    setShowProfileModal(true);
  }

  function openEditPost(post: Post) {
    setEditingPost(post);
    setPostForm({
      content: post.content,
      isPinned: post.isPinned,
      mediaUrls: post.mediaUrls || [],
      mediaTypes: post.mediaTypes || [],
    });
    setShowPostModal(true);
  }

  async function loadPostComments(postId: string) {
    try {
      setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: true }));
      const res = await fetch(`/api/store/schools/posts/${postId}/comments`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed");
      setCommentsByPost((prev) => ({ ...prev, [postId]: body.data || [] }));
    } catch (error: any) {
      toast({ title: error.message || "فشل تحميل التعليقات", variant: "destructive" });
    } finally {
      setCommentsLoadingByPost((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function togglePostComments(postId: string) {
    const next = !showCommentsByPost[postId];
    setShowCommentsByPost((prev) => ({ ...prev, [postId]: next }));
    if (next && !commentsByPost[postId]) {
      await loadPostComments(postId);
    }
  }

  async function uploadFileToStorage(file: File): Promise<{ url: string; objectPath: string }> {
    const presignRes = await fetch("/api/school/uploads/presign", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: file.type,
        size: file.size,
        purpose: "task_media",
        originalName: file.name,
      }),
    });
    const presignBody = await presignRes.json();
    if (!presignRes.ok) throw new Error(presignBody.message || "فشل إنشاء رابط الرفع");

    const { uploadURL, objectPath } = presignBody.data;

    // If uploadURL is a local relative path, PUT directly; otherwise use proxy
    const isLocalUrl = uploadURL.startsWith("/api/");
    if (isLocalUrl) {
      const directRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const directBody = await directRes.json();
      if (!directRes.ok) throw new Error(directBody.message || "فشل رفع الملف");
    } else {
      const proxyRes = await fetch("/api/school/uploads/proxy", {
        method: "PUT",
        headers: {
          ...authHeaders,
          "x-upload-url": uploadURL,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      const proxyBody = await proxyRes.json();
      if (!proxyRes.ok) throw new Error(proxyBody.message || "فشل رفع الملف");
    }

    const finalizeRes = await fetch("/api/school/uploads/finalize", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        objectPath,
        mimeType: file.type,
        size: file.size,
        originalName: file.name,
        purpose: "task_media",
      }),
    });
    const finalizeBody = await finalizeRes.json();
    if (!finalizeRes.ok) throw new Error(finalizeBody.message || "فشل تأكيد رفع الملف");

    return {
      url: finalizeBody.data.url,
      objectPath,
    };
  }

  async function uploadFileForPost(file: File): Promise<{ url: string; type: string }> {
    const { url } = await uploadFileToStorage(file);
    return {
      url,
      type: file.type.startsWith("video/") ? "video" : "image",
    };
  }

  async function uploadSchoolImage(file: File): Promise<string> {
    const { url } = await uploadFileToStorage(file);
    return url;
  }

  function handleSelectSchoolProfileImage(file: File | undefined, type: "avatar" | "cover") {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "يرجى اختيار صورة فقط", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    setCropperMode(type);
    setCropperOpen(true);
  }

  async function handleCroppedImageUpload(blob: Blob) {
    const type = cropperMode;
    const file = new File([blob], `profile-${type}.jpg`, { type: "image/jpeg" });

    if (type === "avatar") setUploadingProfileImage(true);
    if (type === "cover") setUploadingProfileCover(true);

    try {
      const url = await uploadSchoolImage(file);
      setProfileForm((prev) => ({
        ...prev,
        imageUrl: type === "avatar" ? url : prev.imageUrl,
        coverImageUrl: type === "cover" ? url : prev.coverImageUrl,
      }));
      toast({ title: type === "avatar" ? "تم رفع صورة المدرسة" : "تم رفع صورة الغلاف" });
    } catch (error: any) {
      toast({ title: error.message || "فشل رفع الصورة", variant: "destructive" });
    } finally {
      if (type === "avatar") setUploadingProfileImage(false);
      if (type === "cover") setUploadingProfileCover(false);
    }
  }

  function handlePostMediaSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video/") ? "video" : "image",
    }));
    setPendingPostFiles((prev) => [...prev, ...newFiles]);
    setPendingPostPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removePostMedia(index: number) {
    // Check if it's a pending file (not yet uploaded) or already uploaded URL
    const totalUploaded = postForm.mediaUrls.length;
    if (index < totalUploaded) {
      // Remove from already uploaded
      setPostForm((prev) => ({
        ...prev,
        mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
        mediaTypes: prev.mediaTypes.filter((_, i) => i !== index),
      }));
    } else {
      // Remove from pending files
      const pendingIndex = index - totalUploaded;
      const preview = pendingPostPreviews[pendingIndex];
      if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
      setPendingPostFiles((prev) => prev.filter((_, i) => i !== pendingIndex));
      setPendingPostPreviews((prev) => prev.filter((_, i) => i !== pendingIndex));
    }
  }

  function handleSubmitTeacher() {
    if (!teacherForm.name || !teacherForm.username || (!editingTeacher && !teacherForm.password)) {
      toast({ title: "الاسم واسم المستخدم وكلمة المرور مطلوبة", variant: "destructive" });
      return;
    }

    const payload = {
      name: teacherForm.name,
      username: teacherForm.username,
      password: teacherForm.password || undefined,
      avatarUrl: teacherForm.avatarUrl || null,
      coverImageUrl: teacherForm.coverImageUrl || null,
      birthday: teacherForm.birthday || null,
      bio: teacherForm.bio || null,
      subject: teacherForm.subject || null,
      yearsExperience: teacherForm.yearsExperience || 0,
      monthlyRate: teacherForm.monthlyRate || null,
      perTaskRate: teacherForm.perTaskRate || null,
      pricingModel: teacherForm.pricingModel,
      socialLinks: cleanSocialLinks(teacherForm.socialLinks),
      isActive: teacherForm.isActive,
    };

    if (editingTeacher) {
      updateTeacher.mutate({ id: editingTeacher.id, ...payload });
      return;
    }

    createTeacher.mutate(payload);
  }

  function handleSubmitPost() {
    const hasContent = postForm.content.trim().length > 0;
    const hasExistingMedia = postForm.mediaUrls.length > 0;
    const hasPendingFiles = pendingPostFiles.length > 0;

    if (!hasContent && !hasExistingMedia && !hasPendingFiles) {
      toast({ title: "أضف محتوى أو وسائط", variant: "destructive" });
      return;
    }

    // Capture form state before closing
    const capturedContent = postForm.content;
    const capturedIsPinned = postForm.isPinned;
    const capturedExistingUrls = [...postForm.mediaUrls];
    const capturedExistingTypes = [...postForm.mediaTypes];
    const capturedFiles = [...pendingPostFiles];
    const capturedEditingPost = editingPost;

    // Close modal immediately so user can browse
    setShowPostModal(false);
    setEditingPost(null);
    resetPostForm();
    setPublishingPost(true);

    toast({ title: "جاري نشر المنشور في الخلفية..." });

    // Background upload + publish
    (async () => {
      try {
        // Upload pending files
        let uploadedUrls = capturedExistingUrls;
        let uploadedTypes = capturedExistingTypes;

        if (capturedFiles.length > 0) {
          const results = await Promise.all(capturedFiles.map(uploadFileForPost));
          uploadedUrls = [...capturedExistingUrls, ...results.map((r) => r.url)];
          uploadedTypes = [...capturedExistingTypes, ...results.map((r) => r.type)];
        }

        const payload = {
          content: capturedContent,
          mediaUrls: uploadedUrls,
          mediaTypes: uploadedTypes,
          isPinned: capturedIsPinned,
        };

        let res: Response;
        if (capturedEditingPost) {
          res = await fetch(`/api/school/posts/${capturedEditingPost.id}`, {
            method: "PUT",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch("/api/school/posts", {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        const body = await res.json();
        if (!res.ok) throw new Error(body.message || "فشل نشر المنشور");

        queryClient.invalidateQueries({ queryKey: ["school-feed"] });
        queryClient.invalidateQueries({ queryKey: ["school-stats"] });
        toast({ title: capturedEditingPost ? "✅ تم تحديث المنشور بنجاح" : "✅ تم نشر المنشور بنجاح" });
      } catch (error: any) {
        toast({ title: error.message || "فشل نشر المنشور", variant: "destructive" });
      } finally {
        setPublishingPost(false);
      }
    })();
  }

  function handleSubmitProfile() {
    if (!profileForm.name.trim()) {
      toast({ title: "اسم المدرسة مطلوب", variant: "destructive" });
      return;
    }

    updateProfile.mutate({
      ...profileForm,
      name: profileForm.name.trim(),
      nameAr: profileForm.nameAr.trim() || null,
      description: profileForm.description.trim() || null,
      address: profileForm.address.trim() || null,
      city: profileForm.city.trim() || null,
      governorate: profileForm.governorate.trim() || null,
      imageUrl: profileForm.imageUrl.trim() || null,
      coverImageUrl: profileForm.coverImageUrl.trim() || null,
      phoneNumber: profileForm.phoneNumber.trim() || null,
      email: profileForm.email.trim() || null,
      socialLinks: cleanSocialLinks(profileForm.socialLinks),
    });
  }

  function handleLogout() {
    localStorage.removeItem("schoolToken");
    localStorage.removeItem("schoolData");
    setLocation("/school/login");
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Background publishing indicator */}
      {publishingPost && (
        <div className="fixed bottom-4 left-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">جاري نشر المنشور...</span>
        </div>
      )}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full relative overflow-hidden flex items-center justify-center bg-blue-700 flex-shrink-0">
              <School className="h-6 w-6" />
              {profile?.imageUrl && (
                <img src={profile.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              )}
            </div>
            <div>
              <h1 className="font-bold text-lg">{profile?.name || schoolData.name}</h1>
              <p className="text-blue-100 text-xs">لوحة تحكم المدرسة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={openEditProfile}>
              <Edit className="h-4 w-4 ml-1" />
              تعديل المدرسة
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700"
              onClick={() => {
                navigator.clipboard.writeText(profile?.referralCode || "");
                toast({ title: "تم نسخ كود الإحالة" });
              }}
            >
              <Copy className="h-4 w-4 ml-1" />
              {profile?.referralCode}
            </Button>
            <ShareMenu
              url={typeof window !== "undefined" ? `${window.location.origin}/school/${profile?.id || ""}` : ""}
              title={`${profile?.nameAr || profile?.name || "المدرسة"} — Classify`}
              description={profile?.description || `تعرّف على المدرسة على منصة Classify`}
              variant="ghost"
              className="text-white hover:bg-blue-700"
              buttonLabel="مشاركة"
            />
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
              <div className="text-xs text-muted-foreground">المعلمين ({stats?.activeTeachers || 0} نشط)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              <div className="text-xs text-muted-foreground">الطلاب</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
              <div className="text-xs text-muted-foreground">المنشورات</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats?.avgRating || 0}</div>
              <div className="text-xs text-muted-foreground">التقييم ({stats?.totalReviews || 0})</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-rose-600" />
              <div className="text-2xl font-bold">{stats?.activityScore || 0}</div>
              <div className="text-xs text-muted-foreground">نقاط النشاط</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="teachers" dir="rtl">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="teachers">المعلمين</TabsTrigger>
            <TabsTrigger value="posts">المنشورات</TabsTrigger>
            <TabsTrigger value="polls">التصويتات</TabsTrigger>
            <TabsTrigger value="students">الطلاب</TabsTrigger>
            <TabsTrigger value="reviews">التقييمات</TabsTrigger>
            <TabsTrigger value="activity">النشاط</TabsTrigger>
            <TabsTrigger value="profile">الصفحة الشخصية</TabsTrigger>
          </TabsList>

          <TabsContent value="teachers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">إدارة المعلمين</h2>
              <Button onClick={() => { setEditingTeacher(null); resetTeacherForm(); setShowTeacherModal(true); }} className="bg-blue-600">
                <Plus className="h-4 w-4 ml-1" />
                إضافة معلم
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              <Input
                placeholder="بحث بالاسم أو اسم المستخدم أو التخصص..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={teacherSort}
                onChange={(e) => setTeacherSort(e.target.value as any)}
              >
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
                <option value="mostActive">الأكثر نشاطًا</option>
                <option value="mostStudents">الأكثر طلابًا</option>
              </select>
            </div>
            {isTeachersFetching && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                جارِ تحديث نتائج المعلمين...
              </div>
            )}

            {teachers.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لم يتم إضافة معلمين بعد</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {teachers.map((teacher) => (
                  <Card key={teacher.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full relative overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="h-6 w-6 text-blue-600" />
                            {teacher.avatarUrl && (
                              <img src={teacher.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold">{teacher.name}</h3>
                            <p className="text-sm text-muted-foreground">{teacher.subject || "بدون تخصص"}</p>
                            <p className="text-xs text-muted-foreground">@{teacher.username}</p>
                          </div>
                        </div>
                        <Badge variant={teacher.isActive ? "default" : "secondary"}>
                          {teacher.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{teacher.totalTasksSold} مهمة مباعة</span>
                        <span>{teacher.totalStudents} طالب</span>
                        <span>{teacher.yearsExperience} سنة خبرة</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditTeacher(teacher)}>
                          <Edit className="h-3 w-3 ml-1" />
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant={teacher.isActive ? "secondary" : "default"}
                          onClick={() => updateTeacher.mutate({ id: teacher.id, isActive: !teacher.isActive })}
                        >
                          {teacher.isActive ? "تعطيل" : "تفعيل"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => {
                            setTransferTeacherId(teacher.id);
                            setTransferTeacherName(teacher.name);
                            setTransferForm({ toSchoolId: "", performanceRating: 0, performanceComment: "", reason: "" });
                            setShowTransferModal(true);
                          }}
                        >
                          <Send className="h-3 w-3 ml-1" />
                          نقل
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">المنشورات</h2>
              <Button onClick={() => { setEditingPost(null); resetPostForm(); setShowPostModal(true); }} className="bg-blue-600">
                <Plus className="h-4 w-4 ml-1" />
                منشور جديد
              </Button>
            </div>

            {feed.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد منشورات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {[...feed].sort((a, b) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }).map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={post.authorType === "school" ? "default" : "secondary"}>
                            {post.authorType === "school" ? "المدرسة" : post.teacherName || "معلم"}
                          </Badge>
                          {post.isPinned && <Badge variant="outline">مثبت</Badge>}
                        </div>

                        {post.authorType === "school" && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditPost(post)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updatePost.mutate({ id: post.id, isPinned: !post.isPinned })}
                            >
                              {post.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("هل تريد حذف هذا المنشور؟")) deletePost.mutate(post.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {post.content && <p className="text-sm whitespace-pre-wrap">{post.content}</p>}

                      {post.mediaUrls?.length > 0 && (
                        <div className={`${post.mediaUrls.length === 1 ? "" : "grid grid-cols-2 md:grid-cols-3 gap-2"}`}>
                          {post.mediaUrls.map((url, i) => (
                            post.mediaTypes?.[i] === "video" ? (
                              <video key={i} src={url} controls className={`w-full rounded bg-black ${post.mediaUrls.length === 1 ? "max-h-[500px] object-contain" : "h-48 object-cover"}`} />
                            ) : (
                              <img key={i} src={url} alt="" className={`w-full rounded bg-gray-100 ${post.mediaUrls.length === 1 ? "max-h-[500px] object-contain" : "h-48 object-cover"}`} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                        <span className="flex items-center gap-1">
                          {post.likesCount > 0 && <><span className="bg-blue-600 text-white rounded-full p-0.5 inline-flex"><Heart className="h-2.5 w-2.5 fill-white" /></span> {post.likesCount}</>}
                        </span>
                        <button
                          onClick={() => togglePostComments(post.id)}
                          className="hover:underline cursor-pointer"
                        >
                          💬 {post.commentsCount} تعليق
                        </button>
                        <span>{new Date(post.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {/* Comments section */}
                      {showCommentsByPost[post.id] && (
                        <div className="border-t pt-2 space-y-2">
                          {commentsLoadingByPost[post.id] ? (
                            <div className="text-center text-xs text-muted-foreground py-2">جاري التحميل...</div>
                          ) : commentsByPost[post.id]?.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {commentsByPost[post.id].map((c) => (
                                <div key={c.id} className="flex items-start gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                    <Users className="h-3.5 w-3.5 text-gray-500" />
                                  </div>
                                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-1.5">
                                    <p className="text-xs font-bold">{c.authorName}</p>
                                    <p className="text-sm">{c.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="اكتب رداً..."
                              value={commentInputByPost[post.id] || ""}
                              onChange={(e) => setCommentInputByPost((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              className="text-sm rounded-full bg-gray-100 dark:bg-gray-800 border-0 h-9"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && commentInputByPost[post.id]?.trim()) {
                                  addPostComment.mutate({ postId: post.id, content: commentInputByPost[post.id] });
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0 h-9 w-9"
                              disabled={!commentInputByPost[post.id]?.trim()}
                              onClick={() => {
                                if (commentInputByPost[post.id]?.trim()) {
                                  addPostComment.mutate({ postId: post.id, content: commentInputByPost[post.id] });
                                }
                              }}
                            >
                              <Send className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <h2 className="text-lg font-bold">الطلاب المسجلين</h2>
            <div className="grid md:grid-cols-2 gap-2">
              <Input
                placeholder="بحث باسم الطالب أو ولي الأمر..."
                value={studentsSearch}
                onChange={(e) => {
                  setStudentsSearch(e.target.value);
                  setStudentsPage(1);
                }}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={studentsSort}
                onChange={(e) => {
                  setStudentsSort(e.target.value as any);
                  setStudentsPage(1);
                }}
              >
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
                <option value="nameAsc">الاسم (أ-ي)</option>
                <option value="nameDesc">الاسم (ي-أ)</option>
              </select>
            </div>
            {isStudentsFetching && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                جارِ تحديث نتائج الطلاب...
              </div>
            )}
            {students.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد طلاب مسجلين بعد</CardContent></Card>
            ) : (
              <>
              <div className="grid md:grid-cols-2 gap-4">
                {students.map((student) => (
                  <Card key={student.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full relative overflow-hidden bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-green-600" />
                          {student.childAvatar && (
                            <img src={student.childAvatar} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold">{student.childName || "طالب"}</h3>
                          <p className="text-sm text-muted-foreground">ولي الأمر: {student.parentName || "—"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(student.createdAt).toLocaleDateString("ar")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={studentsPage <= 1} onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}>السابق</Button>
                <span className="text-sm text-muted-foreground">صفحة {studentsPage} من {studentsPagesCount}</span>
                <Button variant="outline" size="sm" disabled={studentsPage >= studentsPagesCount} onClick={() => setStudentsPage((p) => Math.min(studentsPagesCount, p + 1))}>التالي</Button>
              </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <h2 className="text-lg font-bold">التقييمات</h2>
            <div className="grid md:grid-cols-2 gap-2">
              <Input
                placeholder="بحث باسم ولي الأمر أو نص التقييم..."
                value={reviewsSearch}
                onChange={(e) => {
                  setReviewsSearch(e.target.value);
                  setReviewsPage(1);
                }}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={reviewsSort}
                onChange={(e) => {
                  setReviewsSort(e.target.value as any);
                  setReviewsPage(1);
                }}
              >
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
                <option value="highest">الأعلى تقييمًا</option>
                <option value="lowest">الأقل تقييمًا</option>
              </select>
            </div>
            {isReviewsFetching && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                جارِ تحديث نتائج التقييمات...
              </div>
            )}
            {reviews.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد تقييمات بعد</CardContent></Card>
            ) : (
              <>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{review.parentName || "ولي أمر"}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={`h-4 w-4 ${n <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm mt-2 text-muted-foreground">{review.comment}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(review.createdAt).toLocaleDateString("ar")}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={reviewsPage <= 1} onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}>السابق</Button>
                <span className="text-sm text-muted-foreground">صفحة {reviewsPage} من {reviewsPagesCount}</span>
                <Button variant="outline" size="sm" disabled={reviewsPage >= reviewsPagesCount} onClick={() => setReviewsPage((p) => Math.min(reviewsPagesCount, p + 1))}>التالي</Button>
              </div>
              </>
            )}
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">التصويتات</h2>
              <Button onClick={() => { resetPollForm(); setShowPollModal(true); }} className="bg-blue-600">
                <Plus className="h-4 w-4 ml-1" />
                إنشاء تصويت
              </Button>
            </div>

            {polls.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد تصويتات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {[...polls].sort((a, b) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }).map((poll) => {
                  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
                  const maxVotes = Math.max(1, ...Object.values(poll.optionCounts || {}));
                  return (
                    <Card key={poll.id} className={`overflow-hidden ${poll.isPinned ? "border-blue-400 border-2" : ""}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            <div>
                              <h3 className="font-bold text-base">{poll.question}</h3>
                              <p className="text-xs text-muted-foreground">
                                {poll.authorType === "teacher"
                                  ? `👨‍🏫 ${(poll as any).teacherName || "معلم"}`
                                  : "🏫 المدرسة"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {poll.authorType === "teacher" && <Badge variant="secondary" className="text-xs">معلم</Badge>}
                            {poll.isPinned && <Badge variant="secondary">📌 مثبت</Badge>}
                            {poll.isClosed && <Badge variant="destructive">مغلق</Badge>}
                            {isExpired && !poll.isClosed && <Badge variant="outline">منتهي</Badge>}
                            {poll.isAnonymous && <Badge variant="outline">مجهول</Badge>}
                            {poll.allowMultiple && <Badge variant="outline">متعدد</Badge>}
                            {!poll.allowMultiple && <Badge variant="outline">واحد فقط</Badge>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(poll.options || []).map((opt) => {
                            const count = poll.optionCounts?.[opt.id] || 0;
                            const pct = poll.votersCount > 0 ? Math.round((count / poll.votersCount) * 100) : 0;
                            return (
                              <div key={opt.id} className="relative">
                                {opt.imageUrl && (
                                  <img src={opt.imageUrl} alt={opt.text} className="w-full h-32 object-cover rounded-lg mb-1" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                )}
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="font-medium">{opt.text}</span>
                                  <span className="text-muted-foreground">{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
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
                            <span>{new Date(poll.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            {poll.expiresAt && <span>⏰ {new Date(poll.expiresAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
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

          <TabsContent value="activity" className="space-y-4">
            <h2 className="text-lg font-bold">سجل النشاط</h2>
            {activity.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد نشاط بعد</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {activity.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{getActivityLabel(log.action)}</p>
                        {log.metadata && <p className="text-xs text-muted-foreground mt-1">{JSON.stringify(log.metadata)}</p>}
                      </div>
                      <div className="text-left">
                        <Badge>{log.points > 0 ? `+${log.points}` : log.points}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(log.createdAt).toLocaleString("ar")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card className="overflow-hidden">
              <div className="h-40 sm:h-48 md:h-56 bg-gradient-to-l from-blue-600 to-indigo-700 relative">
                {profile?.coverImageUrl && (
                  <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                )}
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-4 border-white flex items-center justify-center shadow-lg relative z-10 overflow-hidden">
                    <School className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                    {profile?.imageUrl && (
                      <img src={profile.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold">{profile?.name || "المدرسة"}</h2>
                    {profile?.nameAr && <p className="text-muted-foreground text-sm">{profile.nameAr}</p>}
                    {profile?.description && <p className="text-sm mt-1 text-muted-foreground">{profile.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                      {(profile?.address || profile?.city || profile?.governorate) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[profile?.address, profile?.city, profile?.governorate].filter(Boolean).join("، ")}
                        </span>
                      )}
                      {profile?.email && <span>{profile.email}</span>}
                      {profile?.phoneNumber && <span>{profile.phoneNumber}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={openEditProfile}>
                      <Edit className="h-4 w-4 ml-1" />
                      تعديل البيانات
                    </Button>
                    <Button variant="outline" onClick={() => window.open(`/school/${profile?.id}`, "_blank")}>
                      <Eye className="h-4 w-4 ml-1" />
                      عرض الصفحة العامة
                    </Button>
                    <ShareMenu
                      url={typeof window !== "undefined" ? `${window.location.origin}/school/${profile?.id || ""}` : ""}
                      title={`${profile?.nameAr || profile?.name || "المدرسة"} — Classify`}
                      description={profile?.description || ""}
                    />
                    <Button className="bg-blue-600" onClick={() => { setEditingPost(null); resetPostForm(); setShowPostModal(true); }}>
                      <Plus className="h-4 w-4 ml-1" />
                      إنشاء منشور
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {feed.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد منشورات بعد</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {[...feed].sort((a, b) => {
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }).map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={post.authorType === "school" ? "default" : "secondary"}>
                            {post.authorType === "school" ? "المدرسة" : post.teacherName || "معلم"}
                          </Badge>
                          {post.isPinned && <Badge variant="outline">مثبت</Badge>}
                        </div>

                        {post.authorType === "school" && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditPost(post)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updatePost.mutate({ id: post.id, isPinned: !post.isPinned })}>
                              {post.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              if (confirm("هل تريد حذف هذا المنشور؟")) deletePost.mutate(post.id);
                            }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {post.content && <p className="text-sm whitespace-pre-wrap">{post.content}</p>}

                      {post.mediaUrls?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {post.mediaUrls.map((url, i) => (
                            post.mediaTypes?.[i] === "video" ? (
                              <video key={i} src={url} controls className="w-full h-36 rounded object-cover bg-black" />
                            ) : (
                              <img key={i} src={url} alt="" className="w-full h-36 rounded object-cover bg-gray-100" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            )
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>❤️ {post.likesCount}</span>
                          <span>💬 {post.commentsCount}</span>
                          <span>{new Date(post.createdAt).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => togglePostComments(post.id)}>
                          <MessageSquare className="h-4 w-4 ml-1" />
                          {showCommentsByPost[post.id] ? "إخفاء التعليقات" : "عرض التعليقات"}
                        </Button>
                      </div>

                      {showCommentsByPost[post.id] && (
                        <div className="space-y-2 border-t pt-3">
                          {commentsLoadingByPost[post.id] ? (
                            <p className="text-xs text-muted-foreground">جاري تحميل التعليقات...</p>
                          ) : (
                            (commentsByPost[post.id] || []).map((comment) => (
                              <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-sm">
                                <div className="font-medium text-xs">{comment.authorName}</div>
                                <div>{comment.content}</div>
                              </div>
                            ))
                          )}

                          <div className="flex gap-2">
                            <Input
                              placeholder="اكتب ردًا على التعليقات..."
                              value={commentInputByPost[post.id] || ""}
                              onChange={(e) => setCommentInputByPost((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              className="bg-blue-600"
                              disabled={!commentInputByPost[post.id]?.trim() || addPostComment.isPending}
                              onClick={() => addPostComment.mutate({ postId: post.id, content: (commentInputByPost[post.id] || "").trim() })}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showTeacherModal} onOpenChange={setShowTeacherModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "تعديل المعلم" : "إضافة معلم جديد"}</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>الاسم *</Label>
              <Input value={teacherForm.name} onChange={(e) => setTeacherForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>اسم المستخدم *</Label>
              <Input value={teacherForm.username} onChange={(e) => setTeacherForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <Label>{editingTeacher ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور *"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm((f) => ({ ...f, password: e.target.value }))}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>التخصص</Label>
              <Input value={teacherForm.subject} onChange={(e) => setTeacherForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <Label>سنوات الخبرة</Label>
              <Input type="number" value={teacherForm.yearsExperience} onChange={(e) => setTeacherForm((f) => ({ ...f, yearsExperience: parseInt(e.target.value || "0", 10) || 0 }))} />
            </div>
            <div>
              <Label>تاريخ الميلاد</Label>
              <Input type="date" value={teacherForm.birthday} onChange={(e) => setTeacherForm((f) => ({ ...f, birthday: e.target.value }))} />
            </div>
            <div>
              <Label>رابط الصورة الشخصية</Label>
              <Input value={teacherForm.avatarUrl} onChange={(e) => setTeacherForm((f) => ({ ...f, avatarUrl: e.target.value }))} />
            </div>
            <div>
              <Label>رابط صورة الغلاف</Label>
              <Input value={teacherForm.coverImageUrl} onChange={(e) => setTeacherForm((f) => ({ ...f, coverImageUrl: e.target.value }))} />
            </div>
            <div>
              <Label>السعر الشهري</Label>
              <Input value={teacherForm.monthlyRate} onChange={(e) => setTeacherForm((f) => ({ ...f, monthlyRate: e.target.value }))} />
            </div>
            <div>
              <Label>سعر المهمة</Label>
              <Input value={teacherForm.perTaskRate} onChange={(e) => setTeacherForm((f) => ({ ...f, perTaskRate: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>نبذة</Label>
              <Textarea value={teacherForm.bio} onChange={(e) => setTeacherForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>

            <div>
              <Label>Facebook</Label>
              <Input value={teacherForm.socialLinks.facebook} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, facebook: e.target.value } }))} />
            </div>
            <div>
              <Label>Twitter / X</Label>
              <Input value={teacherForm.socialLinks.twitter} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, twitter: e.target.value } }))} />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input value={teacherForm.socialLinks.instagram} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, instagram: e.target.value } }))} />
            </div>
            <div>
              <Label>YouTube</Label>
              <Input value={teacherForm.socialLinks.youtube} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, youtube: e.target.value } }))} />
            </div>
            <div>
              <Label>TikTok</Label>
              <Input value={teacherForm.socialLinks.tiktok} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, tiktok: e.target.value } }))} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={teacherForm.socialLinks.website} onChange={(e) => setTeacherForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, website: e.target.value } }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeacherModal(false)}>إلغاء</Button>
            <Button className="bg-blue-600" onClick={handleSubmitTeacher}>
              {editingTeacher ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "تعديل المنشور" : "منشور جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              placeholder="اكتب محتوى المنشور..."
              value={postForm.content}
              onChange={(e) => setPostForm((p) => ({ ...p, content: e.target.value }))}
              className="min-h-[120px]"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Label className="cursor-pointer inline-flex items-center gap-2 border rounded-md px-3 py-2">
                <Upload className="h-4 w-4" />
                رفع صورة/فيديو
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { handlePostMediaSelected(e.target.files); e.target.value = ""; }} />
              </Label>
              <Button type="button" variant={postForm.isPinned ? "default" : "outline"} onClick={() => setPostForm((p) => ({ ...p, isPinned: !p.isPinned }))}>
                {postForm.isPinned ? <Pin className="h-4 w-4 ml-1" /> : <PinOff className="h-4 w-4 ml-1" />}
                {postForm.isPinned ? "مثبت" : "غير مثبت"}
              </Button>
            </div>

            {(postForm.mediaUrls.length > 0 || pendingPostPreviews.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {/* Already uploaded media (for editing) */}
                {postForm.mediaUrls.map((url, i) => (
                  <div key={`uploaded-${i}`} className="relative rounded overflow-hidden border">
                    {postForm.mediaTypes[i] === "video" ? (
                      <video src={url} controls className="w-full h-28 object-cover bg-black" />
                    ) : (
                      <img src={url} alt="" className="w-full h-28 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 left-1 h-6 w-6"
                      onClick={() => removePostMedia(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {/* Pending file previews (not yet uploaded) */}
                {pendingPostPreviews.map((preview, i) => (
                  <div key={`pending-${i}`} className="relative rounded overflow-hidden border">
                    {preview.type === "video" ? (
                      <video src={preview.url} controls className="w-full h-28 object-cover bg-black" />
                    ) : (
                      <img src={preview.url} alt="" className="w-full h-28 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 left-1 h-6 w-6"
                      onClick={() => removePostMedia(postForm.mediaUrls.length + i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPostModal(false);
                setEditingPost(null);
                resetPostForm();
              }}
            >
              إلغاء
            </Button>
            <Button className="bg-blue-600" onClick={handleSubmitPost} disabled={publishingPost}>
              {editingPost ? "تحديث" : "نشر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المدرسة</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>الاسم *</Label>
              <Input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>الاسم العربي</Label>
              <Input value={profileForm.nameAr} onChange={(e) => setProfileForm((f) => ({ ...f, nameAr: e.target.value }))} />
            </div>
            <div>
              <Label>صورة المدرسة</Label>
              <div className="space-y-2">
                <div className="w-16 h-16 rounded-full relative overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border">
                  <School className="h-7 w-7 text-blue-600" />
                  {profileForm.imageUrl && (
                    <img src={profileForm.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  )}
                </div>
                <Label className="cursor-pointer inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {uploadingProfileImage ? "جاري الرفع..." : "رفع من الجهاز"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { handleSelectSchoolProfileImage(e.target.files?.[0], "avatar"); e.target.value = ""; }}
                    disabled={uploadingProfileImage}
                  />
                </Label>
              </div>
            </div>
            <div>
              <Label>صورة الغلاف</Label>
              <div className="space-y-2">
                <div className="w-full h-16 rounded relative overflow-hidden bg-gray-100 dark:bg-gray-800 border">
                  {profileForm.coverImageUrl && (
                    <img src={profileForm.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  )}
                </div>
                <Label className="cursor-pointer inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {uploadingProfileCover ? "جاري الرفع..." : "رفع من الجهاز"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { handleSelectSchoolProfileImage(e.target.files?.[0], "cover"); e.target.value = ""; }}
                    disabled={uploadingProfileCover}
                  />
                </Label>
              </div>
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input value={profileForm.phoneNumber} onChange={(e) => setProfileForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
            </div>
            <div>
              <Label>البريد</Label>
              <Input value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={profileForm.address} onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label>المدينة</Label>
              <Input value={profileForm.city} onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>المحافظة</Label>
              <Input value={profileForm.governorate} onChange={(e) => setProfileForm((f) => ({ ...f, governorate: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>الوصف</Label>
              <Textarea value={profileForm.description} onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div>
              <Label>Facebook</Label>
              <Input value={profileForm.socialLinks.facebook} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, facebook: e.target.value } }))} />
            </div>
            <div>
              <Label>Twitter / X</Label>
              <Input value={profileForm.socialLinks.twitter} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, twitter: e.target.value } }))} />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input value={profileForm.socialLinks.instagram} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, instagram: e.target.value } }))} />
            </div>
            <div>
              <Label>YouTube</Label>
              <Input value={profileForm.socialLinks.youtube} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, youtube: e.target.value } }))} />
            </div>
            <div>
              <Label>TikTok</Label>
              <Input value={profileForm.socialLinks.tiktok} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, tiktok: e.target.value } }))} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={profileForm.socialLinks.website} onChange={(e) => setProfileForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, website: e.target.value } }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>إلغاء</Button>
            <Button className="bg-blue-600" onClick={handleSubmitProfile}>حفظ</Button>
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
                <div key={i} className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`الخيار ${i + 1}`}
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...pollForm.options];
                        newOpts[i] = { ...newOpts[i], text: e.target.value };
                        setPollForm((f) => ({ ...f, options: newOpts }));
                      }}
                    />
                    <label className="shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast({ title: "حجم الصورة يجب أن يكون أقل من 5MB", variant: "destructive" });
                            return;
                          }
                          try {
                            setUploadingPollOptionIdx(i);
                            const { url } = await uploadFileToStorage(file);
                            const newOpts = [...pollForm.options];
                            newOpts[i] = { ...newOpts[i], imageUrl: url };
                            setPollForm((f) => ({ ...f, options: newOpts }));
                            toast({ title: `تم رفع صورة الخيار ${i + 1}` });
                          } catch (err: any) {
                            toast({ title: err.message || "فشل رفع الصورة", variant: "destructive" });
                          } finally {
                            setUploadingPollOptionIdx(null);
                          }
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant={opt.imageUrl ? "default" : "outline"}
                        size="icon"
                        className={opt.imageUrl ? "bg-green-600 hover:bg-green-700" : ""}
                        disabled={uploadingPollOptionIdx === i}
                        asChild
                      >
                        <span>
                          {uploadingPollOptionIdx === i ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </span>
                      </Button>
                    </label>
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
                  {opt.imageUrl && (
                    <div className="relative inline-block mr-2">
                      <img src={opt.imageUrl} alt="" className="h-16 w-24 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = [...pollForm.options];
                          newOpts[i] = { ...newOpts[i], imageUrl: "" };
                          setPollForm((f) => ({ ...f, options: newOpts }));
                        }}
                        className="absolute -top-1.5 -left-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {pollForm.options.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPollForm((f) => ({ ...f, options: [...f.options, { text: "", imageUrl: "" }] }))}
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
            <Button className="bg-blue-600" onClick={handleSubmitPoll} disabled={createPoll.isPending}>
              {createPoll.isPending ? "جاري الإنشاء..." : "إنشاء التصويت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => { setCropperOpen(false); setCropperImage(""); }}
        imageSrc={cropperImage}
        onCropComplete={handleCroppedImageUpload}
        mode={cropperMode}
      />

      {/* Transfer Teacher Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>نقل المعلم: {transferTeacherName}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المدرسة المستهدفة *</Label>
              <select
                className="w-full border rounded-md p-2 mt-1 bg-background"
                value={transferForm.toSchoolId}
                onChange={e => setTransferForm(f => ({ ...f, toSchoolId: e.target.value }))}
              >
                <option value="">اختر مدرسة...</option>
                {availableSchools.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>تقييم أداء المعلم * (1-5)</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTransferForm(f => ({ ...f, performanceRating: n }))}
                    className={`p-1 rounded transition-colors ${transferForm.performanceRating >= n ? "text-yellow-500" : "text-gray-300"}`}
                  >
                    <Star className="h-6 w-6" fill={transferForm.performanceRating >= n ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>تعليق على الأداء *</Label>
              <Textarea
                value={transferForm.performanceComment}
                onChange={e => setTransferForm(f => ({ ...f, performanceComment: e.target.value }))}
                placeholder="اكتب تقييمك لأداء المعلم..."
                rows={3}
              />
            </div>

            <div>
              <Label>سبب النقل (اختياري)</Label>
              <Input
                value={transferForm.reason}
                onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="سبب النقل..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>إلغاء</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!transferForm.toSchoolId || !transferForm.performanceRating || !transferForm.performanceComment || transferTeacher.isPending}
              onClick={() => {
                if (!transferTeacherId) return;
                transferTeacher.mutate({
                  id: transferTeacherId,
                  toSchoolId: transferForm.toSchoolId,
                  performanceRating: transferForm.performanceRating,
                  performanceComment: transferForm.performanceComment,
                  reason: transferForm.reason || undefined,
                });
              }}
            >
              {transferTeacher.isPending ? "جاري النقل..." : "تأكيد النقل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
