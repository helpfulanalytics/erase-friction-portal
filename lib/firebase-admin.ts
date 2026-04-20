// Server-only Firebase Admin SDK.
// Import ONLY in Server Components, Route Handlers, and Server Actions.
// The `server-only` package causes a build error if accidentally imported
// in a client component — this is intentional. Do not remove it.
import "server-only";
import { initializeApp, getApps, getApp, type App, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function createAdminApp(): App {
  if (getApps().length > 0) return getApp();
  return initializeApp({
    credential: cert({
      projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }),
  });
}

const adminApp: App = createAdminApp();

export const adminDb   = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

export default adminApp;
