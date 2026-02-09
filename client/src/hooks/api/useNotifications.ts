import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authenticatedFetch } from "@/lib/queryClient";

type UserType = "parent" | "child";

export function useNotifications(userType: UserType = "parent") {
  const apiBase = userType === "parent" ? "/api/parent" : "/api/child";
  
  return useQuery({
    queryKey: [userType, "notifications"],
    queryFn: () => authenticatedFetch(`${apiBase}/notifications`),
    refetchInterval: 30000,
  });
}

export function useUnreadCount(userType: UserType = "parent") {
  const apiBase = userType === "parent" ? "/api/parent" : "/api/child";
  
  return useQuery({
    queryKey: [userType, "notifications", "unread-count"],
    queryFn: () => authenticatedFetch(`${apiBase}/notifications/unread-count`),
    refetchInterval: 30000,
  });
}

export function useMarkAsRead(userType: UserType = "parent") {
  const qc = useQueryClient();
  const apiBase = userType === "parent" ? "/api/parent" : "/api/child";
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("PATCH", `${apiBase}/notifications/${notificationId}/read`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [userType, "notifications"] });
    },
  });
}

export function useMarkAllAsRead(userType: UserType = "parent") {
  const qc = useQueryClient();
  const apiBase = userType === "parent" ? "/api/parent" : "/api/child";
  
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `${apiBase}/notifications/read-all`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [userType, "notifications"] });
    },
  });
}

export function useDeleteNotification(userType: UserType = "parent") {
  const qc = useQueryClient();
  const apiBase = userType === "parent" ? "/api/parent" : "/api/child";
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("DELETE", `${apiBase}/notifications/${notificationId}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [userType, "notifications"] });
    },
  });
}
