import { useEffect, useState, lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SEOProvider } from "@/components/SEOProvider";
import { ChildAppWrapper } from "@/components/ChildAppWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineGuard } from "@/components/OfflineGuard";
import { RandomAdPopup } from "@/components/RandomAdPopup";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import NotFound from "@/pages/not-found";

import { Home } from "@/pages/Home";
import { ParentAuth } from "@/pages/ParentAuth";
import { ChildLink } from "@/pages/ChildLink";

const ParentDashboard = lazy(() => import("@/pages/ParentDashboard").then(m => ({ default: m.ParentDashboard })));
const ChildGames = lazy(() => import("@/pages/ChildGames").then(m => ({ default: m.ChildGames })));
const CreateTask = lazy(() => import("@/pages/CreateTask").then(m => ({ default: m.CreateTask })));
const ParentStore = lazy(() => import("@/pages/ParentStore").then(m => ({ default: m.ParentStore })));
const ChildStore = lazy(() => import("@/pages/ChildStore").then(m => ({ default: m.ChildStore })));
const ChildGifts = lazy(() => import("@/pages/ChildGifts").then(m => ({ default: m.ChildGifts })));
const ChildNotifications = lazy(() => import("@/pages/ChildNotifications").then(m => ({ default: m.ChildNotifications })));
const Privacy = lazy(() => import("@/pages/Privacy").then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import("@/pages/Terms").then(m => ({ default: m.Terms })));
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })));
const Wallet = lazy(() => import("@/pages/Wallet").then(m => ({ default: m.Wallet })));
const Subjects = lazy(() => import("@/pages/Subjects").then(m => ({ default: m.Subjects })));
const Notifications = lazy(() => import("@/pages/Notifications").then(m => ({ default: m.Notifications })));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminAuth = lazy(() => import("@/pages/AdminAuth").then(m => ({ default: m.AdminAuth })));
const OTPVerification = lazy(() => import("@/pages/OTPVerification").then(m => ({ default: m.OTPVerification })));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const AccessibilityPolicy = lazy(() => import("@/pages/AccessibilityPolicy").then(m => ({ default: m.AccessibilityPolicy })));
const AssignTask = lazy(() => import("@/pages/AssignTask").then(m => ({ default: m.AssignTask })));
const SubjectTasks = lazy(() => import("@/pages/SubjectTasks"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const AdminPurchasesTab = lazy(() => import("@/pages/AdminPurchasesTab"));
const ParentInventory = lazy(() => import("@/pages/ParentInventory"));
const ChildRewards = lazy(() => import("@/pages/ChildRewards"));
const ParentStoreMulti = lazy(() => import("@/pages/ParentStoreMulti"));
const ChildProgress = lazy(() => import("@/pages/ChildProgress"));
const ChildTasks = lazy(() => import("@/pages/ChildTasks"));
const ParentTasks = lazy(() => import("@/pages/ParentTasks"));
const LibraryLogin = lazy(() => import("@/pages/LibraryLogin"));
const LibraryDashboard = lazy(() => import("@/pages/LibraryDashboard"));
const LibraryStore = lazy(() => import("@/pages/LibraryStore"));
const SchoolLogin = lazy(() => import("@/pages/SchoolLogin"));
const SchoolDashboard = lazy(() => import("@/pages/SchoolDashboard"));
const TeacherLogin = lazy(() => import("@/pages/TeacherLogin"));
const TeacherDashboard = lazy(() => import("@/pages/TeacherDashboard"));
const SchoolProfile = lazy(() => import("@/pages/SchoolProfile"));
const TeacherProfile = lazy(() => import("@/pages/TeacherProfile"));
const LibraryProfile = lazy(() => import("@/pages/LibraryProfile"));
const ChildProfile = lazy(() => import("@/pages/ChildProfile"));
const ChildPublicProfile = lazy(() => import("@/pages/ChildPublicProfile"));
const ChildDiscover = lazy(() => import("@/pages/ChildDiscover"));
const ChildSettings = lazy(() => import("@/pages/ChildSettings"));
const DownloadApp = lazy(() => import("@/pages/DownloadApp"));
const ParentProfile = lazy(() => import("@/pages/ParentProfile"));
const TaskMarketplace = lazy(() => import("@/pages/TaskMarketplace"));
const TaskCart = lazy(() => import("@/pages/TaskCart"));

type PublicMobileAppSettings = {
  appName?: string;
  appIconUrl?: string;
  pwaName?: string;
  pwaShortName?: string;
  pwaThemeColor?: string;
  pwaBackgroundColor?: string;
  pwaDisplayMode?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  pwaStartUrl?: string;
};

function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/90 to-purple-600">
      <div className="text-center text-white">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin mx-auto mb-4" />
        </div>
        <p className="text-lg font-semibold">{t("common.loading", "Loading...")}</p>
      </div>
    </div>
  );
}

