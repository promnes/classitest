import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SiGoogle, SiFacebook, SiApple, SiX, SiGithub, SiLinkedin, SiDiscord } from "react-icons/si";
import { BsMicrosoft } from "react-icons/bs";

interface SocialProvider {
  id: string;
  provider: string;
  displayName: string;
  displayNameAr: string | null;
  iconUrl: string | null;
  iconName: string | null;
  sortOrder: number;
}

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  google: SiGoogle,
  facebook: SiFacebook,
  apple: SiApple,
  twitter: SiX,
  github: SiGithub,
  microsoft: BsMicrosoft,
  linkedin: SiLinkedin,
  discord: SiDiscord,
};

const providerColors: Record<string, { bg: string; hover: string; text: string; border?: string }> = {
  google: { bg: "bg-white", hover: "hover:bg-gray-100", text: "text-gray-700", border: "border border-gray-300" },
  facebook: { bg: "bg-[#1877F2]", hover: "hover:bg-[#166FE5]", text: "text-white" },
  apple: { bg: "bg-black", hover: "hover:bg-gray-900", text: "text-white" },
  twitter: { bg: "bg-black", hover: "hover:bg-gray-900", text: "text-white" },
  github: { bg: "bg-[#24292F]", hover: "hover:bg-[#1B1F23]", text: "text-white" },
  microsoft: { bg: "bg-[#00A4EF]", hover: "hover:bg-[#0095D9]", text: "text-white" },
  linkedin: { bg: "bg-[#0A66C2]", hover: "hover:bg-[#004182]", text: "text-white" },
  discord: { bg: "bg-[#5865F2]", hover: "hover:bg-[#4752C4]", text: "text-white" },
};

interface SocialLoginButtonsProps {
  onProviderClick?: (provider: string) => void;
  className?: string;
}

export function SocialLoginButtons({ onProviderClick, className = "" }: SocialLoginButtonsProps) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const { data: providers = [], isLoading, isError } = useQuery<SocialProvider[]>({
    queryKey: ["/api/auth/social-providers"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (providers.length === 0) {
    return null;
  }

  const handleClick = (provider: string) => {
    if (onProviderClick) {
      onProviderClick(provider);
    } else {
      window.location.href = `/api/auth/oauth/${provider}`;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {isArabic ? "أو" : "OR"}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center gap-3">
        {providers.map((provider) => {
          const IconComponent = providerIcons[provider.provider];
          const colors = providerColors[provider.provider] || { bg: "bg-gray-500", hover: "hover:bg-gray-600", text: "text-white" };
          const displayName = isArabic && provider.displayNameAr ? provider.displayNameAr : provider.displayName;

          return (
            <button
              key={provider.id}
              type="button"
              className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.bg} ${colors.hover} ${colors.text} ${colors.border || ""} transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105`}
              onClick={() => handleClick(provider.provider)}
              title={displayName}
              aria-label={isArabic ? `الدخول بـ ${displayName}` : `Continue with ${displayName}`}
              data-testid={`button-social-${provider.provider}`}
            >
              {IconComponent && <IconComponent className="w-5 h-5" />}
              {provider.iconUrl && !IconComponent && (
                <img src={provider.iconUrl} alt={displayName} className="w-5 h-5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
