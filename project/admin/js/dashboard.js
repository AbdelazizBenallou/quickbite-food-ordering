/**
 * كويك بايت | Quick Bite — Orders dashboard (admin, real Firestore data)
 *
 * Shows ONLY today's orders (createdAt >= start of today). The default view is
 * the actionable queue: pending orders sorted by amount (highest first). Once
 * an order is confirmed it leaves that queue and appears only under "مكتملة"
 * (confirmed + delivered). Cancelled orders sit in their own chip.
 * `?demo=1` previews the layout with mock data.
 */
import { initAdminLayout } from "./layout.js";
import { showConfirmDialog } from "../../js/components/confirmDialog.js";
import { orderRepository, storeRepository } from "../../js/repositories/index.js";
import { copyText, escapeHtml, formatPrice, timeAgo, toArabicDigits } from "../../js/utils/helpers.js";

const PREVIEW = new URLSearchParams(window.location.search).has("demo");

const layout = initAdminLayout({ activePath: "todays-orders", subtitle: "طلبات اليوم", demo: PREVIEW });
const content = layout.content;

/** Sample orders for `?demo=1` — all today, pending with different totals. */
const SAMPLE_ORDERS = [
  { id: "QK1A55F2", customer: { name: "أحمد (حي الوادي)", phone: "0551234567", address: "حي الوادي، عمارة 12" }, items: [{ name: "وجبة دجاج مشوي عائلي", qty: 1, subtotal: 1150 }, { name: "بطاطا حارة", qty: 1, subtotal: 150 }, { name: "عصير برتقال", qty: 2, subtotal: 200 }], total: 1500, status: "pending", createdAt: new Date(Date.now() - 2 * 60000) },
  { id: "QK1A55F1", customer: { name: "فاطمة (حي النخيل)", phone: "0662345678", address: "حي النخيل، شارع 14" }, items: [{ name: "برغر كويك كلاسيك", qty: 1, subtotal: 500 }, { name: "بطاطس ويدجز", qty: 1, subtotal: 350 }], total: 850, status: "pending", createdAt: new Date(Date.now() - 20 * 60000) },
  { id: "QK1A55ED", customer: { name: "يوسف (وسط المدينة)", phone: "0771122334", address: "جامع الڨبة" }, items: [{ name: "دجاج مشوي", qty: 1, subtotal: 450 }], total: 450, status: "pending", createdAt: new Date(Date.now() - 40 * 60000) },
  { id: "QK1A55F0", customer: { name: "كريم (شارع الجمهورية)", phone: "0773456789", address: "شارع الجمهورية" }, items: [{ name: "بيتزا مارغريتا", qty: 2, subtotal: 700 }, { name: "مياه معدنية", qty: 1, subtotal: 50 }], total: 1900, status: "confirmed", createdAt: new Date(Date.now() - 35 * 60000) },
  { id: "QK1A54Z9", customer: { name: "سارة (استلام من الفرع)", phone: "0790001122", address: "استلام من الفرع" }, items: [{ name: "ساندويتش سوبريم", qty: 1, subtotal: 600 }, { name: "عصير مانجو", qty: 1, subtotal: 50 }], total: 650, status: "delivered", createdAt: new Date(Date.now() - 4 * 3600000) },
];

const STATUS = {
  pending: { label: "جديد • قيد الانتظار", chip: "bg-warning-container text-on-warning-container", accent: "border-s-warning", dot: "bg-warning" },
  confirmed: { label: "مكتمل (قيد التحضير)", chip: "bg-surface-container-high text-on-surface", accent: "border-s-primary", dot: "bg-primary" },
  delivered: { label: "تم التسليم", chip: "bg-surface-container-high text-on-surface-variant", accent: "", dot: "bg-surface-container-highest" },
  cancelled: { label: "مُلغي", chip: "bg-error-container text-on-error-container", accent: "", dot: "bg-error" },
};

const FILTERS = [
  { key: "pending", label: "جديدة" },
  { key: "finished", label: "مكتملة" },
  { key: "cancelled", label: "ملغية" },
];

const EMPTY_TEXT = {
  pending: "لا توجد طلبات جديدة بانتظار التأكيد حالياً.",
  finished: "لا توجد طلبات مكتملة اليوم بعد.",
  cancelled: "لا توجد طلبات ملغية اليوم.",
};

