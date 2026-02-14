import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Smartphone, Download, Globe, Shield, Palette, Bot, Info, Upload, Image, Loader2, X } from "lucide-react";

interface AppConfig {
  // Basic App Info
  appName: string;
  appNameAr: string;
  appVersion: string;
  appBuildNumber: string;
  appDescription: string;
  appDescriptionAr: string;
  packageName: string;
  appIconUrl: string;
  
  // Download Settings
  apkEnabled: boolean;
  apkUrl: string;
  apkSize: string;
  minAndroidVersion: string;
  iosEnabled: boolean;
  iosUrl: string;
  
  // Store Listing
  storeShortDesc: string;
  storeShortDescAr: string;
  storeFullDesc: string;
  storeFullDescAr: string;
  storeCategory: string;
  storeContentRating: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  developerName: string;
  developerEmail: string;
  developerWebsite: string;
  
  // Crawler / SEO for App
  appOgTitle: string;
  appOgDescription: string;
  appOgImage: string;
  appSchemaType: string;
  appKeywords: string;
  appKeywordsAr: string;
  deepLinksEnabled: boolean;
  assetlinksEnabled: boolean;
  appleSiteAssociationEnabled: boolean;
  
  // PWA Settings
  pwaEnabled: boolean;
  pwaThemeColor: string;
  pwaBackgroundColor: string;
  pwaDisplayMode: string;
  pwaStartUrl: string;
  pwaName: string;
  pwaShortName: string;
}

const DEFAULT_CONFIG: AppConfig = {
  appName: "Classify",
  appNameAr: "كلاسيفاي",
  appVersion: "1.1",
  appBuildNumber: "1",
  appDescription: "Kids Educational & Parental Control Platform",
  appDescriptionAr: "منصة تعليمية ممتعة للأطفال مع رقابة أبوية ذكية",
  packageName: "com.classify.app",
  appIconUrl: "/logo.jpg",
  
  apkEnabled: true,
  apkUrl: "/classify-app.apk",
  apkSize: "6 MB",
  minAndroidVersion: "6.0",
  iosEnabled: false,
  iosUrl: "",
  
  storeShortDesc: "منصة تعليمية ممتعة للأطفال مع رقابة أبوية ذكية",
  storeShortDescAr: "منصة تعليمية ممتعة للأطفال مع رقابة أبوية ذكية",
  storeFullDesc: "",
  storeFullDescAr: "",
  storeCategory: "Education",
  storeContentRating: "Everyone",
  privacyPolicyUrl: "https://classi-fy.com/privacy",
  termsUrl: "https://classi-fy.com/terms",
  developerName: "Proomnes",
  developerEmail: "",
  developerWebsite: "https://classi-fy.com",
  
  appOgTitle: "Classify - تطبيق الرقابة الأبوية",
  appOgDescription: "تطبيق عربي للرقابة الأبوية يساعد الآباء في إدارة علاقتهم مع أطفالهم",
  appOgImage: "",
  appSchemaType: "MobileApplication",
  appKeywords: "parental control, kids education, tasks, rewards, educational games",
  appKeywordsAr: "رقابة أبوية, تطبيق أطفال, مهام, مكافآت, ألعاب تعليمية",
  deepLinksEnabled: true,
  assetlinksEnabled: true,
  appleSiteAssociationEnabled: false,
  
  pwaEnabled: true,
  pwaThemeColor: "#7c3aed",
  pwaBackgroundColor: "#ffffff",
  pwaDisplayMode: "standalone",
  pwaStartUrl: "/",
  pwaName: "Classify",
  pwaShortName: "Classify",
};

