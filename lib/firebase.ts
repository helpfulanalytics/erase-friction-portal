// Client-side Firebase SDK — safe to import in client components and Route Handlers.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./firebase-config";

function createFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

const app: FirebaseApp = createFirebaseApp();

export const auth: Auth                 = getAuth(app);
export const db: Firestore              = getFirestore(app);
export const storage: FirebaseStorage   = getStorage(app);

export default app;
