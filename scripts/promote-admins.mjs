/**
 * Promote Firestore users to ADMIN by email (merge). Optionally sync Firebase Auth custom claims.
 *
 * Usage:
 *   npm run promote:admins
 *   npm run promote:admins -- other@example.com
 *   npm run promote:admins -- --update-only   (error if no users/* doc)
 *
 * Requires .env.local (or env) with NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_ADMIN_*.
 * Node 20+: --env-file loads .env.local automatically via npm script.
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const DEFAULT_EMAILS = [
  "brooks@brooksconkle.com",
  "hello@tosinxt.com",
];

function normEmail(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function initApp() {
  if (getApps().length > 0) return;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  if (!projectId || !privateKey || !clientEmail) {
    console.error(
      "Missing env: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL"
    );
    process.exit(1);
  }
  initializeApp({
    credential: cert({ projectId, privateKey, clientEmail }),
  });
}

async function main() {
  initApp();
  const db = getFirestore();
  const auth = getAuth();

  const argv = process.argv.slice(2).filter((a) => a !== "--update-only");
  const updateOnly = process.argv.includes("--update-only");
  const fromArgs = argv.map(normEmail).filter(Boolean);
  const emails = [...new Set([...DEFAULT_EMAILS.map(normEmail).filter(Boolean), ...fromArgs])];

  if (emails.length === 0) {
    console.error("No emails to promote.");
    process.exit(1);
  }

  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  for (const email of emails) {
    let snap = await db.collection("users").where("email", "==", email).limit(1).get();
    let ref;

    if (snap.empty) {
      if (updateOnly) {
        console.warn(`SKIP (no users/* doc, use without --update-only to create): ${email}`);
        continue;
      }
      const now = Timestamp.now();
      const local = email.split("@")[0] || "User";
      ref = db.collection("users").doc();
      await ref.set({
        email,
        name: local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || local,
        role: "ADMIN",
        company: "Erase Friction",
        avatar: "",
        createdAt: now,
      });
      console.log(`Firestore: created ${ref.id} for ${email} as ADMIN`);
    } else {
      ref = snap.docs[0].ref;
      await ref.set({ role: "ADMIN" }, { merge: true });
      console.log(`Firestore: ${email} -> ADMIN (doc ${ref.id})`);
    }

    try {
      const user = await auth.getUserByEmail(email);
      await auth.setCustomUserClaims(user.uid, { role: "ADMIN" });
      console.log(`  Auth custom claims: uid ${user.uid}`);
    } catch {
      console.log(`  (no Firebase Auth user for ${email} — OK for magic-link-only)`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
