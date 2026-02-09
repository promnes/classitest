import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { 
  ArrowRight, Settings, Globe, Moon, Sun, Bell, BellOff, 
  Shield, Eye, EyeOff, Save, Loader2, Smartphone, Trash2,
  CheckCircle, Volume2, VolumeX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChildSettings {
  language: string;
  theme: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  showOnlineStatus: boolean;
  showProgress: boolean;
}

interface TrustedDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  lastUsed: string;
  isCurrent: boolean;
}

export default function ChildSettings() {
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";

  const [settings, setSettings] = useState<ChildSettings>({
    language: i18n.language || "ar",
    theme: localStorage.getItem("theme") || "light",
    notificationsEnabled: true,
    soundEnabled: true,
    showOnlineStatus: true,
    showProgress: true,
  });

  const { data: childInfo, isLoading } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch info");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: trustedDevices } = useQuery({
    queryKey: ["child-trusted-devices"],
    queryFn: async () => {
      const res = await fetch("/api/child/trusted-devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!token,
  });

  const removeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest("DELETE", `/api/child/trusted-devices/${deviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-trusted-devices"] });
      toast({
        title: isRTL ? "تم الحذف" : "Removed",
        description: isRTL ? "تم إزالة الجهاز بنجاح" : "Device removed successfully",
      });
    },
  });

  const handleLanguageChange = (lang: string) => {
    setSettings(prev => ({ ...prev, language: lang }));
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    toast({
      title: lang === "ar" ? "تم تغيير اللغة" : "Language Changed",
      description: lang === "ar" ? "تم التغيير إلى العربية" : "Changed to English",
    });
  };

  const handleThemeChange = (theme: string) => {
    setSettings(prev => ({ ...prev, theme }));
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast({
      title: isRTL ? "تم تغيير المظهر" : "Theme Changed",
      description: theme === "dark" 
        ? (isRTL ? "الوضع الليلي" : "Dark Mode") 
        : (isRTL ? "الوضع النهاري" : "Light Mode"),
    });
  };

  const handleToggle = (key: keyof ChildSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: isRTL ? "تم الحفظ" : "Saved",
      description: isRTL ? "تم حفظ الإعداد" : "Setting saved",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-800" dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/child-games")}
              className="p-2 hover:bg-white/20 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              data-testid="button-back"
            >
              <ArrowRight className={`w-5 h-5 ${!isRTL ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6" />
              <h1 className="text-lg sm:text-xl font-bold">
                {isRTL ? "الإعدادات" : "Settings"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Globe className="w-5 h-5 text-blue-500" />
              {isRTL ? "اللغة والمظهر" : "Language & Appearance"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isRTL ? "اختر لغتك المفضلة ومظهر التطبيق" : "Choose your preferred language and app theme"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <Label className="text-sm">{isRTL ? "اللغة" : "Language"}</Label>
              </div>
              <Select value={settings.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-32 min-h-[44px]" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {settings.theme === "dark" ? (
                  <Moon className="w-4 h-4 text-gray-500" />
                ) : (
                  <Sun className="w-4 h-4 text-yellow-500" />
                )}
                <Label className="text-sm">{isRTL ? "المظهر" : "Theme"}</Label>
              </div>
              <Select value={settings.theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-32 min-h-[44px]" data-testid="select-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{isRTL ? "فاتح" : "Light"}</SelectItem>
                  <SelectItem value="dark">{isRTL ? "داكن" : "Dark"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="w-5 h-5 text-orange-500" />
              {isRTL ? "الإشعارات" : "Notifications"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isRTL ? "تحكم في إشعارات التطبيق" : "Control app notifications"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {settings.notificationsEnabled ? (
                  <Bell className="w-4 h-4 text-orange-500" />
                ) : (
                  <BellOff className="w-4 h-4 text-gray-400" />
                )}
                <Label className="text-sm">{isRTL ? "الإشعارات" : "Notifications"}</Label>
              </div>
              <Switch 
                checked={settings.notificationsEnabled}
                onCheckedChange={() => handleToggle("notificationsEnabled")}
                data-testid="switch-notifications"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-green-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
                <Label className="text-sm">{isRTL ? "الأصوات" : "Sounds"}</Label>
              </div>
              <Switch 
                checked={settings.soundEnabled}
                onCheckedChange={() => handleToggle("soundEnabled")}
                data-testid="switch-sounds"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="w-5 h-5 text-green-500" />
              {isRTL ? "الخصوصية" : "Privacy"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isRTL ? "تحكم في خصوصيتك" : "Control your privacy settings"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {settings.showOnlineStatus ? (
                  <Eye className="w-4 h-4 text-blue-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <Label className="text-sm">{isRTL ? "إظهار حالة الاتصال" : "Show Online Status"}</Label>
              </div>
              <Switch 
                checked={settings.showOnlineStatus}
                onCheckedChange={() => handleToggle("showOnlineStatus")}
                data-testid="switch-online-status"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500" />
                <Label className="text-sm">{isRTL ? "إظهار تقدمي للوالدين" : "Show Progress to Parents"}</Label>
              </div>
              <Switch 
                checked={settings.showProgress}
                onCheckedChange={() => handleToggle("showProgress")}
                data-testid="switch-show-progress"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Smartphone className="w-5 h-5 text-indigo-500" />
              {isRTL ? "الأجهزة الموثوقة" : "Trusted Devices"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isRTL ? "الأجهزة التي يمكنها الدخول لحسابك" : "Devices that can access your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trustedDevices && trustedDevices.length > 0 ? (
              <div className="space-y-3">
                {trustedDevices.map((device: TrustedDevice) => (
                  <div 
                    key={device.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium dark:text-white">
                          {device.deviceName || (isRTL ? "جهاز غير معروف" : "Unknown Device")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {device.isCurrent && (
                            <span className="text-green-500 font-medium">
                              {isRTL ? "الجهاز الحالي • " : "Current device • "}
                            </span>
                          )}
                          {new Date(device.lastUsed).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                    {!device.isCurrent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDeviceMutation.mutate(device.id)}
                        disabled={removeDeviceMutation.isPending}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 min-h-[44px] min-w-[44px]"
                        data-testid={`button-remove-device-${device.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                {isRTL ? "لا توجد أجهزة موثوقة" : "No trusted devices"}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-400 py-4">
          {isRTL ? `مرحباً ${childInfo?.name || ""}` : `Hello ${childInfo?.name || ""}`}
        </div>
      </main>
    </div>
  );
}
