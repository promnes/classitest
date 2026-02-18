import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { School, Eye, EyeOff } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";

export default function SchoolLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({ title: t("schoolLogin.enterCredentialsRequired"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/school/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t("schoolLogin.loginFailed"));
      }

      localStorage.setItem("schoolToken", data.data.token);
      localStorage.setItem("schoolData", JSON.stringify(data.data.school));

      toast({ title: `${t("schoolLogin.welcome")} ${data.data.school.name}` });
      setLocation("/school/dashboard");
    } catch (error: any) {
      toast({ title: error.message || t("schoolLogin.loginFailed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-4 relative">
      <div className="absolute top-4 ltr:right-4 rtl:left-4 z-50"><LanguageSelector /></div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <School className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{t("schoolLogin.title")}</CardTitle>
          <CardDescription>
            {t("schoolLogin.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("schoolLogin.username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("schoolLogin.enterUsername")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("schoolLogin.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("schoolLogin.enterPassword")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? t("schoolLogin.loggingIn") : t("schoolLogin.login")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>{t("schoolLogin.noAccount")}</p>
            <a
              href="https://wa.me/+201XXXXXXXXX?text=أريد%20فتح%20حساب%20مدرسة%20في%20Classify"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {t("schoolLogin.contactSupport")}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
