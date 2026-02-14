type MobilePushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function getFcmServerKey(): string | null {
  return process.env["FCM_SERVER_KEY"] || null;
}

export function isMobilePushReady(): boolean {
  return Boolean(getFcmServerKey());
}

export async function sendMobilePushNotification(token: string, payload: MobilePushPayload) {
  const serverKey = getFcmServerKey();
  if (!serverKey) {
    throw new Error("MOBILE_PUSH_FCM_NOT_CONFIGURED");
  }

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify({
      to: token,
      priority: "high",
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`MOBILE_PUSH_HTTP_${response.status}`);
  }

  const result = json?.results?.[0];
  if (result?.error) {
    throw new Error(`MOBILE_PUSH_FCM_${result.error}`);
  }

  return json;
}
