/**
 * كويك بايت | Quick Bite — themed confirmation dialog
 *
 * Token-based replacement for the native `window.confirm`, so destructive
 * actions (refuse / cancel an order) use the same light/dark-friendly popup
 * as the rest of the dashboard. Returns a Promise<boolean>.
 */
import { escapeHtml } from "../utils/helpers.js";

/**
 * @param {object} options
 * @param {string}   options.title        dialog heading
 * @param {string}   options.message      body text (may include HTML tags)
 * @param {string}   [options.confirmLabel] primary button label
 * @param {string}   [options.cancelLabel]  secondary button label
 * @param {boolean}  [options.danger=true]  primary button in error colours
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog({
  title = "تأكيد العملية",
  message = "",
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  danger = true,
} = {}) {
  return new Promise((resolve) => {
    document.getElementById("admin-confirm-dialog")?.remove();

    const okClasses = danger
      ? "bg-error text-on-error"
      : "bg-primary text-on-primary";
    const okIcon = danger ? "block" : "check";

    const wrap = document.createElement("div");
    wrap.id = "admin-confirm-dialog";
    wrap.className =
      "fixed inset-0 z-[70] bg-inverse-surface/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 opacity-0 pointer-events-none transition-opacity duration-300";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.innerHTML = `
      <div class="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 shadow-xl bg-surface-container-lowest border border-outline-variant/30 transform translate-y-8 sm:translate-y-0 transition-transform duration-300">
        <div class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            danger ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-primary"
          }">
            <span class="material-symbols-outlined text-[20px]">${okIcon}</span>
          </span>
          <span class="text-base font-bold text-on-surface leading-snug">${escapeHtml(title)}</span>
        </div>
        <p class="text-sm text-on-surface-variant leading-relaxed">${message}</p>
        <div class="flex items-center gap-2 pt-1">
          <button class="flex-1 h-11 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 border-0 cursor-pointer ${okClasses}" id="cf-ok" type="button">
            <span class="material-symbols-outlined text-[18px]">${okIcon}</span>
            <span>${escapeHtml(confirmLabel)}</span>
          </button>
          <button class="h-11 px-4 rounded-xl text-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant/30 cursor-pointer" id="cf-cancel" type="button">${escapeHtml(cancelLabel)}</button>
        </div>
      </div>`;

    document.body.appendChild(wrap);

    requestAnimationFrame(() => {
      wrap.classList.remove("opacity-0", "pointer-events-none");
      wrap.firstElementChild.classList.remove("translate-y-8");
    });

    const close = (result) => {
      wrap.classList.add("opacity-0", "pointer-events-none");
      wrap.firstElementChild.classList.add("translate-y-8");
      window.setTimeout(() => wrap.remove(), 300);
      resolve(result);
    };

    wrap.querySelector("#cf-ok").addEventListener("click", () => close(true));
    wrap.querySelector("#cf-cancel").addEventListener("click", () => close(false));
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) close(false);
    });
  });
}