export function MobileAppSettingsTab({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === "ar";

  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleImageUpload = async (field: keyof AppConfig, file: File) => {
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-public-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      const data = json.data || json;
      // Use fullUrl for SEO fields, relative path for internal use
      const url = field === "appOgImage" ? data.fullUrl : data.url;
      handleChange(field, url);
      toast({ title: isRTL ? "تم رفع الصورة بنجاح" : "Image uploaded successfully" });
    } catch (err: any) {
      toast({ title: isRTL ? "فشل رفع الصورة" : "Image upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingField(null);
    }
  };

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["admin-app-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/app-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (settingsData?.mobileApp) {
      setConfig((prev) => ({ ...prev, ...settingsData.mobileApp }));
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (data: AppConfig) => {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mobileApp: data }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
      toast({ title: isRTL ? "تم حفظ إعدادات التطبيق بنجاح" : "App settings saved successfully" });
    },
    onError: () => {
      toast({ title: isRTL ? "فشل في حفظ الإعدادات" : "Failed to save settings", variant: "destructive" });
    },
  });

  const handleChange = (field: keyof AppConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6" />
            {isRTL ? "إعدادات التطبيق" : "Mobile App Settings"}
          </h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {isRTL ? "إدارة إعدادات تطبيق الجوال والتحميل وبيانات المتجر" : "Manage mobile app, download, and store listing settings"}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 ml-2" />
          {saveMutation.isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="flex items-center gap-1 text-xs">
            <Info className="w-4 h-4" />
            {isRTL ? "أساسي" : "Basic"}
          </TabsTrigger>
          <TabsTrigger value="download" className="flex items-center gap-1 text-xs">
            <Download className="w-4 h-4" />
            {isRTL ? "التحميل" : "Download"}
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-1 text-xs">
            <Globe className="w-4 h-4" />
            {isRTL ? "المتجر" : "Store"}
          </TabsTrigger>
          <TabsTrigger value="crawler" className="flex items-center gap-1 text-xs">
            <Bot className="w-4 h-4" />
            {isRTL ? "الزواحف" : "Crawlers"}
          </TabsTrigger>
          <TabsTrigger value="pwa" className="flex items-center gap-1 text-xs">
            <Palette className="w-4 h-4" />
            PWA
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                {isRTL ? "معلومات التطبيق الأساسية" : "Basic App Information"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "الاسم، الإصدار، الوصف، وأيقونة التطبيق" : "Name, version, description, and app icon"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم التطبيق (إنجليزي)" : "App Name (English)"}</Label>
                  <Input value={config.appName} onChange={(e) => handleChange("appName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم التطبيق (عربي)" : "App Name (Arabic)"}</Label>
                  <Input value={config.appNameAr} onChange={(e) => handleChange("appNameAr", e.target.value)} dir="rtl" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم الإصدار" : "Version"}</Label>
                  <Input value={config.appVersion} onChange={(e) => handleChange("appVersion", e.target.value)} placeholder="1.1" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "رقم البناء" : "Build Number"}</Label>
                  <Input value={config.appBuildNumber} onChange={(e) => handleChange("appBuildNumber", e.target.value)} placeholder="1" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم الحزمة" : "Package Name"}</Label>
                  <Input value={config.packageName} onChange={(e) => handleChange("packageName", e.target.value)} placeholder="com.classify.app" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف التطبيق (إنجليزي)" : "App Description (English)"}</Label>
                  <Textarea value={config.appDescription} onChange={(e) => handleChange("appDescription", e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف التطبيق (عربي)" : "App Description (Arabic)"}</Label>
                  <Textarea value={config.appDescriptionAr} onChange={(e) => handleChange("appDescriptionAr", e.target.value)} rows={3} dir="rtl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "أيقونة التطبيق" : "App Icon"}</Label>
                <div className="flex items-center gap-3">
                  {config.appIconUrl ? (
                    <div className="relative group">
                      <img src={config.appIconUrl} alt="App Icon" className="h-16 w-16 rounded-xl border object-cover" />
                      <button
                        onClick={() => handleChange("appIconUrl", "")}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className={`h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center ${isDark ? "border-gray-600" : "border-gray-300"}`}>
                      <Image className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input value={config.appIconUrl} onChange={(e) => handleChange("appIconUrl", e.target.value)} placeholder="/logo.jpg" className="flex-1" dir="ltr" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingField === "appIconUrl"}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleImageUpload("appIconUrl", file);
                          };
                          input.click();
                        }}
                      >
                        {uploadingField === "appIconUrl" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isRTL ? "رفع" : "Upload"}
                      </Button>
                    </div>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {isRTL ? "يفضل 1024x1024 PNG مربعة — يمكنك لصق رابط أو رفع صورة" : "Preferably 1024x1024 square PNG — paste a URL or upload"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Download Tab */}
        <TabsContent value="download" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                {isRTL ? "إعدادات التحميل" : "Download Settings"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "التحكم في روابط تحميل التطبيق على المنصات المختلفة" : "Control app download links for different platforms"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Android */}
              <div className={`p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <p className="font-bold">Android APK</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {isRTL ? "تحميل مباشر لـ APK" : "Direct APK download"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={config.apkEnabled} onCheckedChange={(v) => handleChange("apkEnabled", v)} />
                </div>
                {config.apkEnabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "رابط APK" : "APK URL"}</Label>
                        <Input value={config.apkUrl} onChange={(e) => handleChange("apkUrl", e.target.value)} placeholder="/classify-app.apk" dir="ltr" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? "حجم الملف" : "File Size"}</Label>
                        <Input value={config.apkSize} onChange={(e) => handleChange("apkSize", e.target.value)} placeholder="6 MB" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{isRTL ? "أدنى إصدار اندرويد" : "Min Android Version"}</Label>
                      <Input value={config.minAndroidVersion} onChange={(e) => handleChange("minAndroidVersion", e.target.value)} placeholder="6.0" />
                    </div>
                  </div>
                )}
              </div>

              {/* iOS */}
              <div className={`p-4 rounded-xl border ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍎</span>
                    <div>
                      <p className="font-bold">iOS (App Store)</p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {isRTL ? "رابط متجر آبل" : "Apple App Store link"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={config.iosEnabled} onCheckedChange={(v) => handleChange("iosEnabled", v)} />
                </div>
                {config.iosEnabled && (
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "رابط App Store" : "App Store URL"}</Label>
                    <Input value={config.iosUrl} onChange={(e) => handleChange("iosUrl", e.target.value)} placeholder="https://apps.apple.com/app/classify/id123456789" dir="ltr" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Listing Tab */}
        <TabsContent value="store" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {isRTL ? "بيانات المتجر" : "Store Listing"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "المعلومات المعروضة في متاجر التطبيقات" : "Information displayed on app stores"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف قصير (80 حرف)" : "Short Description (80 chars)"}</Label>
                  <Input value={config.storeShortDesc} onChange={(e) => handleChange("storeShortDesc", e.target.value)} maxLength={80} />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.storeShortDesc.length}/80</p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف قصير - عربي" : "Short Desc (Arabic)"}</Label>
                  <Input value={config.storeShortDescAr} onChange={(e) => handleChange("storeShortDescAr", e.target.value)} maxLength={80} dir="rtl" />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.storeShortDescAr.length}/80</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف كامل" : "Full Description"}</Label>
                  <Textarea value={config.storeFullDesc} onChange={(e) => handleChange("storeFullDesc", e.target.value)} rows={5} maxLength={4000} />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.storeFullDesc.length}/4000</p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "وصف كامل - عربي" : "Full Desc (Arabic)"}</Label>
                  <Textarea value={config.storeFullDescAr} onChange={(e) => handleChange("storeFullDescAr", e.target.value)} rows={5} maxLength={4000} dir="rtl" />
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{config.storeFullDescAr.length}/4000</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "تصنيف التطبيق" : "Category"}</Label>
                  <Select value={config.storeCategory} onValueChange={(v) => handleChange("storeCategory", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Parenting">Parenting</SelectItem>
                      <SelectItem value="Productivity">Productivity</SelectItem>
                      <SelectItem value="Tools">Tools</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "تصنيف المحتوى" : "Content Rating"}</Label>
                  <Select value={config.storeContentRating} onValueChange={(v) => handleChange("storeContentRating", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Everyone">Everyone</SelectItem>
                      <SelectItem value="Everyone 10+">Everyone 10+</SelectItem>
                      <SelectItem value="Teen">Teen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isRTL ? "بيانات المطور" : "Developer Info"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم المطور" : "Developer Name"}</Label>
                  <Input value={config.developerName} onChange={(e) => handleChange("developerName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "بريد المطور" : "Developer Email"}</Label>
                  <Input value={config.developerEmail} onChange={(e) => handleChange("developerEmail", e.target.value)} type="email" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "موقع المطور" : "Developer Website"}</Label>
                  <Input value={config.developerWebsite} onChange={(e) => handleChange("developerWebsite", e.target.value)} dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "رابط سياسة الخصوصية" : "Privacy Policy URL"}</Label>
                  <Input value={config.privacyPolicyUrl} onChange={(e) => handleChange("privacyPolicyUrl", e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "رابط شروط الاستخدام" : "Terms URL"}</Label>
                  <Input value={config.termsUrl} onChange={(e) => handleChange("termsUrl", e.target.value)} dir="ltr" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Crawler / SEO Tab */}
        <TabsContent value="crawler" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                {isRTL ? "بيانات الزواحف وتحسين الظهور" : "Crawler & SEO Data"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "إعدادات Open Graph و Schema.org الخاصة بصفحة التطبيق" : "Open Graph and Schema.org settings for the app page"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>OG Title</Label>
                  <Input value={config.appOgTitle} onChange={(e) => handleChange("appOgTitle", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>OG Image</Label>
                  <div className="flex items-center gap-3">
                    {config.appOgImage ? (
                      <div className="relative group">
                        <img src={config.appOgImage} alt="OG" className="h-14 w-24 rounded-lg border object-cover" />
                        <button
                          onClick={() => handleChange("appOgImage", "")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className={`h-14 w-24 rounded-lg border-2 border-dashed flex items-center justify-center ${isDark ? "border-gray-600" : "border-gray-300"}`}>
                        <Image className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex gap-2">
                        <Input value={config.appOgImage} onChange={(e) => handleChange("appOgImage", e.target.value)} placeholder="https://classi-fy.com/og-app.png" dir="ltr" className="flex-1" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingField === "appOgImage"}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/png,image/jpeg,image/webp";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleImageUpload("appOgImage", file);
                            };
                            input.click();
                          }}
                        >
                          {uploadingField === "appOgImage" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {isRTL ? "رفع" : "Upload"}
                        </Button>
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        {isRTL ? "يفضل 1200x630 — الرابط الكامل مطلوب لمحركات البحث" : "Recommended 1200×630 — full URL required for search engines"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>OG Description</Label>
                <Textarea value={config.appOgDescription} onChange={(e) => handleChange("appOgDescription", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "كلمات مفتاحية (إنجليزي)" : "Keywords (English)"}</Label>
                  <Input value={config.appKeywords} onChange={(e) => handleChange("appKeywords", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "كلمات مفتاحية (عربي)" : "Keywords (Arabic)"}</Label>
                  <Input value={config.appKeywordsAr} onChange={(e) => handleChange("appKeywordsAr", e.target.value)} dir="rtl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Schema.org Type</Label>
                <Select value={config.appSchemaType} onValueChange={(v) => handleChange("appSchemaType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MobileApplication">MobileApplication</SelectItem>
                    <SelectItem value="SoftwareApplication">SoftwareApplication</SelectItem>
                    <SelectItem value="WebApplication">WebApplication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {isRTL ? "الروابط العميقة والتحقق" : "Deep Links & Verification"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Deep Links</Label>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Android App Links</p>
                  </div>
                  <Switch checked={config.deepLinksEnabled} onCheckedChange={(v) => handleChange("deepLinksEnabled", v)} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>assetlinks.json</Label>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Android Digital Asset Links</p>
                  </div>
                  <Switch checked={config.assetlinksEnabled} onCheckedChange={(v) => handleChange("assetlinksEnabled", v)} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Apple Site Association</Label>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>iOS Universal Links</p>
                  </div>
                  <Switch checked={config.appleSiteAssociationEnabled} onCheckedChange={(v) => handleChange("appleSiteAssociationEnabled", v)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PWA Tab */}
        <TabsContent value="pwa" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                {isRTL ? "إعدادات التطبيق التقدمي (PWA)" : "Progressive Web App (PWA)"}
              </CardTitle>
              <CardDescription>
                {isRTL ? "إعدادات التثبيت عبر المتصفح" : "Browser install settings"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
                <div>
                  <Label>{isRTL ? "تفعيل PWA" : "Enable PWA"}</Label>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {isRTL ? "يسمح بتثبيت التطبيق من المتصفح" : "Allows installing the app from browser"}
                  </p>
                </div>
                <Switch checked={config.pwaEnabled} onCheckedChange={(v) => handleChange("pwaEnabled", v)} />
              </div>

              {config.pwaEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PWA Name</Label>
                      <Input value={config.pwaName} onChange={(e) => handleChange("pwaName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>PWA Short Name</Label>
                      <Input value={config.pwaShortName} onChange={(e) => handleChange("pwaShortName", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{isRTL ? "لون الثيم" : "Theme Color"}</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={config.pwaThemeColor} onChange={(e) => handleChange("pwaThemeColor", e.target.value)} className="w-14 h-10 p-1" />
                        <Input value={config.pwaThemeColor} onChange={(e) => handleChange("pwaThemeColor", e.target.value)} className="flex-1" dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? "لون الخلفية" : "Background Color"}</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={config.pwaBackgroundColor} onChange={(e) => handleChange("pwaBackgroundColor", e.target.value)} className="w-14 h-10 p-1" />
                        <Input value={config.pwaBackgroundColor} onChange={(e) => handleChange("pwaBackgroundColor", e.target.value)} className="flex-1" dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{isRTL ? "وضع العرض" : "Display Mode"}</Label>
                      <Select value={config.pwaDisplayMode} onValueChange={(v) => handleChange("pwaDisplayMode", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standalone">Standalone</SelectItem>
                          <SelectItem value="fullscreen">Fullscreen</SelectItem>
                          <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                          <SelectItem value="browser">Browser</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? "رابط البداية" : "Start URL"}</Label>
                    <Input value={config.pwaStartUrl} onChange={(e) => handleChange("pwaStartUrl", e.target.value)} placeholder="/" dir="ltr" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
