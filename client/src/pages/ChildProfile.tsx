import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, ArrowLeft, User, Camera, Calendar, School, BookOpen, Heart,
  Save, Loader2, Star, Trophy, Sparkles
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
import { motion } from "framer-motion";
import ImageCropper from "@/components/ImageCropper";

interface ChildProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  birthday?: string;
  schoolName?: string;
  academicGrade?: string;
  hobbies?: string;
  totalPoints: number;
}

export default function ChildProfile() {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    birthday: "",
    schoolName: "",
    academicGrade: "",
    hobbies: "",
  });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["child-profile"],
    queryFn: async () => {
      const res = await fetch("/api/child/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const json = await res.json();
      return json.data as ChildProfile;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (profileData) {
      setFormData({
        name: profileData.name || "",
        birthday: profileData.birthday ? (new Date(profileData.birthday).toISOString().split('T')[0] ?? "") : "",
        schoolName: profileData.schoolName || "",
        academicGrade: profileData.academicGrade || "",
        hobbies: profileData.hobbies || "",
      });
    }
  }, [profileData]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", "/api/child/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      queryClient.invalidateQueries({ queryKey: ["child-info"] });
      toast({
        title: t("childProfile.updateSuccess") + " ✅",
        description: t("childProfile.profileUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("error"),
        description: error.message || t("errors.updateError"),
        variant: "destructive",
      });
    },
  });

  // Open cropper when a file is selected
  const handleSelectAvatar = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "يرجى اختيار صورة فقط", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    setCropperOpen(true);
  };

  // Upload the cropped avatar
  const handleCroppedAvatar = async (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    if (file.size > 3 * 1024 * 1024) {
      toast({
        title: t("childProfile.fileTooLarge"),
        description: t("childProfile.maxFileSize"),
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setIsUploading(true);

    try {
      const fd = new FormData();
      fd.append("avatar", file);

      const res = await fetch("/api/child/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");

      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      queryClient.invalidateQueries({ queryKey: ["child-info"] });
      toast({
        title: t("childProfile.photoUploaded") + " ✅",
        description: t("childProfile.photoUpdated"),
      });
    } catch (error: any) {
      setAvatarPreview(null);
      toast({
        title: t("childProfile.uploadFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-purple-400"}`}>
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  const currentAvatar = avatarPreview || profileData?.avatarUrl;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/child-settings")}
                className="p-2 hover:bg-white/15 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <h1 className="text-lg font-bold">{t("childProfile.title")}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ChildNotificationBell />
              <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-bold">{profileData?.totalPoints || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className={`overflow-hidden border-0 shadow-xl ${isDark ? "bg-gray-800" : "bg-white"}`}>
            <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 h-24 relative">
              <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
                <div className="relative group">
                  <Avatar className={`w-28 h-28 border-4 ${isDark ? "border-gray-800" : "border-white"} shadow-xl`}>
                    <AvatarImage src={currentAvatar || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white text-3xl font-bold">
                      {formData.name.charAt(0) || "؟"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSelectAvatar(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>
            <CardContent className="pt-16 pb-5 text-center">
              <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                {profileData?.name || ""}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                  <Trophy className="w-3.5 h-3.5" />
                  {profileData?.totalPoints || 0} {t("childProfile.pts")}
                </div>
                {profileData?.academicGrade && (
                  <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    <BookOpen className="w-3.5 h-3.5" />
                    {gradeOptions.find(g => g.value === profileData.academicGrade)?.label || profileData.academicGrade}
                  </div>
                )}
              </div>
              <p className={`text-xs mt-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {t("childProfile.photoNote")}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
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
                  <Label htmlFor="name" className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("childProfile.name")} <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("childProfile.namePlaceholder")}
                    className={`min-h-[48px] rounded-xl text-base ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birthday" className={`text-sm font-medium flex items-center gap-1.5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    {t("childProfile.birthday")}
                  </Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className={`min-h-[48px] rounded-xl ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* School Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
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
                  <Label htmlFor="schoolName" className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("childProfile.schoolName")}
                  </Label>
                  <Input
                    id="schoolName"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder={t("childProfile.schoolNamePlaceholder")}
                    className={`min-h-[48px] rounded-xl text-base ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="academicGrade" className={`text-sm font-medium flex items-center gap-1.5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <BookOpen className="w-3.5 h-3.5" />
                    {t("childProfile.grade")}
                  </Label>
                  <select
                    id="academicGrade"
                    value={formData.academicGrade}
                    onChange={(e) => setFormData({ ...formData, academicGrade: e.target.value })}
                    className={`w-full min-h-[48px] px-3 py-2 rounded-xl text-base border ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                  >
                    <option value="">{t("childProfile.selectGrade")}</option>
                    {gradeOptions.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hobbies */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className={`border-0 shadow-lg ${isDark ? "bg-gray-800" : "bg-white"}`}>
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-pink-600" />
                  </div>
                  <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                    {t("childProfile.hobbies")}
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <Textarea
                    id="hobbies"
                    value={formData.hobbies}
                    onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                    placeholder={t("childProfile.hobbiesPlaceholder")}
                    className={`min-h-[100px] resize-none rounded-xl text-base ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200"}`}
                    maxLength={500}
                  />
                  <p className={`text-xs text-left ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {formData.hobbies.length}/500
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="pt-1 pb-8"
          >
            <Button
              type="submit"
              className="w-full min-h-[52px] text-base font-bold rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-purple-200 dark:shadow-none"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  {t("childProfile.save")}
                </span>
              )}
            </Button>
          </motion.div>
        </form>
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
