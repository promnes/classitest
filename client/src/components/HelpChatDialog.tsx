import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image, Mic, MicOff, X, Loader2, CheckCircle, Volume2, VolumeX } from "lucide-react";

interface HelpChatDialogProps {
  open: boolean;
  onClose: () => void;
  helpRequestId: string | number;
  userType: "parent" | "teacher" | "child";
  token: string;
  taskQuestion?: string;
  status?: string;
}

export function HelpChatDialog({ open, onClose, helpRequestId, userType, token, taskQuestion, status: initialStatus }: HelpChatDialogProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isResolved, setIsResolved] = useState(initialStatus === "resolved");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    // Create a short notification beep using AudioContext
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const dest = audioCtx.createMediaStreamDestination();
      oscillator.connect(gainNode);
      gainNode.connect(dest);
      // We'll use a simple approach instead - just set a flag
    } catch {}
    return () => {};
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch {}
  }, [soundEnabled]);

  const basePath = userType === "parent" ? "/api/parent/help-chat"
    : userType === "teacher" ? "/api/teacher/help-chat"
    : "/api/child/help-chat";

  const authHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["help-chat-messages", helpRequestId],
    queryFn: async () => {
      const res = await fetch(`${basePath}/${helpRequestId}/messages`, { headers: authHeaders });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: open && !!helpRequestId,
    refetchInterval: open ? 5000 : false,
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (body: { messageType: string; content?: string; mediaUrl?: string }) => {
      const res = await fetch(`${basePath}/${helpRequestId}/messages`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "فشل الإرسال" }));
        throw new Error(err.message || "فشل الإرسال");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-chat-messages", helpRequestId] });
      setMessage("");
      setImageFile(null);
      setImagePreview(null);
      setAudioBlob(null);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect new messages from others and play notification sound
  useEffect(() => {
    if (!messages || messages.length === 0) {
      prevMessageCountRef.current = 0;
      return;
    }
    if (prevMessageCountRef.current > 0 && messages.length > prevMessageCountRef.current) {
      const newMessages = messages.slice(prevMessageCountRef.current);
      const hasOtherMessage = newMessages.some((msg: any) => !isMe(msg.senderType));
      if (hasOtherMessage) {
        playNotificationSound();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, playNotificationSound]);

  const handleSendText = () => {
    if (!message.trim()) return;
    sendMessage.mutate({ messageType: "text", content: message.trim() });
  };

  // Upload media file to server and return URL
  const uploadMedia = async (file: File | Blob, filename?: string): Promise<{ url: string; type: string }> => {
    const formData = new FormData();
    formData.append("media", file, filename || "media");
    const res = await fetch(`${basePath}/upload-media`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });
    if (!res.ok) throw new Error("فشل رفع الملف");
    const json = await res.json();
    return json.data;
  };

  const handleSendImage = async () => {
    if (!imageFile) return;
    try {
      const { url } = await uploadMedia(imageFile, imageFile.name);
      sendMessage.mutate({ messageType: "image", mediaUrl: url, content: imageFile.name });
    } catch {
      // Upload failed
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      // Microphone access denied
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSendVoice = async () => {
    if (!audioBlob) return;
    try {
      const { url } = await uploadMedia(audioBlob, "voice.webm");
      sendMessage.mutate({ messageType: "voice", mediaUrl: url, content: "رسالة صوتية" });
    } catch {
      // Upload failed
    }
  };

  // Resolve help request mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      const resolveBasePath = userType === "parent" ? "/api/parent" : "/api/teacher";
      const res = await fetch(`${resolveBasePath}/help-requests/${helpRequestId}/resolve`, {
        method: "PUT",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("فشل إغلاق المحادثة");
      return res.json();
    },
    onSuccess: () => {
      setIsResolved(true);
      queryClient.invalidateQueries({ queryKey: ["help-requests"] });
      queryClient.invalidateQueries({ queryKey: ["parent-help-requests"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-help-requests"] });
    },
  });

  const getSenderLabel = (senderType: string) => {
    switch (senderType) {
      case "child": return "🧒 الطفل";
      case "parent": return "👨‍👩‍👧 ولي الأمر";
      case "teacher": return "👨‍🏫 المعلم";
      default: return senderType;
    }
  };

  const isMe = (senderType: string) => senderType === userType;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0" dir="rtl">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">💬 محادثة المساعدة</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "كتم الصوت" : "تفعيل الصوت"}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-500" /> : <VolumeX className="h-3.5 w-3.5 text-gray-400" />}
              </Button>
              {isResolved ? (
              <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                <CheckCircle className="h-4 w-4" /> تم الحل
              </span>
            ) : userType !== "child" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50 text-xs h-7"
                onClick={() => resolveMutation.mutate()}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <CheckCircle className="h-3 w-3 ml-1" />}
                تم الحل
              </Button>
            ) : null}
            </div>
          </div>
          {taskQuestion && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">📝 {taskQuestion}</p>
          )}
        </DialogHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[50vh]">
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              لا توجد رسائل بعد. ابدأ المحادثة!
            </div>
          )}
          {messages.map((msg: any) => (
            <div
              key={msg.id}
              className={`flex ${isMe(msg.senderType) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                  isMe(msg.senderType)
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                }`}
              >
                <div className={`text-[10px] font-medium mb-1 ${isMe(msg.senderType) ? "text-blue-100" : "text-muted-foreground"}`}>
                  {getSenderLabel(msg.senderType)}
                </div>
                {msg.messageType === "text" && (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.messageType === "image" && msg.mediaUrl && (
                  <img src={msg.mediaUrl} alt="" className="max-w-full rounded-lg max-h-48 object-contain" />
                )}
                {msg.messageType === "voice" && msg.mediaUrl && (
                  <audio controls className="max-w-full" src={msg.mediaUrl} />
                )}
                <div className={`text-[9px] mt-1 ${isMe(msg.senderType) ? "text-blue-200" : "text-muted-foreground"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t flex items-center gap-2">
            <img src={imagePreview} alt="" className="h-16 w-16 rounded object-cover" />
            <Button size="sm" variant="ghost" onClick={() => { setImageFile(null); setImagePreview(null); }}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSendImage} disabled={sendMessage.isPending}>
              إرسال الصورة
            </Button>
          </div>
        )}

        {/* Voice preview */}
        {audioBlob && !isRecording && (
          <div className="px-4 py-2 border-t flex items-center gap-2">
            <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-8" />
            <Button size="sm" variant="ghost" onClick={() => setAudioBlob(null)}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSendVoice} disabled={sendMessage.isPending}>
              إرسال
            </Button>
          </div>
        )}

        {/* Input area */}
        {isResolved && (
          <div className="px-4 py-3 border-t text-center text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20">
            ✅ تم حل هذا الطلب
          </div>
        )}
        {!isResolved && <div className="p-3 border-t flex items-center gap-2">
          {/* Image button */}
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }
            }}
          />

          {/* Voice button */}
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "ghost"}
            className="shrink-0"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Text input */}
          <Input
            placeholder="اكتب رسالتك..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            className="flex-1"
            disabled={isRecording}
          />

          {/* Send button */}
          <Button
            size="icon"
            onClick={handleSendText}
            disabled={!message.trim() || sendMessage.isPending}
            className="shrink-0 bg-blue-500 hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
