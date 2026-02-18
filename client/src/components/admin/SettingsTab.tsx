import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Key, Mail, Settings, Volume2, Shield, User } from "lucide-react";

interface OTPSettings {
  enabled: boolean;
  provider: string;
  expiryMinutes: number;
  codeLength: number;
  maxAttempts: number;
}

interface NotificationSettings {
  soundEnabled: boolean;
  soundChoice: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

const NOTIFICATION_SOUNDS = [
  { value: "default", label: i18next.t("admin.settingsTab.defaultSound") },
  { value: "chime", label: i18next.t("admin.settingsTab.ringSound") },
  { value: "bell", label: i18next.t("admin.settingsTab.bellSound") },
  { value: "pop", label: i18next.t("admin.settingsTab.bubbleSound") },
  { value: "ding", label: i18next.t("admin.settingsTab.dingSound") },
];

export function SettingsTab({
  token }: { token: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const [otpSettings, setOtpSettings] = useState<OTPSettings>({
    enabled: true,
    provider: "email",
    expiryMinutes: 5,
    codeLength: 6,
    maxAttempts: 3,
  });

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    soundChoice: "default",
    pushEnabled: false,
    emailEnabled: true,
  });

  const { data: settingsData } = useQuery({
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
    if (settingsData) {
      if (settingsData.otp) {
        setOtpSettings(settingsData.otp);
      }
      if (settingsData.notifications) {
        setNotifSettings(settingsData.notifications);
      }
    }
  }, [settingsData]);

