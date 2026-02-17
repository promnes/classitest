import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Share2, Facebook, Instagram, Copy, Mail, MessageCircle,
  Send, Link2, X
} from "lucide-react";

interface ShareMenuProps {
  url?: string;
  title?: string;
  description?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
  buttonLabel?: string;
}

export function ShareMenu({
  url,
  title = "",
  description = "",
  variant = "outline",
  size = "sm",
  className = "",
  buttonLabel = "مشاركة",
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || title);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const shareOptions = [
    {
      name: "واتساب",
      icon: <MessageCircle className="h-5 w-5" />,
      color: "bg-green-500 hover:bg-green-600",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      name: "فيسبوك",
      icon: <Facebook className="h-5 w-5" />,
      color: "bg-blue-600 hover:bg-blue-700",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "تويتر / X",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: "bg-black hover:bg-gray-800",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: "تيليجرام",
      icon: <Send className="h-5 w-5" />,
      color: "bg-sky-500 hover:bg-sky-600",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "لينكد إن",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      color: "bg-blue-700 hover:bg-blue-800",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "البريد الإلكتروني",
      icon: <Mail className="h-5 w-5" />,
      color: "bg-gray-600 hover:bg-gray-700",
      href: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
    },
  ];

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "تم نسخ الرابط" });
      setOpen(false);
    } catch {
      toast({ title: "فشل نسخ الرابط", variant: "destructive" });
    }
  }

  async function handleNativeShare() {
    if (typeof navigator.share !== "undefined") {
      try {
        await navigator.share({ title, text: description || title, url: shareUrl });
        setOpen(false);
      } catch {
        // User cancelled
      }
    }
  }

  function handleClick() {
    // On mobile, try native share first
    if (typeof navigator.share !== "undefined") {
      handleNativeShare();
      return;
    }
    setOpen(!open);
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button variant={variant} size={size} className={`gap-1 ${className}`} onClick={handleClick}>
        <Share2 className="h-4 w-4" />
        {buttonLabel}
      </Button>

      {open && (
        <div className="absolute left-0 rtl:left-auto rtl:right-0 top-full mt-2 z-50 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <span className="font-bold text-sm">مشاركة عبر</span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Social Buttons Grid */}
          <div className="grid grid-cols-3 gap-2 p-3">
            {shareOptions.map((option) => (
              <a
                key={option.name}
                href={option.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-white transition-all transform hover:scale-105 ${option.color}`}
              >
                {option.icon}
                <span className="text-xs font-medium">{option.name}</span>
              </a>
            ))}
          </div>

          {/* Copy Link */}
          <div className="px-3 pb-3">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium"
            >
              <div className="p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                <Copy className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </div>
              <span>نسخ الرابط</span>
              <Link2 className="h-3.5 w-3.5 text-muted-foreground mr-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
