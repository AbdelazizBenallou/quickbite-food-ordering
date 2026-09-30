/**
 * كويك بايت | Quick Bite — shared admin shell (header + drawer + guard)
 *
 * Every dashboard page (admin/pages/*.html) mounts into <div id="admin-app">.
 * This module injects the navigation shell, wires the drawer, theme toggle and
 * logout, and enforces the login guard: without an authenticated admin session
 * the visitor is bounced back to /admin/.
 */
import { initAdminThemeToggle } from "./common.js";
import { onAdminSession, signOutAdmin } from "./auth.js";

const NAV_LINKS = [
  { path: "todays-orders", href: "orders.html", icon: "receipt_long", label: "طلبات اليوم" },
  { path: "statistics", href: "statistics.html", icon: "monitoring", label: "إحصائيات الأعمال" },
  { path: "menu-management", href: "menu-management.html", icon: "restaurant_menu", label: "إدارة قائمة اليوم والتوفر" },
  { path: "live-alerts", href: "live-alerts.html", icon: "notifications_active", label: "الإشعارات الفورية", badge: "جديد" },
];

const ACTIVE_CLASSES = "bg-primary-container text-on-primary-container font-bold shadow-navbar";

function navMarkup(activePath) {
  return NAV_LINKS.map(
    ({ path, href, icon, label, badge }) => `
      <a class="flex items-center justify-between px-space-md py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all min-h-[44px]"
         data-nav="${path}" href="${href}">
        <div class="flex items-center gap-space-md">
          <span class="material-symbols-outlined text-[20px]">${icon}</span>
          <span class="text-sm font-semibold">${label}</span>
        </div>
        ${badge
          ? `<span class="bg-error text-on-error text-xs font-bold px-2 py-0.5 rounded-full">${badge}</span>`
          : `<span class="material-symbols-outlined text-outline text-[16px]">chevron_left</span>`}
      </a>`,
  ).join("");
}

function shellMarkup({ subtitle, activePath }) {
  return `
<header class="fixed top-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl shadow-navbar pt-safe border-b border-outline-variant/30">
  <div class="h-16 px-margin-mobile md:px-margin flex items-center justify-between gap-space-sm">
    <div class="flex items-center gap-space-sm min-w-0 flex-1">
      <button aria-label="فتح القائمة الجانبية" class="w-11 h-11 flex items-center justify-center rounded-lg text-on-surface hover:bg-surface-container-high transition-colors border-0 bg-transparent cursor-pointer shrink-0" id="drawer-open-btn" type="button">
        <span class="material-symbols-outlined text-[24px]">menu</span>
      </button>
      <img alt="كويك بايت" class="h-8 w-auto object-contain shrink-0" src="../../assets/images/logo.png">
      <div class="flex flex-col min-w-0">
        <span class="font-bold text-xs text-primary leading-tight truncate">لوحة تحكم الإدارة – كويك بايت</span>
        <span class="font-bold text-sm text-on-surface leading-snug truncate">${subtitle}</span>
      </div>
    </div>
    <div class="flex items-center gap-space-xs shrink-0">
      <a aria-label="الطلبات الجديدة" class="relative w-9 h-9 flex items-center justify-center rounded-lg text-on-surface hover:bg-surface-container-high transition-colors" href="orders.html">
        <span class="material-symbols-outlined text-[20px]">notifications</span>
        <span class="absolute -top-0.5 -right-0.5 bg-error text-on-error text-[11px] font-bold w-5 h-5 rounded-full items-center justify-center shadow-sm hidden" id="notif-badge">0</span>
      </a>
    </div>
  </div>
</header>
<div class="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300" id="drawer-backdrop"></div>
<aside aria-label="قائمة التنقل" class="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-surface-container-lowest shadow-navbar flex flex-col transform translate-x-full transition-transform duration-300 ease-out pt-safe pb-safe" id="admin-drawer">
  <div class="h-16 px-margin-mobile flex items-center justify-between border-b border-surface-container-high/60 shrink-0">
    <div class="flex items-center gap-space-sm">
      <img alt="كويك بايت" class="h-7 w-auto object-contain" src="../../assets/images/logo.png">
      <span class="font-bold text-sm text-primary">كويك بايت إكسبريس</span>
    </div>
    <button aria-label="إغلاق القائمة" class="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors border-0 bg-transparent cursor-pointer" id="drawer-close-btn" type="button">
      <span class="material-symbols-outlined text-[22px]">close</span>
    </button>
  </div>
  <div class="px-margin-mobile py-space-sm bg-surface-container-low/70 flex items-center justify-between shrink-0">
    <span class="text-xs font-semibold text-on-surface-variant">حالة المطعم:</span>
    <span class="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
      <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>متاح لاستقبال الطلبات
    </span>
  </div>
  <nav class="flex-1 overflow-y-auto px-space-sm py-space-md flex flex-col gap-space-xs">
    ${navMarkup(activePath)}
    <div class="my-space-sm h-px bg-surface-container-high/80 mx-space-sm"></div>
    <a class="flex items-center justify-between px-space-md py-3 rounded-xl text-primary font-semibold hover:bg-surface-container-high transition-all min-h-[44px]" href="../../index.html" rel="noopener" target="_blank">
      <div class="flex items-center gap-space-md">
        <span class="material-symbols-outlined text-[20px]">storefront</span>
        <span class="text-sm">رابط واجهة الزبائن</span>
      </div>
      <span class="material-symbols-outlined text-[16px]">open_in_new</span>
    </a>
  </nav>
  <div class="p-margin-mobile bg-surface-container-low shrink-0">
    <div class="flex items-center gap-space-sm">
      <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <span class="text-xs font-bold text-on-surface truncate">مدير المتجر</span>
        <span class="text-[11px] text-outline truncate">QuickBite Admin</span>
      </div>
      <button aria-label="تسجيل الخروج" class="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors border-0 bg-transparent cursor-pointer" id="logout-btn" type="button">
        <span class="material-symbols-outlined text-[20px]">logout</span>
      </button>
    </div>
  </div>
</aside>
<main class="flex-1 flex flex-col relative w-full pt-16 bg-surface min-h-screen">
  <div class="flex flex-col w-full pb-safe">
    <div class="flex flex-col w-full max-w-6xl mx-auto" id="admin-content"></div>
  </div>
</main>`;
}

