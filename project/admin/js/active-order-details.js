/**
 * كويك بايت | Quick Bite — تفاصيل الطلب النشط (Active order details)
 *
 * Shows the kitchen's *current* order — the newest one still pending or
 * confirmed — with a journey stepper, customer card, itemized bill and the
 * direct actions (accept → delivered → cancel). Status changes go to Firestore
 * via orderRepository.updateStatus(); `?demo=1` previews the layout with mock
 * data.
 */
import { initAdminLayout } from "./layout.js";
import { showConfirmDialog } from "../../js/components/confirmDialog.js";
import { orderRepository } from "../../js/repositories/index.js";
import { copyText, escapeHtml, formatNumber, formatPrice, timeAgo, toArabicDigits } from "../../js/utils/helpers.js";

const PREVIEW = new URLSearchParams(window.location.search).has("demo");
const layout = initAdminLayout({ activePath: "active-order-details", subtitle: "تفاصيل الطلب النشط", demo: PREVIEW });
const content = layout.content;

const SAMPLE_ACTIVE = {
  id: "QK1A55F2",
  customer: { name: "أحمد", phone: "0551234567", address: "الوادي، حي النور، عمارة 12" },
  items: [
    { id: "pizza", name: "بيتزا كلاسيك", price: 500, qty: 2, subtotal: 1000 },
    { id: "cola", name: "مشروب كوكاكولا", price: 150, qty: 1, subtotal: 150 },
    { id: "water", name: "ماء معدني طبيعي", price: 50, qty: 1, subtotal: 50 },
  ],
  subtotal: 1200,
  deliveryFee: 0,
  total: 1200,
  status: "pending",
  createdAt: new Date(Date.now() - 4 * 60000),
};

const STATUS = {
  pending: { chip: "bg-warning-container text-on-warning-container", pulse: true, label: "طلب جديد #" },
  confirmed: { chip: "bg-surface-container-high text-on-surface", pulse: true, label: "قيد التحضير #" },
  delivered: { chip: "bg-surface-container-high text-on-surface-variant", pulse: false, label: "تم التسليم #" },
  cancelled: { chip: "bg-error-container text-on-error-container", pulse: false, label: "مُلغي #" },
};

let active = null;

function idToken(order) {
  return escapeHtml(String(order?.id || "").slice(-6).toUpperCase());
}

/* ---------------------------------------------------------------------------
   Static pieces (built once, refreshed when the data changes).
   -------------------------------------------------------------------------- */

function stepperMarkup(status) {
  const reached = { pending: 1, confirmed: 2, delivered: 3, cancelled: 0 }[status] ?? 1;
  const steps = [
    { label: "جديد" },
    { label: "تم التأكيد" },
    { label: "تم التسليم" },
  ];

  return `
    <div class="grid gap-1.5 pt-1 flex" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
      ${steps
        .map((step, index) => {
          const filled = reached > index;
          const isTip = reached === index + 1 && status !== "cancelled";
          return `
          <div class="flex flex-col gap-1.5 items-center text-center">
            <div class="h-2 w-full rounded-full ${filled ? "bg-primary" : "bg-surface-variant"}"></div>
            <span class="font-label-sm text-label-sm ${isTip ? "text-primary font-bold" : filled ? "text-primary font-bold" : "text-on-surface-variant"}">${step.label}</span>
          </div>`;
        })
        .join("")}
    </div>`;
}