let orders = [];
let activeFilter = "pending";
let modalOrderId = null;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function orderById(id) {
  return orders.find((order) => order.id === id) || null;
}

async function handleCopy(btn) {
  const text = btn && btn.dataset.copyText;
  if (!text) return;
  const icon = btn.querySelector(".material-symbols-outlined");
  const ok = await copyText(text);
  if (icon) {
    const prev = icon.textContent;
    icon.textContent = ok ? "check" : "close";
    if (ok) btn.classList.add("text-primary");
    window.setTimeout(() => {
      icon.textContent = prev;
      btn.classList.remove("text-primary");
    }, 1400);
  }
}

function pendingCount() {
  return orders.filter((o) => o.status === "pending").length;
}

/* ---------------------------------------------------------------------------
   Static page furniture.
   -------------------------------------------------------------------------- */

const storeStatusMarkup = `
<div class="flex items-center justify-between rounded-xl px-4 py-3 shadow-sm bg-surface-container-lowest border border-outline-variant/30" id="store-status-card">
  <div class="flex items-center gap-space-sm min-w-0">
    <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-surface-container-high text-primary">
      <span class="material-symbols-outlined text-[20px]">storefront</span>
    </div>
    <div class="flex flex-col min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-on-surface">حالة المتجر:</span>
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-high text-primary" id="store-status-badge">
          <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>مفتوح الآن
        </span>
      </div>
      <span class="text-[11px] truncate text-on-surface-variant">المطعم يستقبل الطلبات المباشرة والتوصيل</span>
    </div>
  </div>
  <button class="h-9 px-3 rounded-lg text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm bg-surface-container text-on-surface border border-outline-variant/30 cursor-pointer shrink-0" id="store-status-toggle" type="button">
    <span class="material-symbols-outlined text-[16px] text-primary">toggle_on</span>
    <span id="store-status-toggle-label">إغلاق مؤقت</span>
  </button>
</div>`;

const modalMarkup = `
<div class="fixed inset-0 z-[60] bg-inverse-surface/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 opacity-0 pointer-events-none transition-opacity duration-300" id="order-modal">
  <div class="w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 shadow-xl bg-surface-container-lowest border border-outline-variant/30 transform translate-y-8 sm:translate-y-0 transition-transform duration-300">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full animate-pulse bg-primary" id="modal-status-dot"></span>
        <span class="text-lg font-bold text-on-surface" id="modal-title">طلب</span>
        <button aria-label="نسخ رقم الطلب" class="copy-btn w-6 h-6 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors border-0 bg-transparent cursor-pointer" id="modal-copy-btn" data-copy-text="" title="نسخ رقم الطلب" type="button">
          <span class="material-symbols-outlined text-[15px]">content_copy</span>
        </button>
      </div>
      <button aria-label="إغلاق" class="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors border-0 cursor-pointer" id="modal-close-btn" type="button">
        <span class="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
    <div class="flex flex-col gap-2 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
      <div class="flex justify-between items-center text-sm gap-2">
        <span class="text-on-surface-variant shrink-0">اسم العميل:</span>
        <span class="font-bold text-on-surface text-left" id="modal-name">—</span>
      </div>
      <div class="flex justify-between items-center text-sm gap-2">
        <span class="text-on-surface-variant shrink-0">رقم الهاتف:</span>
        <span class="font-bold text-primary text-left" dir="ltr" id="modal-phone">—</span>
      </div>
      <div class="flex justify-between items-center text-sm gap-2">
        <span class="text-on-surface-variant shrink-0">العنوان:</span>
        <span class="font-bold text-on-surface text-left" id="modal-address">—</span>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-bold text-on-surface">محتويات الطلب:</span>
        <span class="flex items-center gap-1.5">
          <span class="bg-surface-container-high text-on-surface px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0" id="modal-count"></span>
          <button aria-label="نسخ الطلب مع الأصناف" class="copy-btn w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors border border-outline-variant/30 bg-surface-container-lowest cursor-pointer" id="modal-copy-summary" data-copy-text="" title="نسخ رقم الطلب مع عدد الأصناف والتفاصيل" type="button">
            <span class="material-symbols-outlined text-[15px]">content_copy</span>
          </button>
        </span>
      </div>
      <ul class="text-sm space-y-1 text-on-surface-variant" id="modal-items"></ul>
    </div>
    <div class="flex items-center justify-between">
      <span class="text-sm font-bold text-on-surface">المبلغ الإجمالي</span>
      <span class="text-lg font-bold text-primary" id="modal-total">—</span>
    </div>
    <div class="flex items-center gap-2 pt-1">
      <button class="flex-1 h-11 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm bg-primary text-on-primary border-0 cursor-pointer" id="modal-confirm-btn" type="button">
        <span class="material-symbols-outlined text-[18px]">check</span>
        <span>تأكيد الطلب وبدء الطهي</span>
      </button>
      <button class="h-11 px-4 rounded-xl text-sm font-semibold bg-surface-container-high text-on-surface border border-outline-variant/30 cursor-pointer" id="modal-back-btn" type="button">رجوع</button>
    </div>
  </div>
</div>`;

