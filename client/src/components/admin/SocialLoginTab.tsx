import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Chrome, 
  Facebook, 
  Apple, 
  Twitter, 
  Github, 
  Linkedin, 
  Monitor,
  MessageCircle,
  Plus,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Power,
  PowerOff,
  RefreshCw
} from "lucide-react";

interface SocialProvider {
  id: string;
  provider: string;
  displayName: string;
  displayNameAr: string | null;
  iconUrl: string | null;
  iconName: string | null;
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string | null;
  scopes: string | null;
  isActive: boolean;
  sortOrder: number;
  settings: Record<string, any> | null;
}

const iconMap: Record<string, any> = {
  Chrome,
  Facebook,
  Apple,
  Twitter,
  Github,
  Linkedin,
  Monitor,
  MessageCircle,
};

export const SocialLoginTab = () => {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'ar';
  
  const [editingProvider, setEditingProvider] = useState<SocialProvider | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Partial<SocialProvider>>({});

  const { data: providersData, isLoading } = useQuery({
    queryKey: ["/api/admin/social-login-providers"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  // queryClient extracts .data automatically, so providersData is already the array
  const providers: SocialProvider[] = Array.isArray(providersData) ? providersData : [];

  const getErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) {
      return isRTL ? "فشلت تهيئة الوسائل الافتراضية" : "Failed to initialize default providers";
    }

    const rawMessage = error.message.replace(/^\d+:\s*/, "");

    try {
      const parsed = JSON.parse(rawMessage);
      if (parsed?.message) return parsed.message;
    } catch {
      return rawMessage;
    }

    return rawMessage;
  };

  const initializeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/social-login-providers/initialize"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-login-providers"] });
      toast({
        title: isRTL ? "تمت التهيئة بنجاح" : "Initialization successful",
        description: isRTL ? "تم تجهيز الوسائل الافتراضية" : "Default social providers have been initialized",
      });
    },
    onError: (error) => {
      toast({
        title: isRTL ? "فشل التهيئة" : "Initialization failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SocialProvider> }) =>
      apiRequest("PUT", `/api/admin/social-login-providers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-login-providers"] });
      setEditingProvider(null);
      setFormData({});
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/admin/social-login-providers/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-login-providers"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/social-login-providers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-login-providers"] });
    },
  });

  const handleEdit = (provider: SocialProvider) => {
    setEditingProvider(provider);
    setFormData({
      displayName: provider.displayName,
      displayNameAr: provider.displayNameAr || "",
      iconUrl: provider.iconUrl || "",
      iconName: provider.iconName || "",
      clientId: provider.clientId || "",
      clientSecret: "",
      redirectUri: provider.redirectUri || "",
      scopes: provider.scopes || "",
    });
  };

  const handleSave = () => {
    if (editingProvider) {
      const dataToSave = { ...formData };
      if (!dataToSave.clientSecret) {
        delete dataToSave.clientSecret;
      }
      updateMutation.mutate({ id: editingProvider.id, data: dataToSave });
    }
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Monitor;
    return iconMap[iconName] || Monitor;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${isDark ? "text-white" : "text-gray-800"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          {isRTL ? "إعدادات تسجيل الدخول الاجتماعي" : "Social Login Settings"}
        </h2>
        
        {providers.length === 0 && (
          <button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            data-testid="button-initialize-providers"
          >
            <RefreshCw className={`w-4 h-4 ${initializeMutation.isPending ? "animate-spin" : ""}`} />
            {isRTL ? "تهيئة الوسائل الافتراضية" : "Initialize Default Providers"}
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {providers.map((provider: SocialProvider) => {
          const IconComponent = getIcon(provider.iconName);
          const isEditing = editingProvider?.id === provider.id;

          return (
            <div
              key={provider.id}
              className={`rounded-xl border-2 ${
                isDark 
                  ? provider.isActive ? "bg-gray-800 border-green-500" : "bg-gray-800 border-gray-600"
                  : provider.isActive ? "bg-white border-green-500" : "bg-white border-gray-200"
              } p-4 transition-all`}
            >
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-8 h-8 text-purple-500" />
                      <span className="font-bold text-lg">{provider.provider}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
                        data-testid={`button-save-${provider.provider}`}
                      >
                        <Save className="w-4 h-4" />
                        {isRTL ? "حفظ" : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProvider(null);
                          setFormData({});
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
                        data-testid={`button-cancel-${provider.provider}`}
                      >
                        <X className="w-4 h-4" />
                        {isRTL ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {isRTL ? "الاسم (إنجليزي)" : "Display Name (English)"}
                      </label>
                      <input
                        type="text"
                        value={formData.displayName || ""}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        data-testid={`input-display-name-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {isRTL ? "الاسم (عربي)" : "Display Name (Arabic)"}
                      </label>
                      <input
                        type="text"
                        value={formData.displayNameAr || ""}
                        onChange={(e) => setFormData({ ...formData, displayNameAr: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        dir="rtl"
                        data-testid={`input-display-name-ar-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={formData.clientId || ""}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        placeholder="Enter Client ID"
                        data-testid={`input-client-id-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Client Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets[provider.id] ? "text" : "password"}
                          value={formData.clientSecret || ""}
                          onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                          }`}
                          placeholder="Enter new secret (leave empty to keep current)"
                          data-testid={`input-client-secret-${provider.provider}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets({ ...showSecrets, [provider.id]: !showSecrets[provider.id] })}
                          className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showSecrets[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Redirect URI
                      </label>
                      <input
                        type="text"
                        value={formData.redirectUri || ""}
                        onChange={(e) => setFormData({ ...formData, redirectUri: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        placeholder="/api/auth/callback/provider"
                        data-testid={`input-redirect-uri-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Scopes ({isRTL ? "مفصولة بفاصلة" : "comma separated"})
                      </label>
                      <input
                        type="text"
                        value={formData.scopes || ""}
                        onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        placeholder="email,profile"
                        data-testid={`input-scopes-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {isRTL ? "رابط الأيقونة المخصصة" : "Custom Icon URL"}
                      </label>
                      <input
                        type="text"
                        value={formData.iconUrl || ""}
                        onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        placeholder="https://..."
                        data-testid={`input-icon-url-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {isRTL ? "اسم الأيقونة (Lucide)" : "Icon Name (Lucide)"}
                      </label>
                      <select
                        value={formData.iconName || ""}
                        onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        data-testid={`select-icon-name-${provider.provider}`}
                      >
                        <option value="">-- Select Icon --</option>
                        <option value="Chrome">Chrome (Google)</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Apple">Apple</option>
                        <option value="Twitter">Twitter</option>
                        <option value="Github">Github</option>
                        <option value="Linkedin">LinkedIn</option>
                        <option value="Monitor">Monitor (Microsoft)</option>
                        <option value="MessageCircle">MessageCircle (Discord)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      provider.isActive 
                        ? "bg-gradient-to-br from-purple-500 to-blue-500" 
                        : isDark ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <IconComponent className={`w-6 h-6 ${provider.isActive ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{isRTL && provider.displayNameAr ? provider.displayNameAr : provider.displayName}</h3>
                      <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {provider.provider} • {provider.clientId ? (isRTL ? "مُعَد" : "Configured") : (isRTL ? "غير مُعَد" : "Not Configured")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      provider.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {provider.isActive ? (isRTL ? "مفعل" : "Active") : (isRTL ? "معطل" : "Inactive")}
                    </span>
                    
                    <button
                      onClick={() => toggleMutation.mutate(provider.id)}
                      disabled={toggleMutation.isPending}
                      className={`p-2 rounded-lg transition-colors ${
                        provider.isActive
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-green-100 text-green-600 hover:bg-green-200"
                      }`}
                      title={provider.isActive ? (isRTL ? "إيقاف" : "Disable") : (isRTL ? "تفعيل" : "Enable")}
                      data-testid={`button-toggle-${provider.provider}`}
                    >
                      {provider.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(provider)}
                      className={`p-2 rounded-lg ${
                        isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
                      } transition-colors`}
                      title={isRTL ? "تعديل" : "Edit"}
                      data-testid={`button-edit-${provider.provider}`}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm(isRTL ? "هل تريد حذف هذا الوسيلة؟" : "Delete this provider?")) {
                          deleteMutation.mutate(provider.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      title={isRTL ? "حذف" : "Delete"}
                      data-testid={`button-delete-${provider.provider}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {providers.length === 0 && (
        <div className={`text-center py-12 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">
            {isRTL ? "لا توجد وسائل تسجيل دخول. اضغط على الزر أعلاه لتهيئة الوسائل الافتراضية." : "No login providers found. Click the button above to initialize default providers."}
          </p>
        </div>
      )}
    </div>
  );
};