function customerCard(order) {
  return `
    <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-space-xs">
          <div class="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[20px]">account_circle</span>
          </div>
          <div>
            <h2 class="font-headline-sm text-headline-sm text-on-surface">معلومات الزبون</h2>
            <span class="font-label-sm text-label-sm text-on-surface-variant">طلب توصيل مباشر</span>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-space-sm bg-surface-container-low p-space-sm rounded-lg flex">
        <div class="flex items-center justify-between">
          <span class="font-body-md text-body-md text-on-surface-variant">اسم العميل:</span>
          <span class="font-headline-sm text-headline-sm text-on-surface font-bold">${escapeHtml(order.customer?.name || "—")}</span>
        </div>
        <div class="flex items-center justify-between pt-1">
          <div class="flex flex-col">
            <span class="font-body-md text-body-md text-on-surface-variant">رقم الهاتف:</span>
            <span class="font-headline-sm text-headline-sm text-on-surface tracking-wider" dir="ltr">${escapeHtml(order.customer?.phone || "—")}</span>
          </div>
          <a class="inline-flex items-center gap-1.5 bg-primary-container text-on-primary font-label-md text-label-md px-3 py-2 rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all" href="tel:${escapeHtml(order.customer?.phone || "")}">
            <span class="material-symbols-outlined text-[18px]">call</span>
            <span>اتصال بالزبون</span>
          </a>
        </div>
        <div class="flex items-start gap-space-xs pt-1">
          <span class="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">location_on</span>
          <div class="flex flex-col">
            <span class="font-label-sm text-label-sm text-on-surface-variant">عنوان التوصيل</span>
            <span class="font-body-md text-body-md text-on-surface font-semibold">${escapeHtml(order.customer?.address || "—")}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function itemsCard(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return `
    <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-xs">
      <div class="flex items-center justify-between mb-1">
        <h2 class="font-headline-sm text-headline-sm text-on-surface">الأصناف المطلوبة</h2>
        <span class="font-label-md text-label-md text-primary font-bold bg-primary-fixed/30 px-2 py-0.5 rounded-full">${toArabicDigits(items.length)} أصناف</span>
      </div>
      ${items
        .map(
          (item) => `
        <div class="flex items-center justify-between gap-space-sm p-space-xs rounded-lg hover:bg-surface-container-low transition-colors">
          <div class="flex items-center gap-space-sm min-w-0">
            <div class="w-14 h-14 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 shadow-sm">
              <span class="material-symbols-outlined text-[24px]">restaurant</span>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold shrink-0">${toArabicDigits(item.qty)}</span>
                <span class="font-headline-sm text-headline-sm text-on-surface font-semibold break-words">${escapeHtml(item.name)}</span>
              </div>
              <span class="font-body-sm text-body-sm text-on-surface-variant">${item.qty > 1 ? `${escapeHtml(formatNumber(item.price))} د.ج للواحدة` : "سعر واحدة"}</span>
            </div>
          </div>
          <div class="text-left shrink-0">
            <span class="font-headline-sm text-headline-sm text-on-surface font-bold">${escapeHtml(formatNumber(item.subtotal))}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant mr-0.5">د.ج</span>
          </div>
        </div>`,
        )
        .join("")}
    </div>`;
}

function billCard(order) {
  const deliveryFree = !order.deliveryFee;
  return `
    <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">ملخص الحساب</h3>
      <div class="flex items-center justify-between text-on-surface-variant font-body-md text-body-md">
        <span>مجموع المنتجات:</span>
        <span class="font-semibold text-on-surface">${escapeHtml(formatNumber(order.subtotal))} د.ج</span>
      </div>
      <div class="flex items-center justify-between text-on-surface-variant font-body-md text-body-md">
        <span>رسوم التوصيل:</span>
        <span class="text-primary font-semibold">${deliveryFree ? "مجاني (عرض ترويجي)" : `${escapeHtml(formatNumber(order.deliveryFee))} د.ج`}</span>
      </div>
      <div class="h-px bg-surface-variant my-1"></div>
      <div class="flex items-center justify-between bg-surface-container p-space-sm rounded-lg">
        <div class="flex flex-col">
          <span class="font-headline-sm text-headline-sm text-on-surface font-bold">المجموع الإجمالي</span>
          <span class="font-label-sm text-label-sm text-on-surface-variant font-semibold">الدفع عند الاستلام (كاش)</span>
        </div>
        <div class="text-left">
          <span class="font-headline-lg text-headline-lg text-primary font-bold">${escapeHtml(formatNumber(order.total))}</span>
          <span class="font-label-md text-label-md text-primary font-bold mr-1">د.ج</span>
        </div>
      </div>
    </div>`;
}

function actionsMarkup(order) {
  const terminal = order.status === "delivered" || order.status === "cancelled";

  if (terminal) {
    const done = order.status === "delivered";
    return `
      <div class="rounded-xl bg-surface-container-low p-4 flex items-center gap-2 text-sm font-semibold text-on-surface">
        <span class="material-symbols-outlined text-primary text-[20px]">${done ? "task_alt" : "block"}</span>
        <span>${done ? "تم تسليم هذا الطلب واستلام المبلغ بنجاح." : "تم إلغاء هذا الطلب وتحويله لقائمة الملغيات."}</span>
      </div>`;
  }

  return `
    <span class="font-label-sm text-label-sm text-outline px-1 font-bold">إجراءات الطلب المباشرة</span>
    <button class="w-full h-12 bg-primary hover:bg-primary-hover text-on-primary font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-xs shadow-md active:scale-[0.98] transition-all border-0 cursor-pointer" id="btn-accept" type="button">
      <span class="material-symbols-outlined text-[22px]">check_circle</span>
      <span>تأكيد وقبول الطلب</span>
    </button>
    <button class="w-full h-12 bg-surface-container-high hover:bg-surface-variant text-on-surface font-headline-sm text-headline-sm rounded-xl flex items-center justify-center gap-space-xs active:scale-[0.98] transition-all border-0 cursor-pointer" id="btn-deliver" type="button">
      <span class="material-symbols-outlined text-primary text-[22px]">payments</span>
      <span>إنهاء الدفع</span>
    </button>
    <button class="w-full py-2.5 text-error font-label-md text-label-md rounded-lg flex items-center justify-center gap-1 hover:bg-error-container/20 active:scale-95 transition-all mt-1 border-0 bg-transparent cursor-pointer" id="btn-cancel" type="button">
      <span class="material-symbols-outlined text-[18px]">cancel</span>
      <span>إلغاء أو رفض الطلب</span>
    </button>`;
}

/* ---------------------------------------------------------------------------
   Rendering.
   -------------------------------------------------------------------------- */

function showToast(message, { error = false } = {}) {
  const toast = document.getElementById("status-toast");
  const toastMsg = document.getElementById("toast-message");
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.classList.remove("bg-primary", "text-on-primary", "bg-error-container", "text-on-error-container");
  toast.classList.add(error ? "bg-error-container" : "bg-primary", error ? "text-on-error-container" : "text-on-primary");
  toast.classList.remove("hidden");
  toast.classList.add("flex");
  window.setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("flex");
  }, 3200);
}

function renderEmpty(state) {
  content.innerHTML = `
    <div class="flex items-center justify-center py-20 w-full">
      <div class="text-center space-y-space-sm max-w-sm mx-auto">
        <span class="material-symbols-outlined text-[44px] text-primary inline-block">${state === "none" ? "restaurant" : "error"}</span>
        <h2 class="font-headline-md text-headline-md text-on-surface font-bold">${state === "none" ? "لا يوجد طلب نشط حالياً" : "تعذّر تحميل الطلب"}</h2>
        <p class="font-body-sm text-body-sm text-on-surface-variant">${
          state === "none"
            ? "الطلبات الجديدة تظهر هنا تلقائياً عند وصولها."
            : "تحقق من قواعد الأمان أو اتصالك ثم أعد المحاولة."
        }</p>
        <a class="inline-block mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold" href="orders.html">العودة لطلبات اليوم</a>
      </div>
    </div>`;
}

function render() {
  if (!active) {
    renderEmpty("none");
    return;
  }
  const s = STATUS[active.status] || STATUS.pending;
  const phone = escapeHtml(active.customer?.phone || "");

  content.innerHTML = `
    <div class="px-margin-mobile md:px-margin py-space-md flex flex-col gap-space-md w-full">
      <div class="flex items-center justify-between gap-space-sm bg-surface-container-low p-space-sm rounded-xl">
        <a class="inline-flex items-center gap-space-xs text-primary font-label-md text-label-md hover:text-primary-hover transition-colors py-1 px-2 rounded-lg hover:bg-surface-container" href="orders.html">
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          <span>العودة لطلبات اليوم</span>
        </a>
        <div class="flex items-center gap-space-xs">
          ${s.pulse ? `<span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning"></span>
          </span>` : ""}
          <span class="bg-surface-container-high text-on-surface-variant font-headline-sm text-headline-sm px-2.5 py-0.5 rounded-full font-bold ${s.chip}">
            ${s.label}${idToken(active)}
          </span>
          <button aria-label="نسخ رقم الطلب" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors border border-outline-variant/30 bg-surface-container-lowest cursor-pointer" id="details-copy-btn" data-copy-text="${idToken(active)}" title="نسخ رقم الطلب لتأكيد الدفع مع العميل" type="button">
            <span class="material-symbols-outlined text-[17px]">content_copy</span>
          </button>
        </div>
      </div>

      <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
        <div class="flex items-center justify-between">
          <span class="font-headline-sm text-headline-sm text-on-surface">مراحل سير الطلب</span>
          <span class="font-label-sm text-label-sm text-outline">${escapeHtml(timeAgo(active.createdAt))}</span>
        </div>
        ${stepperMarkup(active.status)}
      </div>

      ${customerCard(active)}
      ${itemsCard(active)}
      ${billCard(active)}

      <div class="flex flex-col gap-space-sm mt-1">
        ${actionsMarkup(active)}
      </div>

      <div class="hidden transition-all duration-300 p-space-sm rounded-xl bg-primary text-on-primary font-body-md text-body-md text-center items-center justify-center gap-space-xs shadow-lg" id="status-toast">
        <span class="material-symbols-outlined text-[20px]">done</span>
        <span id="toast-message" class="">تم تحديث حالة الطلب بنجاح</span>
      </div>
    </div>`;

  document.getElementById("btn-accept")?.addEventListener("click", () => changeStatus("confirmed", () => showToast(`تم قبول وتأكيد الطلب #${idToken(active)} وجارٍ تحضيره في المطبخ`)));
  document.getElementById("btn-deliver")?.addEventListener("click", () => changeStatus("delivered", () => showToast("اكتمل الطلب وتم استلام المبلغ " + formatNumber(active.total) + " د.ج بنجاح")));
  document.getElementById("btn-cancel")?.addEventListener("click", async () => {
    const ok = await showConfirmDialog({
      title: "إلغاء الطلب",
      message: `هل أنت متأكد من رغبتك في إلغاء الطلب <b class="text-on-surface">#${escapeHtml(idToken(active))}</b>؟<br>سيتم تحويله إلى قائمة الملغيات ولن يتم تحصيل المبلغ.`,
      confirmLabel: "تأكيد الإلغاء",
      cancelLabel: "التراجع",
    });
    if (!ok) return;
    changeStatus("cancelled", () => showToast("تم إلغاء الطلب وتحويله لقائمة الملغيات", { error: true }));
  });

  document.getElementById("details-copy-btn")?.addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    const icon = btn.querySelector(".material-symbols-outlined");
    const ok = await copyText(btn.dataset.copyText);
    if (icon) {
      const prev = icon.textContent;
      icon.textContent = ok ? "check" : "close";
      if (ok) btn.classList.add("text-primary");
      window.setTimeout(() => {
        icon.textContent = prev;
        btn.classList.remove("text-primary");
      }, 1400);
    }
  });
}

async function load() {
  try {
    const all = await orderRepository.listAll();
    active = all.find((order) => order.status === "pending" || order.status === "confirmed") || null;
    render();
  } catch (error) {
    console.warn("[admin.orders] active order load failed:", error);
    renderEmpty("error");
  }
}

async function changeStatus(status, onSuccess) {
  if (!active) return;
  if (PREVIEW) {
    active.status = status;
    render();
    if (onSuccess) onSuccess();
    return;
  }
  try {
    await orderRepository.updateStatus(active.id, status);
    await load();
    if (onSuccess) onSuccess();
  } catch (error) {
    console.warn("[admin.orders] status update failed:", error);
    showToast(
      error && error.code === "permission-denied"
        ? "لا توجد صلاحية لتحديث حالة الطلب. تحقق من قواعد الأمان."
        : "تعذّر تحديث حالة الطلب. أعد المحاولة لاحقاً.",
      { error: true },
    );
  }
}

function bootstrap() {
  if (PREVIEW) {
    active = SAMPLE_ACTIVE;
    render();
    return;
  }
  load();
  window.setInterval(load, 30000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}