/* ---------------------------------------------------------------------------
   Sections that change with the data.
   -------------------------------------------------------------------------- */

function renderStats() {
  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const pending = pendingCount();
  const stats = [
    { label: "إجمالي اليوم", sub: `طلبات`, icon: "receipt", text: "text-on-surface", iconBg: "bg-surface-container-high text-primary", count: orders.length },
    { label: "قيد التحضير", sub: "بالمطبخ", icon: "skillet", text: "text-primary", iconBg: "bg-surface-container-high text-primary", count: confirmedCount },
    { label: "بانتظار التأكيد", sub: "مستعجل", icon: "hourglass_top", text: "text-warning", iconBg: "bg-warning-container text-on-warning-container", count: pending },
  ];

  document.getElementById("stats-grid").innerHTML = stats
    .map(
      (s) => `
      <div class="rounded-xl p-space-sm flex flex-col justify-between shadow-sm bg-surface-container-lowest border border-outline-variant/30">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-on-surface-variant">${s.label}</span>
          <span class="w-6 h-6 rounded-lg flex items-center justify-center ${s.iconBg}">
            <span class="material-symbols-outlined text-[15px]">${s.icon}</span>
          </span>
        </div>
        <div class="mt-1.5 flex items-baseline gap-1">
          <span class="text-xl font-bold ${s.text}">${s.count}</span>
          <span class="text-xs ${s.text} font-medium">${s.sub}</span>
        </div>
      </div>`,
    )
    .join("");
}

