import { useEffect } from "react";

function base64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getOrCreateDeviceId(): string {
  const key = "child_push_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = (globalThis.crypto?.randomUUID?.() || `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  localStorage.setItem(key, created);
  return created;
}

export function ChildWebPushRegistrar() {
  useEffect(() => {
    const token = localStorage.getItem("childToken");
    if (!token) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    let cancelled = false;

    const run = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") {
          return;
        }

        const keyRes = await fetch("/api/child/push-public-key", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!keyRes.ok) return;
        const keyJson = await keyRes.json();
        const publicKey = keyJson?.data?.publicKey;
        if (!publicKey) return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const vapidKey = base64ToUint8Array(publicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey as unknown as BufferSource,
          });
        }

        if (!subscription || cancelled) return;

        const json = subscription.toJSON() as any;
        const endpoint = json?.endpoint;
        const p256dh = json?.keys?.p256dh;
        const auth = json?.keys?.auth;
        if (!endpoint || !p256dh || !auth) return;

        await fetch("/api/child/push-subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            platform: "web",
            endpoint,
            p256dh,
            auth,
            deviceId: getOrCreateDeviceId(),
          }),
        });
      } catch (error) {
        console.error("Child web push registration error:", error);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export default ChildWebPushRegistrar;
