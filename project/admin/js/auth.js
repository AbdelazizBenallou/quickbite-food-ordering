/**
 * كويك بايت | Quick Bite — Admin authentication service
 *
 * Real Firebase Auth (Email/Password) on top of the single `app` instance from
 * js/firebase/firebase.js. Success requires TWO things:
 *   1. valid credentials, and
 *   2. the account carries the `admin` custom claim (the locked Firestore rules
 *      are gated on `request.auth.token.admin == true`).
 *
 * Every failure — missing input, bad email, wrong password, disabled account,
 * rate limit, feature disabled, missing admin claim, network — is thrown as an
 * `AdminAuthError` with a clear Arabic `message` ready to show in the alert.
 */
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "../../js/vendor/firebase/firebase-auth.js";
import { app } from "../../js/firebase/firebase.js";

export const auth = getAuth(app);

/** Firebase error code -> clear Arabic message for the login screen. */
const AUTH_ERROR_MESSAGES = {
  "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
  "auth/user-disabled": "تم تعطيل هذا الحساب. تواصل مع مسؤول تكنولوجيا المعلومات.",
  "auth/user-not-found": "لا يوجد حساب بهذا البريد الإلكتروني.",
  "auth/wrong-password": "كلمة المرور غير صحيحة. أعد المحاولة.",
  "auth/invalid-credential": "بيانات الدخول غير صحيحة. تحقق من البريد الإلكتروني وكلمة المرور.",
  "auth/too-many-requests": "محاولات كثيرة، أعد المحاولة بعد قليل.",
  "auth/operation-not-allowed": "تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في إعدادات Firebase.",
  "auth/network-request-failed": "تعذّر الاتصال بالخادم. تحقق من اتصالك ثم حاول مجدداً.",
  "auth/internal-error": "حدث خطأ غير متوقع أثناء التحقق. حاول مجدداً.",
  "auth/invalid-api-key": "الإعدادات غير صحيحة (apiKey). راجع إعدادات Firebase.",
  "auth/app-not-authorized": "تطبيق غير مصرّح به لهذا المشروع. راجع إعدادات Firebase.",
  "auth/not-admin": "هذا الحساب ليس له صلاحية الدخول إلى لوحة الإدارة.",
  "auth/unknown": "تعذّر تسجيل الدخول. تأكد من صحة البيانات أو حاول لاحقاً.",
};

export class AdminAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AdminAuthError";
    this.code = code;
  }
}

function toAdminAuthError(error) {
  const code = (error && error.code) || "auth/unknown";
  const message = AUTH_ERROR_MESSAGES[code] || AUTH_ERROR_MESSAGES["auth/unknown"];
  console.warn(`[admin.auth] ${code}: ${error && error.message ? error.message : "unknown"}`);
  return new AdminAuthError(code, message);
}

/** Client-side emptiness/format checks return nice Arabic messages too. */
export function validateLoginInput(email, password) {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail =(String(email || "")).trim();
  const hasPassword = Boolean(String(password || ""));

  if (!trimmedEmail && !hasPassword) return "أدخل البريد الإلكتروني وكلمة المرور.";
  if (!trimmedEmail) return "أدخل البريد الإلكتروني.";
  if (!EMAIL_RE.test(trimmedEmail)) return "صيغة البريد الإلكتروني غير صحيحة.";
  if (!hasPassword) return "أدخل كلمة المرور.";
  return null;
}

/**
 * Signs the admin in. Resolves with the account email on success, throws
 * `AdminAuthError` otherwise (including the case where the account exists but
 * does not carry the `admin` custom claim — it is signed out straight away).
 */
export async function signInAdmin(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdTokenResult(true); // force refresh — picks up freshly issued custom claims
    if (token.claims.admin !== true) {
      await signOut(auth);
      throw new AdminAuthError("auth/not-admin", AUTH_ERROR_MESSAGES["auth/not-admin"]);
    }
    return { email: credential.user.email, uid: credential.user.uid };
  } catch (error) {
    if (error instanceof AdminAuthError) throw error;
    throw toAdminAuthError(error);
  }
}

export async function signOutAdmin() {
  await signOut(auth);
}

/**
 * Runs `callback(hasAdminRights)` whenever the auth state changes (first run
 * included). Used by the orders page as its login guard.
 */
export function onAdminSession(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(false);
    try {
      const token = await user.getIdTokenResult();
      callback(token.claims.admin === true);
    } catch (error) {
      console.warn("[admin.auth] session check failed:", error);
      callback(false);
    }
  });
}