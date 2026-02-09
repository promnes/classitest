// client/src/components/notifications/NotificationToast.tsx
// Toast notification (auto-dismiss after 5 seconds)

import { useEffect } from "react";

interface NotificationToastProps {
  id: string;
  title: string;
  message: string;
  onDismiss: (id: string) => void;
  soundAlert?: boolean;
  type?: "gift_unlocked" | "gift_activated";
}

export function NotificationToast({
  id,
  title,
  message,
  onDismiss,
  soundAlert = false,
  type = "gift_activated",
}: NotificationToastProps) {
  useEffect(() => {
    // Play sound if enabled
    if (soundAlert) {
      try {
        const audio = new Audio("/sounds/notification.mp3");
        audio.play().catch((err) => console.log("Audio play failed:", err));
      } catch (error) {
        console.log("Sound alert unavailable");
      }
    }

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => onDismiss(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss, soundAlert]);

  // Color coding by notification type
  const bgColor =
    type === "gift_unlocked"
      ? "bg-blue-500"
      : type === "gift_activated"
        ? "bg-green-500"
        : "bg-gray-500";

  return (
    <div
      className={`${bgColor} text-white rounded-lg shadow-lg p-4 max-w-sm animate-fade-in`}
      role="alert"
      aria-live="polite"
    >
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm">{message}</p>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs opacity-75">Auto-closing in 5s...</span>
        <button
          onClick={() => onDismiss(id)}
          className="text-lg opacity-75 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