function WrappedChildGames() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildGames />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildStore() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildStore />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildGifts() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildGifts />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildNotifications() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <div data-testid="route-marker-child-notifications" />
        <ChildNotifications />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildRewards() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildRewards />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildProgress() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildProgress />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildTasks() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildTasks />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildProfile() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildProfile />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildSettings() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildSettings />
      </Suspense>
    </ChildAppWrapper>
  );
}

function WrappedChildDiscover() {
  return (
    <ChildAppWrapper>
      <Suspense fallback={<PageLoader />}>
        <ChildDiscover />
      </Suspense>
    </ChildAppWrapper>
  );
}

function LegacyLibraryStoreRedirect() {
  return <Redirect to={`/library-store${window.location.search || ""}`} replace />;
}

function RegisterRedirect() {
  return <Redirect to={`/parent-auth${window.location.search || ""}`} replace />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/register" component={RegisterRedirect} />
        <Route path="/download">
          <ErrorBoundary><DownloadApp /></ErrorBoundary>
        </Route>
        <Route path="/parent-auth">
          <ErrorBoundary><ParentAuth /></ErrorBoundary>
        </Route>
        <Route path="/child-link">
          <ErrorBoundary><ChildLink /></ErrorBoundary>
        </Route>
        <Route path="/parent-dashboard">
          <ErrorBoundary><ParentDashboard /></ErrorBoundary>
        </Route>
        <Route path="/parent-store">
          <ErrorBoundary><ParentStore /></ErrorBoundary>
        </Route>
        <Route path="/parent-store-multi">
          <ErrorBoundary><ParentStoreMulti /></ErrorBoundary>
        </Route>
        <Route path="/parent-inventory">
          <ErrorBoundary><ParentInventory /></ErrorBoundary>
        </Route>
        <Route path="/wallet">
          <ErrorBoundary><Wallet /></ErrorBoundary>
        </Route>
        <Route path="/notifications">
          <ErrorBoundary><Notifications /></ErrorBoundary>
        </Route>
        <Route path="/subjects">
          <ErrorBoundary><Subjects /></ErrorBoundary>
        </Route>
        <Route path="/admin" component={AdminAuth} />
        <Route path="/admin-dashboard">
          <ErrorBoundary><AdminDashboard /></ErrorBoundary>
        </Route>
        <Route path="/otp">
          <ErrorBoundary><OTPVerification /></ErrorBoundary>
        </Route>
        <Route path="/forgot-password">
          <ErrorBoundary><ForgotPassword /></ErrorBoundary>
        </Route>
        <Route path="/child-games" component={WrappedChildGames} />
        <Route path="/child-store" component={WrappedChildStore} />
        <Route path="/child-gifts" component={WrappedChildGifts} />
        <Route path="/child-notifications" component={WrappedChildNotifications} />
        <Route path="/child-rewards" component={WrappedChildRewards} />
        <Route path="/child-progress" component={WrappedChildProgress} />
        <Route path="/child-tasks" component={WrappedChildTasks} />
        <Route path="/child-profile" component={WrappedChildProfile} />
        <Route path="/child-public-profile/:shareCode">
          <ErrorBoundary><ChildPublicProfile /></ErrorBoundary>
        </Route>
        <Route path="/child-settings" component={WrappedChildSettings} />
        <Route path="/child-discover" component={WrappedChildDiscover} />
        {/* DEPRECATED: Remove after 2026-02-20 */}
        <Route path="/create-task">
          <Redirect to="/parent-tasks" replace />
        </Route>
        <Route path="/assign-task">
          <ErrorBoundary><AssignTask /></ErrorBoundary>
        </Route>
        <Route path="/subject-tasks">
          <ErrorBoundary><SubjectTasks /></ErrorBoundary>
        </Route>
        <Route path="/parent-tasks">
          <ErrorBoundary><ParentTasks /></ErrorBoundary>
        </Route>
        <Route path="/task-marketplace">
          <ErrorBoundary><TaskMarketplace /></ErrorBoundary>
        </Route>
        <Route path="/task-cart">
          <ErrorBoundary><TaskCart /></ErrorBoundary>
        </Route>
        <Route path="/privacy" component={Privacy} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/accessibility" component={AccessibilityPolicy} />
        <Route path="/terms" component={Terms} />
        <Route path="/settings">
          <ErrorBoundary><Settings /></ErrorBoundary>
        </Route>
        <Route path="/admin/purchases" component={AdminPurchasesTab} />
        <Route path="/library/login" component={LibraryLogin} />
        <Route path="/library/dashboard">
          <ErrorBoundary><LibraryDashboard /></ErrorBoundary>
        </Route>
        <Route path="/store/libraries" component={LegacyLibraryStoreRedirect} />
        <Route path="/library-store">
          <ErrorBoundary><LibraryStore /></ErrorBoundary>
        </Route>
        <Route path="/school/login" component={SchoolLogin} />
        <Route path="/school/dashboard">
          <ErrorBoundary><SchoolDashboard /></ErrorBoundary>
        </Route>
        <Route path="/teacher/login" component={TeacherLogin} />
        <Route path="/teacher/dashboard">
          <ErrorBoundary><TeacherDashboard /></ErrorBoundary>
        </Route>
        <Route path="/school/:id">
          <ErrorBoundary><SchoolProfile /></ErrorBoundary>
        </Route>
        <Route path="/teacher/:id">
          <ErrorBoundary><TeacherProfile /></ErrorBoundary>
        </Route>
        <Route path="/library/:id">
          <ErrorBoundary><LibraryProfile /></ErrorBoundary>
        </Route>
        <Route path="/parent-profile">
          <ErrorBoundary><ParentProfile /></ErrorBoundary>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function useSwipeBackGesture() {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const isInteractiveElement = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          "input, textarea, select, button, a, [contenteditable='true'], [data-swipe-ignore='true']"
        )
      );
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      if (isInteractiveElement(event.target)) return;

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isTracking = true;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!isTracking) return;
      if (event.changedTouches.length !== 1) {
        isTracking = false;
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      const isHorizontalSwipe = Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY);
      if (isHorizontalSwipe) {
        window.history.back();
      }

      isTracking = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}