  // Fetch admin profile (username + masked email)
  const { data: profileData } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const res = await fetch("/api/admin/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setMessage("تم حفظ الإعدادات بنجاح");
      setTimeout(() => setMessage(""), 3000);
      queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] });
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setMessage("تم تحديث بريد الاستعادة بنجاح");
        setRecoveryEmail("");
        setTimeout(() => setMessage(""), 3000);
        queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      }
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("كلمات المرور غير متطابقة");
      }
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setMessage("تم تغيير كلمة المرور بنجاح");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setMessage(""), 3000);
      }
    },
    onError: (error: any) => {
      setMessage(`خطأ: ${error.message}`);
    },
  });

  const handleSaveOTP = () => {
    saveSettingsMutation.mutate({ otp: otpSettings });
  };

  const handleSaveNotifications = () => {
    saveSettingsMutation.mutate({ notifications: notifSettings });
  };

  return (
    <div className="p-4 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">الإعدادات - Settings</h2>

      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-green-800">
          {message}
        </div>
      )}

      <Tabs defaultValue="otp" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="otp" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>OTP</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span>الإشعارات</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>الحساب</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            <span>API</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="otp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                إعدادات OTP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>تفعيل OTP</Label>
                <Switch
                  checked={otpSettings.enabled}
                  onCheckedChange={(checked) => setOtpSettings({ ...otpSettings, enabled: checked })}
                  data-testid="switch-otp-enabled"
                />
              </div>

              <div>
                <Label>مزود OTP</Label>
                <Select
                  value={otpSettings.provider}
                  onValueChange={(value) => setOtpSettings({ ...otpSettings, provider: value })}
                >
                  <SelectTrigger data-testid="select-otp-provider">
                    <SelectValue placeholder="اختر المزود" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">البريد الإلكتروني</SelectItem>
                    <SelectItem value="sms">رسالة SMS</SelectItem>
                    <SelectItem value="both">كلاهما</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>مدة صلاحية الكود (دقائق)</Label>
                <Input
                  type="number"
                  value={otpSettings.expiryMinutes}
                  onChange={(e) => setOtpSettings({ ...otpSettings, expiryMinutes: parseInt(e.target.value) || 5 })}
                  min={1}
                  max={30}
                  data-testid="input-otp-expiry"
                />
              </div>

              <div>
                <Label>طول الكود</Label>
                <Select
                  value={otpSettings.codeLength.toString()}
                  onValueChange={(value) => setOtpSettings({ ...otpSettings, codeLength: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-otp-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 أرقام</SelectItem>
                    <SelectItem value="6">6 أرقام</SelectItem>
                    <SelectItem value="8">8 أرقام</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>الحد الأقصى للمحاولات</Label>
                <Input
                  type="number"
                  value={otpSettings.maxAttempts}
                  onChange={(e) => setOtpSettings({ ...otpSettings, maxAttempts: parseInt(e.target.value) || 3 })}
                  min={1}
                  max={10}
                  data-testid="input-otp-max-attempts"
                />
              </div>

              <Button onClick={handleSaveOTP} disabled={saveSettingsMutation.isPending} data-testid="button-save-otp">
                {saveSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات OTP"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                إعدادات الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <Label>تفعيل صوت الإشعارات</Label>
                </div>
                <Switch
                  checked={notifSettings.soundEnabled}
                  onCheckedChange={(checked) => setNotifSettings({ ...notifSettings, soundEnabled: checked })}
                  data-testid="switch-notification-sound"
                />
              </div>

              {notifSettings.soundEnabled && (
                <div>
                  <Label>نوع الصوت</Label>
                  <Select
                    value={notifSettings.soundChoice}
                    onValueChange={(value) => setNotifSettings({ ...notifSettings, soundChoice: value })}
                  >
                    <SelectTrigger data-testid="select-notification-sound">
                      <SelectValue placeholder="اختر الصوت" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_SOUNDS.map((sound) => (
                        <SelectItem key={sound.value} value={sound.value}>
                          {sound.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <Label>الإشعارات المدفوعة (Push)</Label>
                </div>
                <Switch
                  checked={notifSettings.pushEnabled}
                  onCheckedChange={(checked) => setNotifSettings({ ...notifSettings, pushEnabled: checked })}
                  data-testid="switch-push-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <Label>إشعارات البريد الإلكتروني</Label>
                </div>
                <Switch
                  checked={notifSettings.emailEnabled}
                  onCheckedChange={(checked) => setNotifSettings({ ...notifSettings, emailEnabled: checked })}
                  data-testid="switch-email-notifications"
                />
              </div>

              <Button onClick={handleSaveNotifications} disabled={saveSettingsMutation.isPending} data-testid="button-save-notifications">
                {saveSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات الإشعارات"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <div className="space-y-6">
            {/* Admin Profile Info */}
            {profileData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    معلومات الحساب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">اسم المستخدم</span>
                    <span className="font-mono font-bold">{profileData.username}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">بريد الاستعادة</span>
                    <span className="font-mono text-sm text-muted-foreground">{profileData.maskedEmail}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">الصلاحية</span>
                    <span className="font-mono">{profileData.role}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  تحديث بريد الاستعادة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  البريد الإلكتروني يُستخدم فقط لاستعادة كلمة المرور ولا يظهر في أي مكان عام
                </p>
                <Input
                  type="email"
                  placeholder="البريد الإلكتروني للاستعادة"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  data-testid="input-recovery-email"
                />
                <Button
                  onClick={() => changeEmailMutation.mutate()}
                  disabled={!recoveryEmail || changeEmailMutation.isPending}
                  data-testid="button-update-recovery-email"
                >
                  {changeEmailMutation.isPending ? "جاري التحديث..." : "تحديث بريد الاستعادة"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تغيير كلمة المرور</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="password"
                  placeholder="كلمة المرور الحالية"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="input-current-password"
                />
                <Input
                  type="password"
                  placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
                <Input
                  type="password"
                  placeholder="تأكيد كلمة المرور الجديدة"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
                <Button
                  onClick={() => changePasswordMutation.mutate()}
                  disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? "جاري التغيير..." : "تغيير كلمة المرور"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                مفاتيح API والتكاملات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                يتم إدارة هذه المفاتيح عبر متغيرات البيئة. قم بتحديث ملف .env:
              </p>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
                <div>JWT_SECRET=your-secret-key</div>
                <div>RESEND_API_KEY=your-resend-key</div>
                <div>TWILIO_SID=your-twilio-sid</div>
                <div>TWILIO_AUTH_TOKEN=your-twilio-token</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
