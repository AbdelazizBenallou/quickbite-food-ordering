/**
 * كويك بايت | Quick Bite — Admin login page wiring
 *
 * No inline <script>s in the HTML; everything lives in modules and shares the
 * customer app's theme system. The submit button performs REAL Firebase
 * authentication (js/firebase + js/vendor/firebase/firebase-auth.js) and, on
 * success with the `admin` custom claim present, redirects to the orders page.
 */
import { initAdminThemeToggle } from "./common.js";
import { signInAdmin, validateLoginInput } from "./auth.js";

const $ = (id) => document.getElementById(id);

function initPasswordToggle() {
  const btn = $("togglePasswordBtn");
  if (!btn) return;
  const passwordInput = $("adminPassword");
  const eyeIcon = $("passwordEyeIcon");
  btn.addEventListener("click", () => {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      eyeIcon.textContent = "visibility_off";
    } else {
      passwordInput.type = "password";
      eyeIcon.textContent = "visibility";
    }
  });
}

/** Busy states for the submit button. */
function setSubmitBusy(btn, busy, message, withSpinner) {
  btn.disabled = busy;
  btn.innerHTML = `
    ${withSpinner ? `<span class="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>` : ""}
    <span>${message}</span>
  `;
}

function showAlert(alertBox, alertText, text) {
  alertText.textContent = text;
  alertBox.classList.remove("hidden");
}

function hideAlert(alertBox) {
  alertBox.classList.add("hidden");
}

/**
 * Real login flow, every case surfaced with a clear Arabic message:
 *   - empty fields / bad email  -> client-side message, no network call
 *   - wrong credentials, disabled user, rate limit, feature disabled,
 *     network errors, missing admin claim -> mapped from the Firebase error
 *   - success -> "checking session" -> redirect to the orders page
 */
function initAuthForm() {
  const form = $("adminLoginForm");
  const email = $("adminEmail");
  const pass = $("adminPassword");
  const btn = $("submitBtn");
  const alertBox = $("authAlert");
  const alertText = $("authAlertText");
  const originalHTML = btn.innerHTML;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert(alertBox);

    // 1. Client-side checks (never leave the page for obvious mistakes).
    const inputError = validateLoginInput(email.value, pass.value);
    if (inputError) {
      showAlert(alertBox, alertText, inputError);
      if (!email.value.trim()) email.focus();
      else if (!pass.value) pass.focus();
      return;
    }

    // 2. Real authentication.
    btn.innerHTML = `
      <span class="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
      <span>جارِ التحقق وتأمين الجلسة...</span>
    `;
    btn.disabled = true;

    try {
      await signInAdmin(email.value.trim(), pass.value);

      // 3. Success — brief confirmation, then on to the orders dashboard.
      setSubmitBusy(btn, true, "مرحباً بك، جارِ التحويل إلى لوحة الطلبات...", false);
      window.setTimeout(() => {
        window.location.href = "pages/orders.html";
      }, 700);
    } catch (error) {
      console.warn("[admin.login] rejected:", error.code || error.name);
      showAlert(alertBox, alertText, error.message);
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  });
}

function bootstrap() {
  initAdminThemeToggle();
  initPasswordToggle();
  initAuthForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}