function renderFilters() {
  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    finished: orders.filter((o) => o.status === "confirmed" || o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  document.getElementById("status-filters").innerHTML = FILTERS.map(
    (d) => `
    <button class="filter-chip h-8 px-3 rounded-full text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 border-0 cursor-pointer ${
      activeFilter === d.key ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 hover:text-on-surface"
    }" data-filter="${d.key}" type="button">
      <span>${d.label}</span>
      <span class="w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
        activeFilter === d.key ? "bg-on-primary/20" : "bg-surface-container-high"
      }">${counts[d.key]}</span>
    </button>`,
  ).join("");
}

function visibleOrders() {
  if (activeFilter === "pending") {
    return orders.filter((o) => o.status === "pending").slice().sort((a, b) => b.total - a.total);
  }
  if (activeFilter === "finished") {
    return orders
      .filter((o) => o.status === "confirmed" || o.status === "delivered")
      .sort((a, b) => (b.status === "confirmed") - (a.status === "confirmed"));
  }
  return orders.filter((o) => o.status === "cancelled");
}

function orderCardMarkup(order) {
  const s = STATUS[order.status] || STATUS.pending;
  const idShort = escapeHtml(String(order.id || "").slice(-6).toUpperCase());
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsLine = items.map((item) => `${toArabicDigits(item.qty)}× ${escapeHtml(item.name)}`).join(" + ") || "—";
  const phone = escapeHtml((order.customer && order.customer.phone) || "—");
  const name = escapeHtml((order.customer && order.customer.name) || "—");
  const accent = s.accent ? ` border ${s.accent} border-s-4` : " border border-outline-variant/40";

  const confirmBtn =
    order.status === "pending"
      ? `<button class="h-9 px-4 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1 bg-primary text-on-primary border-0 cursor-pointer" data-action="confirm">
        <span class="material-symbols-outlined text-[16px]">check</span><span>قبول وتأكيد</span>
      </button>`
      : order.status === "confirmed"
        ? `<button class="h-9 px-4 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1 bg-primary text-on-primary border-0 cursor-pointer" data-action="ready">
        <span class="material-symbols-outlined text-[16px]">payments</span><span>إنهاء الدفع</span>
      </button>`
        : "";

  const detailBtn = order.status === "delivered"
    ? `<button class="h-9 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 bg-surface-container-high text-on-surface border border-outline-variant/30 cursor-pointer" data-action="details">
        <span class="material-symbols-outlined text-[16px]">receipt_long</span><span>عرض الفاتورة</span>
      </button>`
    : `<button class="h-9 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 bg-surface-container-high text-on-surface border border-outline-variant/30 cursor-pointer" data-action="details">
        <span class="material-symbols-outlined text-[16px]">visibility</span><span>التفاصيل</span>
      </button>`;

  const rejectBtn =
    order.status === "pending" || order.status === "confirmed"
      ? `<button class="h-9 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 bg-surface-container text-error border border-outline-variant/30 cursor-pointer" data-action="reject" title="رفض الطلب">
        <span class="material-symbols-outlined text-[16px]">block</span><span>رفض الطلب</span>
      </button>`
      : "";

  return `
    <article class="order-card rounded-xl p-4 shadow-sm transition-all flex flex-col gap-space-sm bg-surface-container-lowest ${accent}" data-order-id="${escapeHtml(order.id)}" data-status="${escapeHtml(order.status)}">
      <div class="flex items-center justify-between pb-2 border-b border-surface-container-high/60 gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-base font-bold text-on-surface">#${idShort}</span>
          <button aria-label="نسخ رقم الطلب" class="copy-btn w-6 h-6 shrink-0 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors border-0 bg-transparent cursor-pointer" data-copy-text="${idShort}" title="نسخ رقم الطلب لتأكيد الدفع مع العميل" type="button">
            <span class="material-symbols-outlined text-[15px]">content_copy</span>
          </button>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${s.chip} shrink-0">
            <span class="w-1.5 h-1.5 rounded-full ${order.status === "pending" ? "animate-ping " : ""}${s.dot}"></span>${s.label}
          </span>
        </div>
        <span class="flex items-center gap-1 text-xs text-on-surface-variant shrink-0">
          <span class="material-symbols-outlined text-[15px]">schedule</span>${escapeHtml(timeAgo(order.createdAt))}
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface-container-high text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">person</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-bold truncate text-on-surface">${name}</span>
            <a class="text-xs text-left hover:underline text-on-surface-variant" dir="ltr" href="tel:${phone}">${phone}</a>
          </div>
        </div>
        <a aria-label="الاتصال بالعميل" class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-surface-container text-on-surface-variant border border-outline-variant/30" href="tel:${phone}">
          <span class="material-symbols-outlined text-[18px]">call</span>
        </a>
      </div>
      <div class="rounded-lg p-2.5 flex items-center gap-2 text-xs bg-surface-container-low border border-surface-container-high/60">
        <span class="material-symbols-outlined text-[16px] shrink-0 text-primary">restaurant</span>
        <span class="truncate font-medium text-on-surface">${itemsLine}</span>
      </div>
      <div class="flex flex-wrap items-center justify-between pt-1 gap-2">
        <div class="flex flex-col">
          <span class="text-[11px] text-on-surface-variant">المبلغ المستحق</span>
          <span class="text-base font-bold text-primary">${escapeHtml(formatPrice(order.total))}</span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          ${detailBtn}${confirmBtn}${rejectBtn}
        </div>
      </div>
    </article>`;
}

function renderOrdersList() {
  const list = document.getElementById("orders-list");
  const visible = visibleOrders();

  if (orders.length === 0) {
    list.innerHTML = `
      <div class="flex items-center justify-center py-16 text-on-surface-variant font-body-sm text-body-sm">
        لا توجد طلبات اليوم بعد. ستظهر الطلبات هنا لحظة وصولها.
      </div>`;
    return;
  }
  if (visible.length === 0) {
    list.innerHTML = `
      <div class="flex items-center justify-center py-16 text-on-surface-variant font-body-sm text-body-sm">
        ${EMPTY_TEXT[activeFilter]}
      </div>`;
    return;
  }
  list.innerHTML = visible.map(orderCardMarkup).join("");
}

function renderUrgentBanner() {
  const banner = document.getElementById("urgent-alert");
  if (!banner) return;
  banner.classList.toggle("hidden", pendingCount() === 0);
}

function renderDashboard() {
  document.getElementById("orders-loader")?.remove();
  document.getElementById("dashboard-error")?.classList.add("hidden");

  layout.setBadge(pendingCount());
  renderStats();
  renderFilters();
  renderOrdersList();
  renderUrgentBanner();
}

function showDashboardError(text) {
  const box = document.getElementById("dashboard-error");
  if (box) {
    box.classList.remove("hidden");
    box.querySelector("span").textContent = text;
  }
}

/* ---------------------------------------------------------------------------
   Loading the data (today only).
   -------------------------------------------------------------------------- */

async function loadOrders({ silent = false } = {}) {
  const modalOpen = !document.getElementById("order-modal")?.classList.contains("opacity-0");
  if (silent && modalOpen) return;
  if (!silent) showLoader();

  try {
    orders = PREVIEW ? SAMPLE_ORDERS : await orderRepository.listBetween(startOfToday(), new Date());
    renderDashboard();
  } catch (error) {
    console.warn("[admin.orders] load failed:", error);
    if (!silent) {
      const code = error && error.code;
      if (code === "permission-denied") {
        showDashboardError("لا توجد صلاحية لقراءة الطلبات. تأكد من نشر قواعد الأمان (allow read للطلبات بحساب المسؤول الأصلي).");
      } else if (code === "unavailable") {
        showDashboardError("تعذّر الاتصال بالإنترنت. تحقق من الاتصال ثم أعد المحاولة.");
      } else {
        showDashboardError("تعذّر تحميل الطلبات. اضغط على زر التحديث لإعادة المحاولة.");
      }
    }
  }
}

function showLoader() {
  const container = document.getElementById("orders-list");
  if (container) {
    container.innerHTML = `
      <div class="flex items-center justify-center py-16 text-on-surface-variant font-body-sm text-body-sm" id="orders-loader">
        <span class="w-5 h-5 rounded-full border-2 border-outline border-t-transparent animate-spin"></span>
        <span class="ms-2">جاري تحميل طلبات اليوم…</span>
      </div>`;
  }
}

/* ---------------------------------------------------------------------------
   Order modal.
   -------------------------------------------------------------------------- */

function openOrderModal(id) {
  const order = orderById(id);
  if (!order) return;
  modalOrderId = id;

  const s = STATUS[order.status] || STATUS.pending;
  const shortId = String(order.id || "").slice(-6).toUpperCase();
  document.getElementById("modal-status-dot").className = `w-3 h-3 rounded-full ${order.status === "pending" ? "animate-pulse " : ""}${s.dot}`;
  document.getElementById("modal-title").textContent = `طلب #${shortId}`;
  document.getElementById("modal-copy-btn").dataset.copyText = shortId;
  document.getElementById("modal-name").textContent = (order.customer && order.customer.name) || "—";
  document.getElementById("modal-phone").textContent = (order.customer && order.customer.phone) || "—";
  document.getElementById("modal-address").textContent = (order.customer && order.customer.address) || "—";
  document.getElementById("modal-total").textContent = formatPrice(order.total);

  const items = Array.isArray(order.items) ? order.items : [];
  const count = items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
  document.getElementById("modal-count").textContent = `${toArabicDigits(count)} ${count === 1 ? "صنف" : "أصناف"}`;

  const orderName = (order.customer && order.customer.name) || "";
  const summary = [
    `طلب كويك بايت #${shortId} — ${orderName}`,
    ...items.map((item) => `• ${toArabicDigits(item.qty)}× ${item.name} (${formatPrice(item.subtotal)})`),
    `الإجمالي: ${formatPrice(order.total)}`,
  ].join("\n");
  document.getElementById("modal-copy-summary").dataset.copyText = summary;

  document.getElementById("modal-items").innerHTML = items
    .map((item) => `<li class="flex items-center justify-between gap-2">
      <span>${toArabicDigits(item.qty)}× ${escapeHtml(item.name)}</span>
      <span class="font-semibold text-on-surface shrink-0">${escapeHtml(formatPrice(item.subtotal))}</span>
    </li>`)
    .join("");

  const confirmBtn = document.getElementById("modal-confirm-btn");
  const showConfirm = order.status === "pending";
  confirmBtn.classList.toggle("hidden", !showConfirm);
  confirmBtn.classList.toggle("flex", showConfirm);

  const modal = document.getElementById("order-modal");
  modal.classList.remove("opacity-0", "pointer-events-none");
  modal.firstElementChild.classList.remove("translate-y-8");
}

function closeOrderModal() {
  const modal = document.getElementById("order-modal");
  modal.classList.add("opacity-0", "pointer-events-none");
  modal.firstElementChild.classList.add("translate-y-8");
  modalOrderId = null;
}

async function changeStatus(id, status) {
  if (PREVIEW) {
    const order = orderById(id);
    if (order) {
      order.status = status;
      renderDashboard();
    }
    return;
  }
  const card = document.querySelector(`[data-order-id="${id}"]`);
  const buttons = card ? Array.from(card.querySelectorAll("button")) : [];
  buttons.forEach((btn) => (btn.disabled = true));
  try {
    await orderRepository.updateStatus(id, status);
  } catch (error) {
    console.warn("[admin.orders] status update failed:", error);
    if (error && error.code === "permission-denied") {
      showDashboardError("لا توجد صلاحية لتحديث حالة الطلب. تأكد من نشر قواعد الأمان (update للطلبات بحساب المسؤول الأصلي).");
    } else {
      showDashboardError("تعذّر تحديث حالة الطلب. أعد المحاولة لاحقاً.");
    }
    buttons.forEach((btn) => (btn.disabled = false));
    return;
  }
  await loadOrders({ silent: true });
}

/* ---------------------------------------------------------------------------
   Events.
   -------------------------------------------------------------------------- */

let storeOpen = true;

function applyStoreStatus(open) {
  storeOpen = Boolean(open);
  const badge = document.getElementById("store-status-badge");
  const label = document.getElementById("store-status-toggle-label");
  const toggle = document.getElementById("store-status-toggle");
  const icon = toggle && toggle.querySelector(".material-symbols-outlined");
  if (!badge || !label || !icon) return;

  if (!storeOpen) {
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-warning"></span>مغلق مؤقتاً`;
    badge.className = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-warning-container text-on-warning-container";
    label.textContent = "فتح المتجر";
    icon.textContent = "toggle_off";
    icon.className = "material-symbols-outlined text-[16px] text-warning";
  } else {
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>مفتوح الآن`;
    badge.className = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-high text-primary";
    label.textContent = "إغلاق مؤقت";
    icon.textContent = "toggle_on";
    icon.className = "material-symbols-outlined text-[16px] text-primary";
  }
}

function wireEvents() {
  content.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    const chip = event.target.closest("[data-filter]");
    const closeAlert = event.target.closest("#urgent-close-btn");
    const copyBtn = event.target.closest("[data-copy-text]");

    if (copyBtn) {
      handleCopy(copyBtn);
      return;
    }
    if (actionBtn) {
      const id = actionBtn.closest("[data-order-id]").dataset.orderId;
      const action = actionBtn.dataset.action;
      if (action === "ready") changeStatus(id, "delivered");
      else if (action === "reject") {
        showConfirmDialog({
          title: "رفض الطلب",
          message: `هل أنت متأكد من رفض الطلب <b class="text-on-surface">#${escapeHtml(String(id).slice(-6).toUpperCase())}</b>؟<br>سيتم تحويله إلى قائمة الملغيات ولن يتم تحصيل المبلغ.`,
          confirmLabel: "تأكيد الرفض",
          cancelLabel: "التراجع",
        }).then((ok) => {
          if (ok) changeStatus(id, "cancelled");
        });
      } else openOrderModal(id);
      return;
    }
    if (chip) {
      activeFilter = chip.dataset.filter;
      renderFilters();
      renderOrdersList();
      return;
    }
    if (closeAlert) {
      document.getElementById("urgent-alert").classList.add("hidden");
    }
  });

  document.getElementById("modal-confirm-btn")?.addEventListener("click", async (event) => {
    if (!modalOrderId) return;
    const id = modalOrderId;
    const btn = event.currentTarget;
    btn.disabled = true;
    closeOrderModal();
    await changeStatus(id, "confirmed");
    btn.disabled = false;
  });

  document.getElementById("modal-close-btn")?.addEventListener("click", closeOrderModal);
  document.getElementById("modal-back-btn")?.addEventListener("click", closeOrderModal);
  document.getElementById("order-modal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeOrderModal();
  });

  document.getElementById("refresh-btn")?.addEventListener("click", () => loadOrders());

  document.getElementById("store-status-toggle")?.addEventListener("click", async () => {
    const next = !storeOpen;
    const previous = storeOpen;
    applyStoreStatus(next);
    if (PREVIEW) return;
    try {
      await storeRepository.setStatus(next);
    } catch (err) {
      console.warn("[dashboard] store status not saved:", err && err.code);
      applyStoreStatus(previous);
    }
  });
}

