import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function OAuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");
    const provider = params.get("provider");

    if (error) {
      navigate(`/parent-auth?error=${error}&provider=${provider || ""}`);
      return;
    }

    if (token) {
      localStorage.setItem("token", token);
      navigate("/parent-dashboard");
    } else {
      navigate("/parent-auth?error=oauth_no_token");
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );
}
