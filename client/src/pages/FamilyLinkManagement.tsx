import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { queryClient, apiRequest, authenticatedFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Link2, Clock3, ShieldCheck, ShieldX } from "lucide-react";

type SyncRecord = {
  id: string;
  primaryParentId: string;
  secondaryParentId: string;
  secondaryParentName?: string;
  syncStatus: "active" | "pending" | "revoked" | string;
  sharedChildren: string[];
  lastSyncedAt?: string;
  createdAt?: string;
};

type LinkRequest = {
  id: string;
  requestingParentId: string;
  primaryParentId: string;
  childId: string;
  status: "pending" | "approved" | "rejected" | string;
  createdAt?: string;
};

type ChildItem = {
  id: string;
  name: string;
};

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "secondary",
  revoked: "destructive",
};

export const FamilyLinkManagement = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const token = localStorage.getItem("token");

  const { data: syncRecords = [], isLoading: syncLoading } = useQuery<SyncRecord[]>({
    queryKey: ["/api/parent/sync-status"],
    queryFn: () => authenticatedFetch<SyncRecord[]>("/api/parent/sync-status"),
    enabled: !!token,
  });

  const { data: linkRequests = [], isLoading: requestsLoading } = useQuery<LinkRequest[]>({
    queryKey: ["/api/parent/link-requests"],
    queryFn: () => authenticatedFetch<LinkRequest[]>("/api/parent/link-requests"),
    enabled: !!token,
  });

  const { data: children = [] } = useQuery<ChildItem[]>({
    queryKey: ["/api/parent/children"],
    queryFn: () => authenticatedFetch<ChildItem[]>("/api/parent/children"),
    enabled: !!token,
  });

  const childNameById = useMemo(() => {
    const entries = children.map((child) => [child.id, child.name]);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [children]);

  const pendingRequests = useMemo(
    () => linkRequests.filter((request) => request.status === "pending"),
    [linkRequests]
  );

  const revokeSyncMutation = useMutation({
    mutationFn: (syncId: string) => apiRequest("PUT", `/api/parent/sync/${syncId}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parent/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      toast({
        title: t("parentDashboard.familyLinkRevokeSuccess", { defaultValue: "Family link revoked" }),
      });
    },
    onError: () => {
      toast({
        title: t("parentDashboard.familyLinkRevokeFailed", { defaultValue: "Failed to revoke family link" }),
        variant: "destructive",
      });
    },
  });

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isDark ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-500" />
              {t("parentDashboard.familyLinkPageTitle", { defaultValue: "Family Link Management" })}
            </h1>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("parentDashboard.familyLinkPageSubtitle", { defaultValue: "Review linked parent accounts, shared children, and pending requests." })}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/parent-dashboard")} data-testid="button-back-parent-dashboard">
            <ArrowLeft className="h-4 w-4 me-2" />
            {t("back", { defaultValue: "Back" })}
          </Button>
        </div>

        <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-teal-500" />
              {t("parentDashboard.familyLinkActiveLinks", { defaultValue: "Active Family Links" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {syncLoading ? (
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>...</p>
            ) : syncRecords.length === 0 ? (
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                {t("parentDashboard.familyLinkNoActiveLinks", { defaultValue: "No linked parent accounts yet." })}
              </p>
            ) : (
              syncRecords.map((record) => (
                <div
                  key={record.id}
                  className={`rounded-xl border p-4 ${isDark ? "border-gray-700 bg-gray-950" : "border-gray-200 bg-white"}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-base">
                        {record.secondaryParentName || t("parentDashboard.familyLinkUnknownPartner", { defaultValue: "Unknown partner" })}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant={statusVariantMap[record.syncStatus] || "outline"}>
                          {t(`parentDashboard.familyLinkStatus_${record.syncStatus}`, {
                            defaultValue: record.syncStatus,
                          })}
                        </Badge>
                        <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                          {t("parentDashboard.familyLinkSharedChildren", { defaultValue: "Shared children" })}: {Array.isArray(record.sharedChildren) ? record.sharedChildren.length : 0}
                        </span>
                      </div>
                      {record.lastSyncedAt && (
                        <p className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          <Clock3 className="h-3 w-3" />
                          {t("parentDashboard.familyLinkLastSync", { defaultValue: "Last sync" })}: {new Date(record.lastSyncedAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {record.syncStatus === "active" ? (
                      <Button
                        variant="destructive"
                        onClick={() => revokeSyncMutation.mutate(record.id)}
                        disabled={revokeSyncMutation.isPending}
                        data-testid={`button-revoke-sync-${record.id}`}
                      >
                        {revokeSyncMutation.isPending
                          ? t("parentDashboard.familyLinkRevoking", { defaultValue: "Revoking..." })
                          : t("parentDashboard.familyLinkRevoke", { defaultValue: "Revoke" })}
                      </Button>
                    ) : (
                      <div className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                        {record.syncStatus === "revoked" ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        {t("parentDashboard.familyLinkStatusLocked", { defaultValue: "No actions available" })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className={isDark ? "bg-gray-900 border-gray-800" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-amber-500" />
              {t("parentDashboard.familyLinkPendingRequests", { defaultValue: "Pending Link Requests" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestsLoading ? (
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>...</p>
            ) : pendingRequests.length === 0 ? (
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                {t("parentDashboard.familyLinkNoPendingRequests", { defaultValue: "No pending requests." })}
              </p>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className={`rounded-xl border p-4 ${isDark ? "border-gray-700 bg-gray-950" : "border-gray-200 bg-white"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {t("parentDashboard.childName", { defaultValue: "Child" })}: {childNameById[request.childId] || request.childId}
                      </p>
                      <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                        {request.createdAt ? new Date(request.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">{request.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
