import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChildPermissionsSetup } from "./ChildPermissionsSetup";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { ChildTaskNotificationManager } from "./child/SponsoredTaskNotification";
import { ChildWebPushRegistrar } from "./child/ChildWebPushRegistrar";
import { ChildMobilePushRegistrar } from "./child/ChildMobilePushRegistrar";

interface ChildAppWrapperProps {
  children: React.ReactNode;
}

export function ChildAppWrapper({ children }: ChildAppWrapperProps) {
  const [showPermissions, setShowPermissions] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [, navigate] = useLocation();
  const token = localStorage.getItem("childToken");

  const { isLoading: isAuthLoading, isError: isAuthError } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!res.ok) {
        throw new Error("AUTH_CHECK_FAILED");
      }
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!token) {
      navigate("/child-link");
      return;
    }

    const setupComplete = localStorage.getItem("child_permissions_setup_complete");
    if (!setupComplete) {
      setShowPermissions(true);
    }
    setIsChecked(true);
  }, [navigate, token]);

  useEffect(() => {
    if (!token || !isAuthError) return;
    localStorage.removeItem("childToken");
    localStorage.removeItem("childId");
    localStorage.removeItem("rememberedChild");
    navigate("/child-link");
  }, [isAuthError, navigate, token]);

  const handlePermissionsComplete = () => {
    setShowPermissions(false);
  };

  if (!isChecked || !token || isAuthLoading || isAuthError) {
    return null;
  }

  if (showPermissions) {
    return <ChildPermissionsSetup onComplete={handlePermissionsComplete} />;
  }

  return (
    <div data-testid="child-wrapper-root">
      <ChildWebPushRegistrar />
      <ChildMobilePushRegistrar />
      <NotificationCenter />
      <ChildTaskNotificationManager />
      {children}
    </div>
  );
}
