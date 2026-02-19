import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, ArrowLeft, User, Camera, Calendar, School, Heart,
  Save, Loader2, Star, Trophy, Sparkles, Share2, Users, Bell, UserPlus,
  Check, X, MapPin, Award, Flame, Gamepad2, Droplets, TreePine,
  Copy, ImagePlus, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { ChildNotificationBell } from "@/components/ChildNotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import ImageCropper from "@/components/ImageCropper";

// ======= INTERFACES =======
interface ShowcaseData {
  child: {
    id: string; name: string; avatarUrl?: string; coverImageUrl?: string;
    bio?: string; schoolName?: string; academicGrade?: string; hobbies?: string;
    governorate?: string; interests?: string[]; totalPoints: number;
    shareCode: string; joinedAt: string;
  };
  stats: {
    totalPoints: number; tasksCompleted: number; gamesPlayed: number;
    treeStage: number; wateringsCount: number; streak: number; friendCount: number;
  };
  achievements: { id: string; icon: string; title: string; description: string; earned: boolean }[];
  growthTree: any;
}

interface FriendData {
  id: string; name: string; avatarUrl?: string; schoolName?: string;
  governorate?: string; totalPoints: number; treeStage: number; friendshipId?: string;
}

interface FriendRequest {
  id: string; requesterId: string; status: string;
  requester: { id: string; name: string; avatarUrl?: string; schoolName?: string } | null;
}

interface Suggestion {
  id: string; name: string; avatarUrl?: string; schoolName?: string;
  governorate?: string; score: number; reasons: string[];
}

interface FriendNotification {
  id: string; fromChildId: string; type: string; title: string; message: string;
  isRead: boolean; createdAt: string; friendName?: string; friendAvatar?: string;
}

type TabType = "showcase" | "edit" | "friends" | "notifications";

