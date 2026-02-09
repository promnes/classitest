// client/src/components/notifications/NotificationModal.tsx
// Modal notification (requires user action to dismiss)

interface NotificationModalProps {
  id: string;
  title: string;
  message: string;
  onConfirm: (id: string) => void;
  type?: "gift_unlocked";
}

export function NotificationModal({
  id,
  title,
  message,
  onConfirm,
  type = "gift_unlocked",
}: NotificationModalProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${id}`}
        aria-describedby={`modal-desc-${id}`}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 animate-scale-in">
          {/* Title */}
          <h2
            id={`modal-title-${id}`}
            className="text-2xl font-bold text-center mb-4"
          >
            {title}
          </h2>

          {/* Icon/Emoji (gift-specific) */}
          {type === "gift_unlocked" && (
            <div className="text-6xl text-center mb-4">🎁</div>
          )}

          {/* Message */}
          <p
            id={`modal-desc-${id}`}
            className="text-gray-700 text-center text-lg mb-6"
          >
            {message}
          </p>

          {/* Action Button */}
          <button
            onClick={() => onConfirm(id)}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Awesome! 🎉
          </button>
        </div>
      </div>
    </>
  );
}
