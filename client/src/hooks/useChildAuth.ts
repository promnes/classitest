import { useEffect, useCallback, useState } from "react";
import { useLocation } from "wouter";

export function useChildAuth() {
  const [, navigate] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem("childToken");
    if (!token) {
      navigate("/child-link");
      return false;
    }
    return true;
  }, [navigate]);

  const handleAuthError = useCallback(() => {
    localStorage.removeItem("childToken");
    localStorage.removeItem("childId");
    localStorage.removeItem("rememberedChild");
    localStorage.removeItem("childRefreshToken");
    navigate("/child-link");
  }, [navigate]);

  const logout = useCallback(async (revokeDevice = false) => {
    const token = localStorage.getItem("childToken");
    if (!token) {
      handleAuthError();
      return;
    }

    setIsLoggingOut(true);
    try {
      await fetch("/api/child/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ revokeDevice }),
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
      handleAuthError();
    }
  }, [handleAuthError]);

  const authFetch = useCallback(async (url: string, options?: RequestInit) => {
    const token = localStorage.getItem("childToken");
    if (!token) {
      handleAuthError();
      throw new Error("No token");
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      handleAuthError();
      throw new Error("Unauthorized");
    }

    return res;
  }, [handleAuthError]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { checkAuth, handleAuthError, authFetch, logout, isLoggingOut };
}

export function useChildTokenValidator() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("childToken");
    if (!token) {
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
        }
      } catch {
        // Network error, don't logout
      }
    };

    validateToken();
  }, [navigate]);
}