function openDrawer() {
  const drawer = document.getElementById("admin-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (!drawer || !backdrop) return;
  drawer.classList.remove("translate-x-full");
  backdrop.classList.remove("opacity-0", "pointer-events-none");
}

function closeDrawer() {
  const drawer = document.getElementById("admin-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (!drawer || !backdrop) return;
  drawer.classList.add("translate-x-full");
  backdrop.classList.add("opacity-0", "pointer-events-none");
}

/**
 * Builds the shell, marks the active nav entry (by data-nav), and returns:
 *   content  – the element pages render their content into,
 *   setBadge – sets the notifications badge (hidden when 0).
 */
export function initAdminLayout({ activePath, subtitle, demo = false }) {
  if (!activePath) throw new Error("initAdminLayout: activePath is required");

  const mount = document.getElementById("admin-app");
  if (!mount) throw new Error("initAdminLayout: missing <div id=\"admin-app\">");

  mount.innerHTML = shellMarkup({ subtitle, activePath });

  document
    .querySelector(`[data-nav="${activePath}"]`)
    ?.classList.add(...ACTIVE_CLASSES.split(" "));

  initAdminThemeToggle();
  document.getElementById("drawer-open-btn")?.addEventListener("click", openDrawer);
  document.getElementById("drawer-close-btn")?.addEventListener("click", closeDrawer);
  document.getElementById("drawer-backdrop")?.addEventListener("click", closeDrawer);

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("logout-btn");
    if (btn) btn.disabled = true;
    await signOutAdmin().catch(() => {});
    window.location.replace("../index.html");
  });

  // Login guard: only an authenticated admin may stay on this page.
  // `?demo=1` (design preview) is the one exception — it renders mock data.
  if (!demo) {
    onAdminSession((isAdmin) => {
      if (!isAdmin) {
        console.warn("[admin] no admin session — redirecting to login.");
        window.location.replace("../index.html");
      }
    });
  }

  return {
    content: document.getElementById("admin-content"),
    setBadge(count) {
      const badge = document.getElementById("notif-badge");
      if (!badge) return;
      const n = Math.max(0, Number(count) || 0);
      badge.textContent = String(n);
      badge.classList.toggle("hidden", n === 0);
      badge.classList.toggle("inline-flex", n > 0);
    },
  };
}