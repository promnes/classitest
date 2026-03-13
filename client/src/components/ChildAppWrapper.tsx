import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChildPermissionsSetup } from "./ChildPermissionsSetup";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { ChildTaskNotificationManager } from "./child/SponsoredTaskNotification";
import { ChildWebPushRegistrar } from "./child/ChildWebPushRegistrar";
import { ChildMobilePushRegistrar } from "./child/ChildMobilePushRegistrar";
import { useScreenTimeHeartbeat } from "@/hooks/useScreenTimeHeartbeat";
import { LoadingSpinner } from "./LoadingSpinner";

function ScreenTimeHeartbeatRunner() {
  useScreenTimeHeartbeat();
  return null;
}

interface ChildAppWrapperProps {
  children: React.ReactNode;
}

export function ChildAppWrapper({ children }: ChildAppWrapperProps) {
  const [showPermissions, setShowPermissions] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [path, navigate] = useLocation();
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
    retry: (count, error) => error.message !== "UNAUTHORIZED" && count < 1,
  });

  const { data: mandatoryTaskState } = useQuery({
    queryKey: ["child-mandatory-task-state"],
    queryFn: async () => {
      const res = await fetch("/api/child/mandatory-task-state", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
      }
      if (!res.ok) {
        throw new Error("MANDATORY_STATE_FAILED");
      }

      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!token,
    refetchInterval: token ? 5000 : false,
    staleTime: 2000,
    retry: false,
  });

  const mandatoryLockActive = !!mandatoryTaskState?.mandatoryLockActive;

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

  useEffect(() => {
    if (!token) return;
    if (!mandatoryLockActive) return;
    if (path === "/child-tasks") return;
    navigate("/child-tasks");
  }, [mandatoryLockActive, navigate, path, token]);

  const handlePermissionsComplete = () => {
    setShowPermissions(false);
  };

  if (!isChecked || !token || isAuthLoading || isAuthError) {
    return <LoadingSpinner />;
  }

  if (showPermissions) {
    return <ChildPermissionsSetup onComplete={handlePermissionsComplete} />;
  }

  return (
    <div data-testid="child-wrapper-root">
      <ChildWebPushRegistrar />
      <ChildMobilePushRegistrar />
      <ScreenTimeHeartbeatRunner />
      <NotificationCenter />
      <ChildTaskNotificationManager />
      {mandatoryLockActive && path !== "/child-tasks" && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="text-4xl mb-3">🚨</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">مهمة إلزامية قيد الانتظار</h2>
            <p className="text-sm text-gray-600 mb-4">يجب حل المهمة أولاً قبل استخدام بقية التطبيق.</p>
            <button
              type="button"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-bold hover:bg-blue-700"
              onClick={() => navigate("/child-tasks")}
            >
              الانتقال إلى المهام الآن
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
