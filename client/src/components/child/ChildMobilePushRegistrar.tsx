/**
 * ChildMobilePushRegistrar
 * 
 * Native push notifications are disabled because Firebase/FCM is not configured.
 * Without google-services.json, calling PushNotifications.register() crashes the app.
 * Web push notifications via service worker continue to work on all platforms.
 */
export function ChildMobilePushRegistrar() {
  return null;
}

export default ChildMobilePushRegistrar;
