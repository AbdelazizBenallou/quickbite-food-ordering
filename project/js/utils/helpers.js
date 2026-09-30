/**
 * Small, dependency-free helpers used by every layer.
 * No Firebase, no framework.
 */

/** querySelector shorthand. */
export const $ = (selector, scope = document) => scope.querySelector(selector);

/** querySelectorAll shorthand, always returns a real array. */
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/**
 * Formats a number the way the design does: 1200 -> "1,200.00".
 * Two decimals are always kept so every price reads the same (500 -> "500.00").
 */
export function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats an amount with the currency suffix: 1200 -> "1,200 د.ج".
 */
export function formatPrice(value, currency = "د.ج") {
  return `${formatNumber(value)} ${currency}`;
}

/**
 * Renders a counter with normal Latin digits (no grouping): 3 -> "3".
 */
export function toArabicDigits(value) {
  return String(Math.trunc(Number(value) || 0));
}

/** Copies text to the clipboard (async Clipboard API + legacy fallback). */
export async function copyText(value) {
  const text = String(value ?? "");
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* insecure context or denied — fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Escapes text before it is injected into markup. */
export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]
  );
}

/**
 * Event delegation: one listener on a container instead of one per button.
 * Handlers receive the matched element as a third argument.
 */
export function delegate(container, eventName, selector, handler) {
  container.addEventListener(eventName, (event) => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (target && container.contains(target)) {
      handler(event, target);
    }
  });
}

/** Removes the node from its parent (safe on null). */
export function removeNode(node) {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

/** Never let a quantity fall below 1. */
export function clampQuantity(qty) {
  return Math.max(1, Number(qty) || 1);
}

/**
 * "منذ X" relative time in Arabic, matching the dashboard design:
 * منذ لحظات / منذ دقيقة / منذ دقيقتين / منذ 5 دقائق / منذ 12 دقيقة …
 * Accepts a Date or a Firestore Timestamp (anything with .toDate()).
 */
export function timeAgo(value, now = Date.now()) {
  const date =
    value instanceof Date
      ? value
      : value && typeof value.toDate === "function"
        ? value.toDate()
        : null;
  if (!date) return "";

  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return "منذ لحظات";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    if (minutes === 1) return "منذ دقيقة";
    if (minutes === 2) return "منذ دقيقتين";
    return minutes <= 10 ? `منذ ${minutes} دقائق` : `منذ ${minutes} دقيقة`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (hours === 1) return "منذ ساعة";
    if (hours === 2) return "منذ ساعتين";
    return hours <= 10 ? `منذ ${hours} ساعات` : `منذ ${hours} ساعة`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  return days <= 10 ? `منذ ${days} أيام` : `منذ ${days} يوماً`;
}
