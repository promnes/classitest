import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { LanguageSelector } from "@/components/LanguageSelector";
import { 
  Gamepad2, Star, Sparkles, ArrowLeft, Loader2, CheckCircle, 
  KeyRound, UserPlus, User, QrCode, Camera, Image, X, Heart, Clock, XCircle
} from "lucide-react";
// @ts-ignore
import jsQR from "jsqr";

interface SavedChildInfo {
  childId: string;
  displayName: string;
  token: string;
  savedAt: string;
  avatarColor?: string;
}

type LoginStep = "welcome" | "name_entry" | "waiting_approval" | "new_link";

const AVATAR_COLORS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-red-500",
  "from-indigo-500 to-violet-500",
];

export const ChildLink = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<LoginStep>("welcome");
  const [childName, setChildName] = useState("");
  const [code, setCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedChildren, setSavedChildren] = useState<SavedChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<SavedChildInfo | null>(null);
  const [method, setMethod] = useState<"code" | "qr">("code");
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const isScanningRef = useRef(false); // Fix for closure bug in camera scanning
  
  // Login request state
  const [loginRequestId, setLoginRequestId] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<"pending" | "approved" | "rejected" | "expired">("pending");
  const [pollingInterval, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check for saved sessions on mount - supports multiple children
  useEffect(() => {
    // First check new format (array of children)
    const savedMultiple = localStorage.getItem("savedChildren");
    if (savedMultiple) {
      try {
        const parsed = JSON.parse(savedMultiple);
        if (Array.isArray(parsed)) {
          setSavedChildren(parsed);
        }
      } catch (e) {
        localStorage.removeItem("savedChildren");
      }
    } else {
      // Migrate old single child format to new multi-child format
      const savedSingle = localStorage.getItem("rememberedChild");
      if (savedSingle) {
        try {
          const parsed = JSON.parse(savedSingle);
          const newFormat: SavedChildInfo = {
            ...parsed,
            avatarColor: AVATAR_COLORS[0]
          };
          setSavedChildren([newFormat]);
          localStorage.setItem("savedChildren", JSON.stringify([newFormat]));
          localStorage.removeItem("rememberedChild");
        } catch (e) {
          localStorage.removeItem("rememberedChild");
        }
      }
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Quick login with cached token for selected child
  const quickLoginMutation = useMutation({
    mutationFn: async (child: SavedChildInfo) => {
      if (!child?.token) throw new Error("NO_SESSION");
      const res = await fetch("/api/child/verify-token", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${child.token}`
        },
      });
      if (!res.ok) {
        // Remove this child from saved list
        const updatedChildren = savedChildren.filter(c => c.childId !== child.childId);
        setSavedChildren(updatedChildren);
        localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
        throw new Error("SESSION_EXPIRED");
      }
      await res.json();
      return child;
    },
    onSuccess: (child) => {
      localStorage.setItem("childToken", child.token);
      localStorage.setItem("childId", child.childId);
      navigate("/child-games");
    },
    onError: () => {
      setSelectedChild(null);
      setStep("name_entry");
    },
  });

  // Request login from parent - sends notification and waits for approval
  const requestLoginMutation = useMutation({
    mutationFn: async () => {
      if (!childName.trim()) throw new Error("ENTER_NAME_FIRST");
      const res = await fetch("/api/child/request-login-by-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childName: childName.trim() }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "SEND_FAILED");
      }
      return res.json();
    },
    onSuccess: (response) => {
      const requestId = response.data?.requestId;
      if (requestId) {
        setLoginRequestId(requestId);
        setLoginStatus("pending");
        setStep("waiting_approval");
        startPolling(requestId);
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.message);
    },
  });

  // Start polling for login request status
  const startPolling = (requestId: string) => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/child/login-request/${requestId}/status`);
        if (!res.ok) {
          clearInterval(interval);
          setLoginStatus("expired");
          return;
        }
        
        const data = await res.json();
        const status = data.data?.status;
        
        if (status === "approved" && data.data?.token) {
          clearInterval(interval);
          setLoginStatus("approved");
          
          // Auto-login
          localStorage.setItem("childToken", data.data.token);
          
          // Get child info from the token
          try {
            const tokenParts = data.data.token.split(".");
            const payload = JSON.parse(atob(tokenParts[1]));
            localStorage.setItem("childId", payload.childId);
            
            // Save to remembered children if remember device is on
            if (rememberDevice) {
              const newChild: SavedChildInfo = {
                childId: payload.childId,
                displayName: childName,
                token: data.data.token,
                savedAt: new Date().toISOString(),
                avatarColor: AVATAR_COLORS[savedChildren.length % AVATAR_COLORS.length]
              };
              const existingIndex = savedChildren.findIndex(c => c.childId === payload.childId);
              let updatedChildren: SavedChildInfo[];
              if (existingIndex >= 0) {
                updatedChildren = [...savedChildren];
                updatedChildren[existingIndex] = { ...savedChildren[existingIndex], ...newChild };
              } else {
                updatedChildren = [...savedChildren, newChild];
              }
              setSavedChildren(updatedChildren);
              localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
            }
          } catch (e) {
            console.error("Error parsing token:", e);
          }
          
          // Navigate after a short delay to show success
          setTimeout(() => {
            navigate("/child-games");
          }, 1500);
        } else if (status === "rejected") {
          clearInterval(interval);
          setLoginStatus("rejected");
        } else if (status === "expired") {
          clearInterval(interval);
          setLoginStatus("expired");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000); // Poll every 2 seconds

    setPollingIntervalId(interval);

    // Auto-stop polling after 15 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (loginStatus === "pending") {
        setLoginStatus("expired");
      }
    }, 15 * 60 * 1000);
  };

  // Cancel login request
  const cancelRequest = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    setLoginRequestId(null);
    setLoginStatus("pending");
    setStep("name_entry");
  };

  // New child link - first time setup
  const newLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/child/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childName: childName.trim(), code: code.toUpperCase() }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "INVALID_CODE");
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("childToken", data.data.token);
      localStorage.setItem("childId", data.data.childId);
      // Add new child to saved children array
      const newChild: SavedChildInfo = {
        childId: data.data.childId,
        displayName: childName,
        token: data.data.token,
        savedAt: new Date().toISOString(),
        avatarColor: AVATAR_COLORS[savedChildren.length % AVATAR_COLORS.length]
      };
      const updatedChildren = [...savedChildren, newChild];
      setSavedChildren(updatedChildren);
      localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
      navigate("/child-games");
    },
    onError: (error: any) => {
      const errorKey = error.message;
      const translatedErrors: Record<string, string> = {
        "INVALID_CODE": t("invalidCode") || "الكود غير صحيح",
      };
      setErrorMessage(translatedErrors[errorKey] || error.message);
    },
  });

  // QR code handling - with proper error handling and loading state
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingQR(true);
    setErrorMessage("");
    
    const reader = new FileReader();
    
    reader.onerror = () => {
      setIsProcessingQR(false);
      setErrorMessage(t("imageLoadFailed") || "فشل تحميل الصورة");
    };
    
    reader.onload = (event) => {
      const img = new window.Image();
      
      img.onerror = () => {
        setIsProcessingQR(false);
        setErrorMessage(t("imageLoadFailed") || "فشل تحميل الصورة");
      };
      
      img.onload = () => {
        try {
          const canvas = canvasRef.current;
          if (!canvas) {
            setIsProcessingQR(false);
            return;
          }
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setIsProcessingQR(false);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (qrCode) {
            setCode(qrCode.data.toUpperCase());
            setErrorMessage("");
          } else {
            setErrorMessage(t("noQRFound") || "لم يتم العثور على رمز QR في الصورة");
          }
        } catch (error) {
          console.error("QR decode error:", error);
          setErrorMessage(t("qrProcessError") || "حدث خطأ أثناء معالجة الصورة");
        } finally {
          setIsProcessingQR(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [t]);

  const startCameraScanning = async () => {
    isScanningRef.current = true;
    setIsScanning(true);
    setErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanQRFromCamera();
      }
    } catch (err) {
      setErrorMessage(t("cameraAccessDenied") || "لم يتم السماح بالوصول للكاميرا");
      isScanningRef.current = false;
      setIsScanning(false);
    }
  };

  const stopCameraScanning = useCallback(() => {
    isScanningRef.current = false;
    setIsScanning(false);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const scanQRFromCamera = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scan = () => {
      // Use ref instead of state to get current value (fixes closure bug)
      if (!isScanningRef.current) return;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (qrCode) {
            setCode(qrCode.data.toUpperCase());
            stopCameraScanning();
            return;
          }
        } catch (error) {
          console.error("Camera scan error:", error);
        }
      }
      requestAnimationFrame(scan);
    };
    
    requestAnimationFrame(scan);
  }, [stopCameraScanning]);

  const removeChild = (childId: string) => {
    const updatedChildren = savedChildren.filter(c => c.childId !== childId);
    setSavedChildren(updatedChildren);
    localStorage.setItem("savedChildren", JSON.stringify(updatedChildren));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400 via-pink-300 to-yellow-200 flex flex-col items-center justify-center p-4 overflow-auto">
      {/* Hidden elements for QR scanning */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      
      {/* Video for camera scanning */}
      {isScanning && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <button
            onClick={stopCameraScanning}
            className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full"
            data-testid="button-stop-camera"
          >
            <X className="w-6 h-6" />
          </button>
          <video ref={videoRef} className="w-full h-full object-cover" />
        </div>
      )}
      
      {/* Header with language selector */}
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSelector />
        <PWAInstallButton variant="compact" />
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-8 left-8 animate-bounce">
        <Star className="w-8 h-8 text-yellow-400 drop-shadow-lg" fill="currentColor" />
      </div>
      <div className="absolute top-20 right-20 animate-pulse">
        <Sparkles className="w-6 h-6 text-pink-400" />
      </div>
      <div className="absolute bottom-20 left-12 animate-bounce delay-300">
        <Gamepad2 className="w-10 h-10 text-purple-500 drop-shadow-lg" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-md">
        {/* Back button for steps other than welcome */}
        {step !== "welcome" && step !== "waiting_approval" && (
          <button
            onClick={() => {
              setErrorMessage("");
              setStep("welcome");
            }}
            className="mb-4 flex items-center gap-2 text-purple-700 hover:text-purple-900 font-bold"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("back") || "رجوع"}
          </button>
        )}

        {/* ===== WELCOME STEP ===== */}
        {step === "welcome" && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4 shadow-xl">
                <Gamepad2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {t("welcome") || "مرحباً!"}
              </h1>
              <p className="text-gray-500 mt-2">{t("letsPlay") || "هيا نلعب ونتعلم"}</p>
            </div>
            
            {/* Quick login cards for saved children */}
            {savedChildren.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-sm text-gray-500 font-medium text-center mb-2">
                  {t("quickLogin") || "دخول سريع"}
                </p>
                {savedChildren.map((child, index) => (
                  <div key={child.childId} className="relative group">
                    <button
                      onClick={() => {
                        setSelectedChild(child);
                        quickLoginMutation.mutate(child);
                      }}
                      disabled={quickLoginMutation.isPending && selectedChild?.childId === child.childId}
                      className={`w-full p-4 bg-gradient-to-r ${child.avatarColor || AVATAR_COLORS[index % AVATAR_COLORS.length]} rounded-2xl text-white font-bold text-lg flex items-center gap-4 transition-all hover:scale-[1.02] disabled:opacity-70 shadow-lg`}
                      data-testid={`button-quick-login-${index}`}
                    >
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                        {child.displayName.charAt(0)}
                      </div>
                      <span className="flex-1 text-right">{child.displayName}</span>
                      {quickLoginMutation.isPending && selectedChild?.childId === child.childId ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <CheckCircle className="w-6 h-6" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeChild(child.childId);
                      }}
                      className="absolute -top-2 -left-2 w-7 h-7 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                      data-testid={`button-remove-child-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Login options */}
            <div className="space-y-3">
              <button
                onClick={() => setStep("name_entry")}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg"
                data-testid="button-existing-child"
              >
                <User className="w-6 h-6" />
                {t("existingChild") || "عندي حساب"}
              </button>
              
              <button
                onClick={() => setStep("new_link")}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg"
                data-testid="button-new-child"
              >
                <UserPlus className="w-6 h-6" />
                {t("newChild") || "حساب جديد"}
              </button>
            </div>
          </div>
        )}

        {/* ===== NAME ENTRY STEP ===== */}
        {step === "name_entry" && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{t("whatIsYourName") || "ما اسمك؟"}</h2>
              <p className="text-gray-500 mt-1">{t("enterFullName") || "اكتب اسمك الثنائي"}</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={childName}
                onChange={(e) => {
                  setChildName(e.target.value);
                  setErrorMessage("");
                }}
                placeholder={t("exampleName") || "مثال: أحمد محمد"}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 text-xl text-center text-gray-900 bg-gray-50"
                data-testid="input-child-name"
              />

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-purple-500 focus:ring-purple-400"
                  data-testid="checkbox-remember"
                />
                <span className="text-gray-700 font-medium">{t("rememberMe") || "تذكرني على هذا الجهاز"}</span>
              </label>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-center">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={() => requestLoginMutation.mutate()}
                disabled={requestLoginMutation.isPending || !childName.trim()}
                className="w-full py-5 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 hover:from-pink-600 hover:via-red-600 hover:to-orange-600 text-white font-bold text-xl rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
                data-testid="button-request-login"
              >
                {requestLoginMutation.isPending ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {t("sending") || "جاري الإرسال..."}
                  </>
                ) : (
                  <>
                    <Heart className="w-6 h-6" />
                    {t("askParentPermission") || "اطلب إذن من بابا وماما"}
                  </>
                )}
              </button>

              <p className="text-center text-gray-500 text-sm">
                {t("parentWillReceiveNotification") || "سيصل إشعار لوالديك للموافقة"}
              </p>
            </div>
          </div>
        )}

        {/* ===== WAITING FOR APPROVAL STEP ===== */}
        {step === "waiting_approval" && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center">
              {loginStatus === "pending" && (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
                    <Clock className="w-10 h-10 text-yellow-600 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {t("waitingForApproval") || "في انتظار موافقة الوالدين"}
                  </h2>
                  <p className="text-gray-500 mb-6">
                    {t("askParentToApprove") || "اطلب من ماما أو بابا الموافقة من هاتفهم"}
                  </p>
                  
                  {/* Animated dots */}
                  <div className="flex justify-center gap-2 mb-6">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>

                  <button
                    onClick={cancelRequest}
                    className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-2xl transition-all"
                    data-testid="button-cancel-request"
                  >
                    {t("cancel") || "إلغاء"}
                  </button>
                </>
              )}

              {loginStatus === "approved" && (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-600 mb-2">
                    {t("loginApproved") || "تمت الموافقة!"}
                  </h2>
                  <p className="text-gray-500">
                    {t("redirectingNow") || "جاري تسجيل الدخول..."}
                  </p>
                  <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mt-4" />
                </>
              )}

              {loginStatus === "rejected" && (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                    <XCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-600 mb-2">
                    {t("loginRejected") || "تم رفض الطلب"}
                  </h2>
                  <p className="text-gray-500 mb-6">
                    {t("parentRejectedLogin") || "والديك لم يوافقوا على تسجيل الدخول"}
                  </p>
                  <button
                    onClick={() => {
                      setLoginStatus("pending");
                      setStep("name_entry");
                    }}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all"
                    data-testid="button-try-again"
                  >
                    {t("tryAgain") || "حاول مرة أخرى"}
                  </button>
                </>
              )}

              {loginStatus === "expired" && (
                <>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <Clock className="w-10 h-10 text-gray-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-600 mb-2">
                    {t("requestExpired") || "انتهت صلاحية الطلب"}
                  </h2>
                  <p className="text-gray-500 mb-6">
                    {t("pleaseRequestAgain") || "يرجى إرسال طلب جديد"}
                  </p>
                  <button
                    onClick={() => {
                      setLoginStatus("pending");
                      setStep("name_entry");
                    }}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all"
                    data-testid="button-request-again"
                  >
                    {t("sendNewRequest") || "إرسال طلب جديد"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ===== NEW LINK STEP (first time) ===== */}
        {step === "new_link" && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{t("newAccount") || "حساب جديد!"}</h2>
              <p className="text-gray-500 mt-1">{t("linkWithParents") || "اربط حسابك مع والديك"}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 text-right">
                  {t("yourName") || "اسمك"}
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => {
                    setChildName(e.target.value);
                    setErrorMessage("");
                  }}
                  placeholder={t("exampleName2") || "مثال: سارة أحمد"}
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-400 text-xl text-center text-gray-900 bg-gray-50"
                  data-testid="input-new-child-name"
                />
              </div>

              {/* Method Tabs */}
              <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setMethod("code")}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    method === "code"
                      ? "bg-green-500 text-white shadow"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  {t("typeCode") || "كتابة الكود"}
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("qr")}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    method === "qr"
                      ? "bg-green-500 text-white shadow"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  {t("scanQR") || "مسح QR"}
                </button>
              </div>

              {method === "code" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 text-right">
                    {t("parentCode") || "كود الوالد"}
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setErrorMessage("");
                    }}
                    placeholder={t("exampleCode") || "مثال: AHMED12345"}
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-400 text-2xl text-center font-mono tracking-widest text-gray-900 bg-gray-50"
                    maxLength={10}
                    data-testid="input-link-code"
                  />
                </div>
              )}

              {method === "qr" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={startCameraScanning}
                    className="w-full py-4 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    data-testid="button-scan-camera"
                  >
                    <Camera className="w-5 h-5" />
                    {t("scanWithCamera") || "مسح بالكاميرا"}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    data-testid="button-upload-image"
                  >
                    <Image className="w-5 h-5" />
                    {t("uploadImage") || "رفع صورة"}
                  </button>
                  
                  {code && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-center flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      {t("codeScanned") || "تم مسح الكود:"} {code}
                    </div>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-center">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={() => newLinkMutation.mutate()}
                disabled={newLinkMutation.isPending || !childName.trim() || !code}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-xl rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-link-account"
              >
                {newLinkMutation.isPending ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {t("linking") || "جاري الربط..."}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    {t("linkAccount") || "اربط حسابي!"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildLink;
