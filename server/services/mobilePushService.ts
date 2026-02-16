import { GoogleAuth } from "google-auth-library";

type MobilePushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function getFcmServerKey(): string | null {
  return process.env["FCM_SERVER_KEY"] || null;
}

function getFcmProjectId(): string | null {
  return process.env["FCM_PROJECT_ID"] || process.env["FIREBASE_PROJECT_ID"] || null;
}

function getFcmServiceAccountJson(): string | null {
  return process.env["FCM_SERVICE_ACCOUNT_JSON"] || null;
}

function hasFcmV1Config(): boolean {
  const projectId = getFcmProjectId();
  const json = getFcmServiceAccountJson();
  return Boolean(projectId && (json || process.env["GOOGLE_APPLICATION_CREDENTIALS"]));
}

export function isMobilePushReady(): boolean {
  return hasFcmV1Config() || Boolean(getFcmServerKey());
}

async function sendFcmV1Notification(token: string, payload: MobilePushPayload) {
  const projectId = getFcmProjectId();
  if (!projectId) {
    throw new Error("MOBILE_PUSH_FCM_PROJECT_ID_MISSING");
  }

  let credentials: Record<string, unknown> | undefined;
  const serviceAccountJson = getFcmServiceAccountJson();
  if (serviceAccountJson) {
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error("MOBILE_PUSH_FCM_SERVICE_ACCOUNT_INVALID_JSON");
    }
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!accessToken) {
    throw new Error("MOBILE_PUSH_FCM_ACCESS_TOKEN_UNAVAILABLE");
  }

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      },
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`MOBILE_PUSH_FCM_V1_HTTP_${response.status}`);
  }

  return json;
}

async function sendFcmLegacyNotification(token: string, payload: MobilePushPayload) {
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

export async function sendMobilePushNotification(token: string, payload: MobilePushPayload) {
  if (hasFcmV1Config()) {
    return sendFcmV1Notification(token, payload);
  }

  return sendFcmLegacyNotification(token, payload);
}
