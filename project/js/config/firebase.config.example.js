/**
 * Firebase Web App configuration — TEMPLATE.
 *
 * Copy this file to `firebase.config.js` in the same folder and fill in the
 * values from your own Firebase project:
 *
 *   cp firebase.config.example.js firebase.config.js
 *
 * `firebase.config.js` is git-ignored, so your real values stay local.
 *
 * Where to find each value:
 *   Firebase console → ⚙ Project settings → General → Your apps → Web app
 *   → "SDK setup and configuration" → Config. Copy the `firebaseConfig` object.
 *
 * ---------------------------------------------------------------------------
 * These values are PUBLIC, not a secret.
 * ---------------------------------------------------------------------------
 * This is the *public* client configuration that Firebase generates for a Web
 * App. It is designed to be shipped to the browser — it grants no privileged
 * access on its own. All actual access control lives in the Firestore
 * security rules, not in this object.
 *
 * It is kept out of version control as defence in depth, so a leaked key
 * cannot be scraped and used to burn this project's quota, and so that forks
 * supply their own configuration rather than silently writing to a database
 * they do not own.
 *
 * NEVER put any of the following in this file, or anywhere else in the
 * front-end — they bypass security rules completely:
 *   - a service-account / private key JSON (see tools/grant-admin.mjs, which
 *     reads one from a path you pass on the command line)
 *   - the `firebase-admin` SDK
 *   - any admin API key
 */
export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
};
