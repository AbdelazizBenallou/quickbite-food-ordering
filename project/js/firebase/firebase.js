/**
 * The ONLY place where Firebase is initialized.
 *
 * Every other Firebase module (firestore.js) imports `app` from here, and
 * nothing else in the project may call `initializeApp()`.
 *
 * The Firebase SDK is loaded from the local ESM build in ../vendor/firebase/,
 * so the project has no CDN dependency and works on any static host (Vercel).
 *
 * Note: initializing the app is a purely local operation — it opens no
 * connection and makes no request. Actual reads/writes only happen when a
 * repository method runs.
 */
import { initializeApp } from "../vendor/firebase/firebase-app.js";
import { firebaseConfig } from "../config/firebase.config.js";

/** The Firebase Web App instance (connected to project `menudz-e2857`). */
export const app = initializeApp(firebaseConfig);

/** True when the SDK initialised with the expected project. */
export function isFirebaseConnected() {
  return Boolean(app && app.options && app.options.projectId === firebaseConfig.projectId);
}

/** The connected project id, handy for logging/debugging. */
export function getProjectId() {
  return app?.options?.projectId || null;
}

export default app;
