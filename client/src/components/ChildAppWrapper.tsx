import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChildPermissionsSetup } from "./ChildPermissionsSetup";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { ChildTaskNotificationManager } from "./child/SponsoredTaskNotification";
import { ChildWebPushRegistrar } from "./child/ChildWebPushRegistrar";

interface ChildAppWrapperProps {
  children: React.ReactNode;
}

export function ChildAppWrapper({ children }: ChildAppWrapperProps) {
  const [showPermissions, setShowPermissions] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [, navigate] = useLocation();

  console.log("ChildAppWrapper mounted");

  useEffect(() => {
    const token = localStorage.getItem("childToken");
    if (!token) {
      navigate("/child-link");
      setIsAuthenticated(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch("/api/child/info", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.status === 401) {
          localStorage.removeItem("childToken");
          localStorage.removeItem("childId");
          localStorage.removeItem("rememberedChild");
          navigate("/child-link");
          setIsAuthenticated(false);
          return;
        }
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(true);
      }
    };

    validateToken();

    const setupComplete = localStorage.getItem("child_permissions_setup_complete");
    if (!setupComplete) {
      setShowPermissions(true);
    }
    setIsChecked(true);
  }, [navigate]);

  const handlePermissionsComplete = () => {
    setShowPermissions(false);
  };

  if (!isChecked || !isAuthenticated) {
    return null;
  }

  if (showPermissions) {
    return <ChildPermissionsSetup onComplete={handlePermissionsComplete} />;
  }

  return (
    <div data-testid="child-wrapper-root">
      <ChildWebPushRegistrar />
      <NotificationCenter />
      <ChildTaskNotificationManager />
      {children}
    </div>
  );
}
