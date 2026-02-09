import { Component, type ErrorInfo, type ReactNode, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Mail, Phone, MessageCircle, Home, Send } from "lucide-react";

interface SupportSettings {
  supportEmail?: string;
  supportPhone?: string;
  whatsappNumber?: string;
  telegramUsername?: string;
  errorPageTitle?: string;
  errorPageMessage?: string;
  showContactOnError?: boolean;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

function ErrorFallback({ 
  error, 
  onReset 
}: { 
  error: Error | null; 
  onReset: () => void;
}) {
  const [support, setSupport] = useState<SupportSettings>({
    errorPageTitle: "حدث خطأ غير متوقع",
    errorPageMessage: "نأسف على هذا الخطأ. يرجى التواصل مع الدعم الفني.",
    showContactOnError: true,
    supportEmail: "support@classify.app",
  });

  useEffect(() => {
    fetch("/api/support-settings")
      .then(res => res.json())
      .then(data => {
        if (data?.data) {
          setSupport(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const isRTL = document.documentElement.lang === 'ar' || 
                document.documentElement.dir === 'rtl' ||
                localStorage.getItem('i18nextLng') === 'ar';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl text-red-600 dark:text-red-400">
            {support.errorPageTitle || "حدث خطأ غير متوقع"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600 dark:text-gray-300">
            {support.errorPageMessage || "نأسف على هذا الخطأ. يرجى التواصل مع الدعم الفني."}
          </p>

          {process.env.NODE_ENV === "development" && error && (
            <details className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 mb-2">
                التفاصيل التقنية
              </summary>
              <pre className="overflow-auto text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap" dir="ltr">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onReset} className="gap-2" data-testid="button-retry">
              <RefreshCw className="w-4 h-4" />
              {isRTL ? "حاول مرة أخرى" : "Try Again"}
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="gap-2" data-testid="button-go-home">
              <Home className="w-4 h-4" />
              {isRTL ? "الصفحة الرئيسية" : "Go Home"}
            </Button>
          </div>

          {support.showContactOnError && (
            <div className="pt-4 border-t dark:border-gray-700">
              <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                {isRTL ? "هل تحتاج مساعدة؟" : "Need help?"}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {support.supportEmail && (
                  <a
                    href={`mailto:${support.supportEmail}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm"
                    data-testid="link-support-email"
                  >
                    <Mail className="w-4 h-4" />
                    {support.supportEmail}
                  </a>
                )}
                {support.supportPhone && (
                  <a
                    href={`tel:${support.supportPhone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-sm"
                    data-testid="link-support-phone"
                  >
                    <Phone className="w-4 h-4" />
                    {support.supportPhone}
                  </a>
                )}
                {support.whatsappNumber && (
                  <a
                    href={`https://wa.me/${support.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-sm"
                    data-testid="link-support-whatsapp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
                {support.telegramUsername && (
                  <a
                    href={`https://t.me/${support.telegramUsername.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors text-sm"
                    data-testid="link-support-telegram"
                  >
                    <Send className="w-4 h-4" />
                    Telegram
                  </a>
                )}
              </div>
              {support.workingDays && (
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
                  {isRTL ? "ساعات العمل" : "Working Hours"}: {support.workingDays}{" "}
                  {support.workingHoursStart && support.workingHoursEnd && (
                    <>({support.workingHoursStart} - {support.workingHoursEnd})</>
                  )}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    
    if (process.env.NODE_ENV === "production") {
      console.log("Error logged for production monitoring");
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
