import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { 
  ArrowRight, User, Camera, Calendar, School, BookOpen, Heart, 
  Save, Loader2, AlertCircle, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";

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
        birthday: profileData.birthday ? new Date(profileData.birthday).toISOString().split('T')[0] : "",
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
        title: t("childProfile.updateSuccess"),
        description: t("childProfile.profileUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("errors.updateFailed"),
        description: error.message || t("errors.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.name.trim().length < 2) {
      toast({
        title: t("validation.invalidName"),
        description: t("validation.nameTooShort"),
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(formData);
  };

  const gradeKeys = [
    "grade1", "grade2", "grade3", "grade4",
    "grade5", "grade6", "grade7", "grade8",
    "grade9", "grade10", "grade11", "grade12"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white" dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/child-games")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              data-testid="button-back"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <h1 className="text-lg sm:text-xl font-bold">{t("childProfile.title")}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                {t("childProfile.photo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-orange-200">
                <AvatarImage src={profileData?.avatarUrl} />
                <AvatarFallback className="bg-orange-100 text-orange-600 text-2xl sm:text-3xl">
                  {formData.name.charAt(0) || "؟"}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs sm:text-sm text-gray-500 text-center">
                {t("childProfile.photoNote")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                {t("childProfile.personalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">{t("childProfile.name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("childProfile.namePlaceholder")}
                  className="min-h-[44px]"
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-sm flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {t("childProfile.birthday")}
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="min-h-[44px]"
                  data-testid="input-birthday"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <School className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                {t("childProfile.schoolInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName" className="text-sm">{t("childProfile.schoolName")}</Label>
                <Input
                  id="schoolName"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder={t("childProfile.schoolNamePlaceholder")}
                  className="min-h-[44px]"
                  data-testid="input-school"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="academicGrade" className="text-sm flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {t("childProfile.grade")}
                </Label>
                <select
                  id="academicGrade"
                  value={formData.academicGrade}
                  onChange={(e) => setFormData({ ...formData, academicGrade: e.target.value })}
                  className="w-full min-h-[44px] px-3 py-2 border rounded-md bg-background text-sm"
                  data-testid="select-grade"
                >
                  <option value="">{t("childProfile.selectGrade")}</option>
                  {gradeKeys.map((key) => (
                    <option key={key} value={key}>{t(`childProfile.grades.${key}`)}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
                {t("childProfile.hobbies")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="hobbies" className="text-sm">{t("childProfile.hobbiesLabel")}</Label>
                <Textarea
                  id="hobbies"
                  value={formData.hobbies}
                  onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                  placeholder={t("childProfile.hobbiesPlaceholder")}
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                  data-testid="textarea-hobbies"
                />
                <p className="text-xs text-gray-400 text-left">{formData.hobbies.length}/500</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600 min-h-[48px] text-base"
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  {t("childProfile.save")}
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
