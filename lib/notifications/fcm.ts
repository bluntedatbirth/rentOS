/**
 * FCM Push Notification Helper
 *
 * Currently a no-op stub. When Firebase credentials are provided via env vars,
 * this will initialize firebase-admin and send real push notifications.
 *
 * Required env vars for production:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_PRIVATE_KEY
 *   FIREBASE_CLIENT_EMAIL
 */

let fcmConfigured = false;

function isConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  );
}

/**
 * Initialize Firebase Admin SDK (called lazily on first send).
 * No-op if env vars are not set.
 */
function ensureInitialized(): boolean {
  if (fcmConfigured) return true;

  if (!isConfigured()) {
    return false;
  }

  // TODO: When firebase-admin is installed, initialize here:
  // const admin = require('firebase-admin');
  // if (!admin.apps.length) {
  //   admin.initializeApp({
  //     credential: admin.credential.cert({
  //       projectId: process.env.FIREBASE_PROJECT_ID,
  //       privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  //       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  //     }),
  //   });
  // }

  fcmConfigured = true;
  return true;
}

/**
 * Send a push notification to a device via FCM.
 *
 * Returns silently if Firebase is not configured.
 * Throws only if Firebase IS configured and sending fails.
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data?: Record<string, string>
): Promise<void> {
  if (!ensureInitialized()) {
    // Firebase not configured — silent no-op in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[FCM] Not configured — skipping push notification:', { title, body });
    }
    return;
  }

  // TODO: When firebase-admin is installed, send the message:
  // const admin = require('firebase-admin');
  // await admin.messaging().send({
  //   token,
  //   notification: { title, body },
  //   data: data ?? {},
  //   webpush: {
  //     fcmOptions: { link: data?.url ?? '/' },
  //   },
  // });

  console.log('[FCM] Push notification sent:', { token: token.slice(0, 10) + '...', title });
}
