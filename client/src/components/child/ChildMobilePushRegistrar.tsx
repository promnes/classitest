import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

function getOrCreateDeviceId(): string {
  const key = "child_mobile_push_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = (globalThis.crypto?.randomUUID?.() || `mob_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  localStorage.setItem(key, created);
  return created;
}

export function ChildMobilePushRegistrar() {
  useEffect(() => {
    const token = localStorage.getItem("childToken");
    if (!token) return;
    if (!Capacitor.isNativePlatform()) return;

    let unmounted = false;
    let removeRegistration: (() => Promise<void>) | null = null;
    let removeRegistrationError: (() => Promise<void>) | null = null;

    const run = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const registrationHandle = await PushNotifications.addListener("registration", async (registration) => {
          if (unmounted) return;

          try {
            const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
            await fetch("/api/child/push-subscriptions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                platform,
                token: registration.value,
                deviceId: getOrCreateDeviceId(),
              }),
            });
          } catch (error) {
            console.error("Child mobile push subscription save error:", error);
          }
        });

        const registrationErrorHandle = await PushNotifications.addListener("registrationError", (error) => {
          console.error("Child mobile push registration error:", error);
        });

        removeRegistration = () => registrationHandle.remove();
        removeRegistrationError = () => registrationErrorHandle.remove();

        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive !== "granted") {
          const requested = await PushNotifications.requestPermissions();
          if (requested.receive !== "granted") return;
        }

        await PushNotifications.register();
      } catch (error) {
        console.error("Child mobile push setup error:", error);
      }
    };

    run();

    return () => {
      unmounted = true;
      if (removeRegistration) {
        removeRegistration().catch(() => {});
      }
      if (removeRegistrationError) {
        removeRegistrationError().catch(() => {});
      }
    };
  }, []);

  return null;
}

export default ChildMobilePushRegistrar;
