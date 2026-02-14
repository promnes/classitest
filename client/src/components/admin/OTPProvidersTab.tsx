import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Smartphone,
  Phone,
  MessageSquare,
  Settings,
  Save,
  X,
  Power,
  PowerOff,
  RefreshCw,
  Clock,
  Hash,
  Shield
} from "lucide-react";

interface OTPProvider {
  id: string;
  provider: string;
  displayName: string;
  displayNameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  iconName: string | null;
  isActive: boolean;
  sortOrder: number;
  codeLength: number;
  expiryMinutes: number;
  maxAttempts: number;
  cooldownMinutes: number;
  settings: Record<string, any> | null;
}

const iconMap: Record<string, any> = {
  Mail,
  Smartphone,
  Phone,
  MessageSquare,
};

export const OTPProvidersTab = () => {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'ar';
  
  const [editingProvider, setEditingProvider] = useState<OTPProvider | null>(null);
  const [formData, setFormData] = useState<Partial<OTPProvider>>({});

  const { data: providersData, isLoading } = useQuery({
    queryKey: ["/api/admin/otp-providers"],
    refetchOnMount: "always",
    staleTime: 0,
  });

  const providers: OTPProvider[] = Array.isArray(providersData) ? providersData : [];

  const getErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) {
      return t("adminOtp.initFailed");
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
    mutationFn: () => apiRequest("POST", "/api/admin/otp-providers/initialize"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/otp-providers"] });
      toast({
        title: t("adminOtp.initSuccess"),
        description: t("adminOtp.initSuccessDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("adminOtp.initFailedTitle"),
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OTPProvider> }) =>
      apiRequest("PUT", `/api/admin/otp-providers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/otp-providers"] });
      setEditingProvider(null);
      setFormData({});
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PUT", `/api/admin/otp-providers/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/otp-providers"] });
    },
  });

  const handleEdit = (provider: OTPProvider) => {
    setEditingProvider(provider);
    setFormData({
      displayName: provider.displayName,
      displayNameAr: provider.displayNameAr || "",
      description: provider.description || "",
      descriptionAr: provider.descriptionAr || "",
      iconName: provider.iconName || "",
      sortOrder: provider.sortOrder,
      codeLength: provider.codeLength,
      expiryMinutes: provider.expiryMinutes,
      maxAttempts: provider.maxAttempts,
      cooldownMinutes: provider.cooldownMinutes,
    });
  };

  const handleSave = () => {
    if (editingProvider) {
      updateMutation.mutate({ id: editingProvider.id, data: formData });
    }
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Mail;
    return iconMap[iconName] || Mail;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${isDark ? "text-white" : "text-gray-800"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          {t("adminOtp.title")}
        </h2>
        
        {providers.length === 0 && (
          <button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            data-testid="button-initialize-otp-providers"
          >
            <RefreshCw className={`w-4 h-4 ${initializeMutation.isPending ? "animate-spin" : ""}`} />
            {t("adminOtp.initProviders")}
          </button>
        )}
      </div>

      <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {isRTL 
            ? "ملاحظة: البريد الإلكتروني يستخدم خدمة Resend المهيأة. الرسائل النصية تحتاج إعداد Twilio."
            : "Note: Email uses the configured Resend service. SMS requires Twilio configuration."
          }
        </p>
      </div>

      <div className="grid gap-4">
        {providers.map((provider: OTPProvider) => {
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
                      <IconComponent className="w-8 h-8 text-blue-500" />
                      <span className="font-bold text-lg">{provider.provider.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
                        data-testid={`button-save-otp-${provider.provider}`}
                      >
                        <Save className="w-4 h-4" />
                        {t("common.save")}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProvider(null);
                          setFormData({});
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
                        data-testid={`button-cancel-otp-${provider.provider}`}
                      >
                        <X className="w-4 h-4" />
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("adminOtp.displayNameEn")}
                      </label>
                      <input
                        type="text"
                        value={formData.displayName || ""}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        data-testid={`input-otp-display-name-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("adminOtp.displayNameAr")}
                      </label>
                      <input
                        type="text"
                        value={formData.displayNameAr || ""}
                        onChange={(e) => setFormData({ ...formData, displayNameAr: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        data-testid={`input-otp-display-name-ar-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("adminOtp.descriptionEn")}
                      </label>
                      <input
                        type="text"
                        value={formData.description || ""}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        data-testid={`input-otp-description-${provider.provider}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t("adminOtp.descriptionAr")}
                      </label>
                      <input
                        type="text"
                        value={formData.descriptionAr || ""}
                        onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                        }`}
                        data-testid={`input-otp-description-ar-${provider.provider}`}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {t("adminOtp.otpSettings")}
                    </h4>
                    <div className="grid md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t("adminOtp.priority")}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={formData.sortOrder ?? 0}
                          onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                          }`}
                          data-testid={`input-otp-priority-${provider.provider}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {t("adminOtp.codeLength")}
                        </label>
                        <input
                          type="number"
                          min={4}
                          max={8}
                          value={formData.codeLength || 6}
                          onChange={(e) => setFormData({ ...formData, codeLength: parseInt(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                          }`}
                          data-testid={`input-otp-code-length-${provider.provider}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t("adminOtp.expiryMinutes")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={formData.expiryMinutes || 5}
                          onChange={(e) => setFormData({ ...formData, expiryMinutes: parseInt(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                          }`}
                          data-testid={`input-otp-expiry-${provider.provider}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t("adminOtp.maxAttempts")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={formData.maxAttempts || 3}
                          onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                          }`}
                          data-testid={`input-otp-max-attempts-${provider.provider}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {t("adminOtp.cooldownMinutes")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={formData.cooldownMinutes || 1}
                          onChange={(e) => setFormData({ ...formData, cooldownMinutes: parseInt(e.target.value) })}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                          }`}
                          data-testid={`input-otp-cooldown-${provider.provider}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      provider.isActive 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : "bg-gray-100 dark:bg-gray-700"
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        provider.isActive ? "text-green-600" : "text-gray-400"
                      }`} />
                    </div>
                    <div>
                      <div className="font-bold text-lg">
                        {isRTL ? provider.displayNameAr || provider.displayName : provider.displayName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {isRTL ? provider.descriptionAr || provider.description : provider.description}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          isDark ? "bg-gray-700" : "bg-gray-100"
                        }`}>
                          {provider.codeLength} {t("adminOtp.digits")}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          isDark ? "bg-gray-700" : "bg-gray-100"
                        }`}>
                          {provider.expiryMinutes} {t("adminOtp.min")}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          isDark ? "bg-gray-700" : "bg-gray-100"
                        }`}>
                          {provider.maxAttempts} {t("adminOtp.attempts")}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          isDark ? "bg-gray-700" : "bg-gray-100"
                        }`}>
                          {t("adminOtp.priority")}: {provider.sortOrder}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(provider)}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        isDark 
                          ? "bg-gray-700 hover:bg-gray-600" 
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                      data-testid={`button-edit-otp-${provider.provider}`}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate(provider.id)}
                      disabled={toggleMutation.isPending}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        provider.isActive
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : isDark 
                            ? "bg-gray-600 hover:bg-gray-500 text-gray-300"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                      }`}
                      data-testid={`button-toggle-otp-${provider.provider}`}
                    >
                      {provider.isActive ? (
                        <>
                          <Power className="w-4 h-4" />
                          {t("common.active")}
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-4 h-4" />
                          {t("common.inactive")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {providers.length === 0 && !isLoading && (
        <div className={`text-center py-12 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold mb-2">
            {t("adminOtp.noProviders")}
          </h3>
          <p className="text-gray-500 mb-4">
            {isRTL 
              ? "اضغط على الزر أعلاه لتهيئة وسائل OTP الافتراضية"
              : "Click the button above to initialize default OTP providers"
            }
          </p>
        </div>
      )}
    </div>
  );
};