function useMobileAppBranding() {
  useEffect(() => {
    let isMounted = true;
    let manifestObjectUrl: string | null = null;

    const ensureMeta = (name: string, content: string) => {
      if (!content) return;
      let meta = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const ensureLink = (
      rel: string,
      href: string,
      id: string,
      sizes?: string
    ) => {
      if (!href) return;
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
      if (sizes) {
        link.setAttribute("sizes", sizes);
      }
    };

    const applyBranding = (settings: PublicMobileAppSettings) => {
      const appName = settings.pwaName || settings.appName || "Classify";
      const shortName = settings.pwaShortName || appName;
      const iconUrl = settings.appIconUrl || "/icons/icon-192.png";
      const themeColor = settings.pwaThemeColor || "#6B4D9D";
      const backgroundColor = settings.pwaBackgroundColor || "#ffffff";
      const startUrl = settings.pwaStartUrl || "/";
      const displayMode = settings.pwaDisplayMode || "standalone";

      document.title = appName;
      ensureMeta("theme-color", themeColor);
      ensureMeta("apple-mobile-web-app-title", appName);
      ensureMeta("application-name", appName);
      ensureMeta("msapplication-TileColor", themeColor);
      ensureMeta("msapplication-TileImage", iconUrl);

      ensureLink("icon", iconUrl, "dynamic-favicon");
      ensureLink("shortcut icon", iconUrl, "dynamic-shortcut-icon");
      ensureLink("apple-touch-icon", iconUrl, "dynamic-apple-touch-icon", "180x180");

      const manifestData = {
        name: appName,
        short_name: shortName,
        start_url: startUrl,
        display: displayMode,
        theme_color: themeColor,
        background_color: backgroundColor,
        icons: [
          { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      };

      const manifestBlob = new Blob([JSON.stringify(manifestData)], {
        type: "application/manifest+json",
      });

      manifestObjectUrl = URL.createObjectURL(manifestBlob);
      const manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
      if (manifestLink) {
        manifestLink.href = manifestObjectUrl;
      }
    };

    const loadBranding = async () => {
      try {
        const response = await fetch("/api/public/mobile-app-settings");
        if (!response.ok) return;
        const json = await response.json();
        const mobileApp = (json?.data?.mobileApp || {}) as PublicMobileAppSettings;
        if (!isMounted) return;
        applyBranding(mobileApp);
      } catch {
      }
    };

    loadBranding();

    return () => {
      isMounted = false;
      if (manifestObjectUrl) {
        URL.revokeObjectURL(manifestObjectUrl);
      }
    };
  }, []);
}

function App() {
  useSwipeBackGesture();
  useMobileAppBranding();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SEOProvider>
          <TooltipProvider>
            <OfflineGuard>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:start-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg"
              >
                Skip to content
              </a>
              <div className="min-h-screen">
                <div data-testid="build-marker-2026-02-07" />
                <main id="main-content">
                  <Router />
                </main>
              </div>
              <Toaster />
              <RandomAdPopup />
            </OfflineGuard>
          </TooltipProvider>
        </SEOProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