function bootstrap() {
  content.innerHTML = `
    <div class="w-full bg-error-container text-on-error-container p-3 flex items-center gap-2 hidden" id="dashboard-error">
      <span class="material-symbols-outlined text-[18px]">error</span>
      <span class="text-sm font-semibold"></span>
    </div>
    <aside class="w-full px-gutter py-2.5 flex items-center justify-between bg-inverse-surface text-inverse-on-surface border-b border-outline-variant/40" id="urgent-alert">
      <div class="flex items-center gap-space-sm min-w-0">
        <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-primary text-on-primary">
          <span class="material-symbols-outlined text-[18px] animate-bounce">notifications_active</span>
        </div>
        <div class="flex flex-col min-w-0">
          <span class="font-bold text-xs leading-tight">تنبيه فوري: طلب جديد!</span>
          <span class="text-[11px] truncate opacity-80" id="urgent-alert-text">وصل طلب جديد للتو.</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="px-2.5 py-1 rounded-md text-xs font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-1 bg-inverse-on-surface text-inverse-surface cursor-pointer" id="urgent-preview-btn" type="button">
          <span class="material-symbols-outlined text-[16px]">arrow_downward</span>
          معاينة
        </button>
        <button aria-label="إغلاق التنبيه" class="w-6 h-6 flex items-center justify-center rounded-full text-inverse-on-surface/70 hover:text-inverse-on-surface hover:bg-inverse-on-surface/10 border-0 bg-transparent cursor-pointer" id="urgent-close-btn" type="button">
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </aside>
    <div class="flex flex-col gap-space-md w-full px-margin-mobile md:px-margin py-space-md">
      ${storeStatusMarkup}
      <section aria-label="إحصائيات اليوم السريعة" class="grid grid-cols-3 gap-space-xs" id="stats-grid"></section>
      <section aria-label="تصنيف وتصفية الطلبات" class="flex flex-col gap-space-xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="font-headline-sm text-headline-sm text-on-surface font-bold">طلبات اليوم</span>
            <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-label-sm text-label-sm text-outline">تحديث تلقائي</span>
            <button aria-label="تحديث يدوي" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors border border-outline-variant/30 bg-surface-container-lowest cursor-pointer" id="refresh-btn" type="button">
              <span class="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        </div>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar" id="status-filters"></div>
      </section>
      <div class="flex flex-col gap-space-sm" id="orders-list"></div>
    </div>
    ${modalMarkup}`;

  document.getElementById("urgent-preview-btn")?.addEventListener("click", () => {
    const first = visibleOrders()[0];
    if (!first) return;
    activeFilter = "pending";
    renderFilters();
    renderOrdersList();
    document.querySelector(`[data-order-id="${first.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  wireEvents();
  applyStoreStatus(true);
  if (!PREVIEW) {
    storeRepository.getStatus().then(applyStoreStatus).catch((err) => {
      console.warn("[dashboard] store status not loaded:", err && err.code);
      applyStoreStatus(true);
    });
  }
  loadOrders();

  window.setInterval(() => loadOrders({ silent: true }), 30000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}