// ======= MAIN COMPONENT =======
export default function ChildProfile() {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("showcase");

  const [formData, setFormData] = useState({
    name: "", birthday: "", schoolName: "", academicGrade: "", hobbies: "",
  });
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  // ======= QUERIES =======
  const { data: showcaseData, isLoading } = useQuery<ShowcaseData>({
    queryKey: ["child-showcase"],
    queryFn: async () => {
      const res = await fetch("/api/child/showcase", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
  });

  const { data: profileData } = useQuery({
    queryKey: ["child-profile"],
    queryFn: async () => {
      const res = await fetch("/api/child/profile", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    enabled: !!token && activeTab === "edit",
  });

  const { data: friendsData } = useQuery({
    queryKey: ["child-friends"],
    queryFn: async () => {
      const res = await fetch("/api/child/friends", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data as { friends: FriendData[]; pending: FriendRequest[] };
    },
    enabled: !!token && activeTab === "friends",
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ["child-friend-suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/child/friends/suggestions", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data as { suggestions: Suggestion[] };
    },
    enabled: !!token && activeTab === "friends",
  });

  const { data: notifData } = useQuery({
    queryKey: ["child-friend-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/child/friends/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data as { notifications: FriendNotification[]; unreadCount: number };
    },
    enabled: !!token && activeTab === "notifications",
  });

  // ======= MUTATIONS =======
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => apiRequest("PUT", "/api/child/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      toast({ title: t("childProfile.updateSuccess") + " ✅", description: t("childProfile.profileUpdated") });
    },
  });

  const updateShowcaseMutation = useMutation({
    mutationFn: async (data: { bio?: string; interests?: string[] }) =>
      apiRequest("PUT", "/api/child/showcase-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      toast({ title: t("childProfile.updateSuccess") + " ✅" });
    },
  });

  const friendRequestMutation = useMutation({
    mutationFn: async (friendId: string) =>
      apiRequest("POST", "/api/child/friends/request", { friendId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-friend-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["child-friends"] });
      toast({ title: t("childProfile.friends.requestSent") + " ✅" });
    },
  });

  const handleFriendAction = useMutation({
    mutationFn: async ({ friendshipId, action }: { friendshipId: string; action: string }) =>
      apiRequest("PUT", `/api/child/friends/${friendshipId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-friends"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      queryClient.invalidateQueries({ queryKey: ["child-friend-notifications"] });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await fetch(`/api/child/friends/${friendshipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-friends"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
    },
  });

  const markNotifRead = useMutation({
    mutationFn: async (notifId: string) =>
      apiRequest("PUT", `/api/child/friends/notifications/${notifId}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["child-friend-notifications"] }),
  });

  // ======= EFFECTS =======
  useEffect(() => {
    if (profileData) {
      setFormData({
        name: profileData.name || "",
        birthday: profileData.birthday ? new Date(profileData.birthday).toISOString().split("T")[0] : "",
        schoolName: profileData.schoolName || "",
        academicGrade: profileData.academicGrade || "",
        hobbies: profileData.hobbies || "",
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (showcaseData) {
      setBio(showcaseData.child.bio || "");
      setInterests(showcaseData.child.interests || []);
    }
  }, [showcaseData]);

  // ======= UPLOAD HANDLERS =======
  const handleSelectAvatar = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setCropperImage(URL.createObjectURL(file));
    setCropperOpen(true);
  };

  const handleCroppedAvatar = async (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: t("childProfile.fileTooLarge"), variant: "destructive" });
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/child/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      toast({ title: t("childProfile.photoUploaded") + " ✅" });
    } catch {
      setAvatarPreview(null);
      toast({ title: t("childProfile.uploadFailed"), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast({ title: t("childProfile.fileTooLarge"), variant: "destructive" });
      return;
    }
    setIsUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("cover", file);
      const res = await fetch("/api/child/cover-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: ["child-showcase"] });
      toast({ title: t("childProfile.coverUploaded") + " ✅" });
    } catch {
      toast({ title: t("childProfile.uploadFailed"), variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim().length < 2) {
      toast({
        title: t("childProfile.invalidName"),
        description: t("childProfile.nameMinLength"),
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(formData);
    if (bio !== (showcaseData?.child.bio || "")) {
      updateShowcaseMutation.mutate({ bio, interests });
    }
  };

  const handleShareProfile = async () => {
    const code = showcaseData?.child.shareCode;
    if (!code) return;
    const url = `${window.location.origin}/child-public-profile/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: showcaseData?.child.name, text: t("childProfile.shareText"), url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: t("childProfile.linkCopied") + " ✅" });
    }
  };

  const gradeOptions = [
    { value: "grade1", label: t("childProfile.grades.grade1") },
    { value: "grade2", label: t("childProfile.grades.grade2") },
    { value: "grade3", label: t("childProfile.grades.grade3") },
    { value: "grade4", label: t("childProfile.grades.grade4") },
    { value: "grade5", label: t("childProfile.grades.grade5") },
    { value: "grade6", label: t("childProfile.grades.grade6") },
    { value: "grade7", label: t("childProfile.grades.grade7") },
    { value: "grade8", label: t("childProfile.grades.grade8") },
    { value: "grade9", label: t("childProfile.grades.grade9") },
    { value: "grade10", label: t("childProfile.grades.grade10") },
    { value: "grade11", label: t("childProfile.grades.grade11") },
    { value: "grade12", label: t("childProfile.grades.grade12") },
  ];

  const INTEREST_OPTIONS = [
    "reading", "drawing", "coding", "sports", "music", "science",
    "math", "languages", "cooking", "photography", "nature", "robotics",
  ];

  // ======= LOADING STATE =======
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`}>
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
      </div>
    );
  }

  const sc = showcaseData;
  const currentAvatar = avatarPreview || sc?.child.avatarUrl;
  const currentCover = sc?.child.coverImageUrl;
  const earnedAchievements = sc?.achievements.filter(a => a.earned) || [];
  const unreadNotifs = notifData?.unreadCount || 0;

  // ======= RENDER =======
  return (
    <div className={`min-h-screen pb-20 ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* ===== COVER & AVATAR HERO ===== */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-44 sm:h-56 relative overflow-hidden">
          {currentCover ? (
            <img src={currentCover} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600" />
          )}
          <div className="absolute inset-0 bg-black/20" />

          {/* Cover upload button */}
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={isUploadingCover}
            className="absolute top-3 end-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-sm transition-all"
          >
            {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </button>
          <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }} />

          {/* Back button */}
          <button
            onClick={() => navigate("/child-settings")}
            className="absolute top-3 start-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-sm"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>

          {/* Share button */}
          <button
            onClick={handleShareProfile}
            className="absolute top-3 end-14 p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-sm"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Top utilities */}
          <div className="absolute top-3 end-28 flex items-center gap-1">
            <LanguageSelector />
            <ChildNotificationBell />
          </div>
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-10">
          <div className="relative group">
            <Avatar className={`w-28 h-28 border-4 shadow-xl ${isDark ? "border-gray-900" : "border-white"}`}>
              <AvatarImage src={currentAvatar || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white text-3xl font-bold">
                {sc?.child.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 end-0 w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSelectAvatar(f); e.target.value = ""; }} />
          </div>
        </div>
      </div>

      {/* Name & quick stats */}
      <div className="pt-16 pb-3 text-center px-4">
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
          {sc?.child.name}
        </h1>
        {sc?.child.bio && (
          <p className={`text-sm mt-1 max-w-xs mx-auto ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {sc.child.bio}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <Star className="w-3 h-3" /> {sc?.stats.totalPoints || 0}
          </span>
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <TreePine className="w-3 h-3" /> {t("childProfile.treeLevel")} {sc?.stats.treeStage || 1}
          </span>
          {(sc?.stats.streak || 0) > 0 && (
            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold">
              <Flame className="w-3 h-3" /> {sc?.stats.streak} {t("childProfile.dayStreak")}
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <Users className="w-3 h-3" /> {sc?.stats.friendCount || 0} {t("childProfile.friends.title")}
          </span>
        </div>
      </div>

      {/* ===== TAB BAR ===== */}
      <div className={`sticky top-0 z-40 px-4 py-2 ${isDark ? "bg-gray-900/95" : "bg-white/95"} backdrop-blur-sm border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
        <div className="flex gap-1 max-w-2xl mx-auto">
          {([
            { key: "showcase" as TabType, icon: Trophy, label: t("childProfile.tabs.showcase") },
            { key: "friends" as TabType, icon: Users, label: t("childProfile.tabs.friends") },
            { key: "notifications" as TabType, icon: Bell, label: t("childProfile.tabs.notifications"), badge: unreadNotifs },
            { key: "edit" as TabType, icon: Settings, label: t("childProfile.tabs.edit") },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? isDark ? "bg-purple-900/40 text-purple-400" : "bg-purple-100 text-purple-700"
                  : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-0.5 end-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* ========== SHOWCASE TAB ========== */}
          {activeTab === "showcase" && (
            <motion.div key="showcase" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Sparkles, value: sc?.stats.tasksCompleted || 0, label: t("childProfile.stats.tasks"), color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
                  { icon: Gamepad2, value: sc?.stats.gamesPlayed || 0, label: t("childProfile.stats.games"), color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                  { icon: Droplets, value: sc?.stats.wateringsCount || 0, label: t("childProfile.stats.waterings"), color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`text-center p-3 rounded-2xl ${stat.bg} ${isDark ? "border border-gray-700" : "border border-gray-100"}`}
                  >
                    <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                    <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{stat.value}</p>
                    <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Achievements Section */}
              <Card className={`border-0 shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                      {t("childProfile.achievements.title")}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>
                      {earnedAchievements.length}/{sc?.achievements.length || 0}
                    </span>
                  </div>

                  {/* Earned */}
                  {earnedAchievements.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
                      {earnedAchievements.map((a, i) => (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05, type: "spring" }}
                          className={`text-center p-2 rounded-xl ${isDark ? "bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/30" : "bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200"}`}
                        >
                          <span className="text-2xl">{a.icon}</span>
                          <p className={`text-[9px] mt-0.5 leading-tight font-medium ${isDark ? "text-yellow-300" : "text-yellow-800"}`}>
                            {a.title}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Locked */}
                  {(sc?.achievements.filter(a => !a.earned).length || 0) > 0 && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {sc?.achievements.filter(a => !a.earned).map((a) => (
                        <div key={a.id} className={`text-center p-1.5 rounded-lg opacity-40 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                          <span className="text-lg grayscale">{a.icon}</span>
                          <p className={`text-[8px] mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>🔒</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Cards */}
              {(sc?.child.schoolName || sc?.child.governorate) && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4 space-y-2">
                    {sc?.child.schoolName && (
                      <div className="flex items-center gap-2">
                        <School className="w-4 h-4 text-green-500" />
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{sc.child.schoolName}</span>
                      </div>
                    )}
                    {sc?.child.governorate && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{sc.child.governorate}</span>
                      </div>
                    )}
                    {sc?.child.hobbies && (
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{sc.child.hobbies}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Interests */}
              {sc?.child.interests && sc.child.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sc.child.interests.map((interest) => (
                    <span key={interest} className={`px-3 py-1 rounded-full text-xs font-medium ${isDark ? "bg-purple-900/30 text-purple-300 border border-purple-800/30" : "bg-purple-100 text-purple-700"}`}>
                      #{t(`childProfile.interest.${interest}`)}
                    </span>
                  ))}
                </div>
              )}

              {/* Share Card */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.shareProfile")}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={handleShareProfile}>
                      <Copy className="w-3.5 h-3.5 me-1" /> {t("childProfile.copyLink")}
                    </Button>
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("childProfile.shareDescription")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========== FRIENDS TAB ========== */}
          {activeTab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Pending Requests */}
              {friendsData?.pending && friendsData.pending.length > 0 && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      <UserPlus className="w-4 h-4 text-blue-500" />
                      {t("childProfile.friends.pendingRequests")} ({friendsData.pending.length})
                    </h3>
                    <div className="space-y-2">
                      {friendsData.pending.map((req) => (
                        <div key={req.id} className={`flex items-center justify-between p-2 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={req.requester?.avatarUrl || undefined} />
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-bold">{req.requester?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{req.requester?.name}</p>
                              {req.requester?.schoolName && (
                                <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{req.requester.schoolName}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleFriendAction.mutate({ friendshipId: req.id, action: "accept" })}
                              className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFriendAction.mutate({ friendshipId: req.id, action: "reject" })}
                              className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* My Friends */}
              <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <CardContent className="p-4">
                  <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                    <Users className="w-4 h-4 text-purple-500" />
                    {t("childProfile.friends.myFriends")} ({friendsData?.friends.length || 0})
                  </h3>
                  {(!friendsData?.friends || friendsData.friends.length === 0) ? (
                    <div className="text-center py-6">
                      <Users className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                      <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        {t("childProfile.friends.noFriendsYet")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friendsData.friends.map((f) => (
                        <div key={f.id} className={`flex items-center justify-between p-2 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={f.avatarUrl || undefined} />
                              <AvatarFallback className="bg-purple-100 text-purple-600 text-sm font-bold">{f.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{f.name}</p>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className={isDark ? "text-yellow-400" : "text-yellow-600"}>⭐ {f.totalPoints}</span>
                                <span className={isDark ? "text-green-400" : "text-green-600"}>🌱 L{f.treeStage}</span>
                                {f.schoolName && <span className={isDark ? "text-gray-500" : "text-gray-400"}>{f.schoolName}</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => f.friendshipId && removeFriend.mutate(f.friendshipId)}
                            className={`p-1.5 rounded-lg text-xs ${isDark ? "hover:bg-gray-600 text-gray-400" : "hover:bg-gray-200 text-gray-400"}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Friend Suggestions */}
              {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="p-4">
                    <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      {t("childProfile.friends.suggestions")}
                    </h3>
                    <div className="space-y-2">
                      {suggestionsData.suggestions.map((s) => (
                        <div key={s.id} className={`flex items-center justify-between p-2 rounded-xl ${isDark ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={s.avatarUrl || undefined} />
                              <AvatarFallback className="bg-yellow-100 text-yellow-600 text-xs font-bold">{s.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>{s.name}</p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {s.reasons.map((r) => (
                                  <span key={r} className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                    r === "school" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                    r === "location" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                    r === "grade" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                  }`}>
                                    {t(`childProfile.friends.reason.${r}`)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-xs h-8"
                            onClick={() => friendRequestMutation.mutate(s.id)}
                            disabled={friendRequestMutation.isPending}
                          >
                            <UserPlus className="w-3 h-3 me-1" /> {t("childProfile.friends.add")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* ========== NOTIFICATIONS TAB ========== */}
          {activeTab === "notifications" && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {(!notifData?.notifications || notifData.notifications.length === 0) ? (
                <div className="text-center py-10">
                  <Bell className={`w-10 h-10 mx-auto mb-3 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                  <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("childProfile.notifications.empty")}
                  </p>
                </div>
              ) : (
                notifData.notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => !n.isRead && markNotifRead.mutate(n.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      n.isRead
                        ? isDark ? "bg-gray-800/50" : "bg-gray-50"
                        : isDark ? "bg-purple-900/20 border border-purple-800/30" : "bg-purple-50 border border-purple-200"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarImage src={n.friendAvatar || undefined} />
                        <AvatarFallback className="bg-purple-100 text-purple-600 text-xs font-bold">{n.friendName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                          {n.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {n.message}
                        </p>
                        <p className={`text-[10px] mt-1 ${isDark ? "text-gray-600" : "text-gray-300"}`}>
                          {new Date(n.createdAt).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-2" />}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* ========== EDIT TAB ========== */}
          {activeTab === "edit" && (
            <motion.div key="edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Bio */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.bioSection")}
                      </h3>
                    </div>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("childProfile.bioPlaceholder")}
                      maxLength={300}
                      className={`min-h-[80px] resize-none rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                    />
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{bio.length}/300</p>
                  </CardContent>
                </Card>

                {/* Interests */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-pink-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.interestsSection")}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map((opt) => {
                        const selected = interests.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              if (selected) setInterests(interests.filter(i => i !== opt));
                              else if (interests.length < 10) setInterests([...interests, opt]);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              selected
                                ? "bg-purple-500 text-white shadow-md"
                                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {t(`childProfile.interest.${opt}`)}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Info */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.personalInfo")}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        {t("childProfile.name")} <span className="text-red-400">*</span>
                      </Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`min-h-[48px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={`text-sm flex items-center gap-1.5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        <Calendar className="w-3.5 h-3.5" /> {t("childProfile.birthday")}
                      </Label>
                      <Input type="date" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className={`min-h-[48px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                  </CardContent>
                </Card>

                {/* School Info */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <School className="w-4 h-4 text-green-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                        {t("childProfile.schoolInfo")}
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("childProfile.schoolName")}</Label>
                      <Input value={formData.schoolName} onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                        className={`min-h-[48px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("childProfile.grade")}</Label>
                      <select value={formData.academicGrade} onChange={(e) => setFormData({ ...formData, academicGrade: e.target.value })}
                        className={`w-full min-h-[48px] px-3 py-2 rounded-xl border ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}>
                        <option value="">{t("childProfile.selectGrade")}</option>
                        {gradeOptions.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Hobbies */}
                <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-pink-600" />
                      </div>
                      <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{t("childProfile.hobbies")}</h3>
                    </div>
                    <Textarea value={formData.hobbies} onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                      placeholder={t("childProfile.hobbiesPlaceholder")} maxLength={500}
                      className={`min-h-[80px] resize-none rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`} />
                  </CardContent>
                </Card>

                <div className="pt-1 pb-8">
                  <Button type="submit" disabled={updateMutation.isPending}
                    className="w-full min-h-[52px] text-base font-bold rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-purple-200 dark:shadow-none">
                    {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <span className="flex items-center gap-2"><Save className="w-5 h-5" /> {t("childProfile.save")}</span>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => { setCropperOpen(false); setCropperImage(""); }}
        imageSrc={cropperImage}
        onCropComplete={handleCroppedAvatar}
        mode="avatar"
      />
    </div>
  );
}
