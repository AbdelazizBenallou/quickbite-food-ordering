/**
 * كويك بايت | Quick Bite — Business statistics dashboard (admin)
 *
 * Revenue + volume for اليوم / هذا الأسبوع / هذا الشهر (non-cancelled),
 * orders per day chart (last 7 days), most frequent customers, most ordered
 * meals, and a few extra signals. `?demo=1` renders mock data.
 */
import { initAdminLayout } from "./layout.js";
import { orderRepository } from "../../js/repositories/index.js";
import { escapeHtml, formatPrice, timeAgo, toArabicDigits } from "../../js/utils/helpers.js";

const PREVIEW = new URLSearchParams(window.location.search).has("demo");

const layout = initAdminLayout({ activePath: "statistics", subtitle: "إحصائيات الأعمال", demo: PREVIEW });
const content = layout.content;

const WEEKDAY = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "short" });
const DAY = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric" });

const DEMO_ORDERS = (() => {
  const table = [
    { name: "أحمد (حي الوادي)", phone: "0551234567", meals: [["وجبة دجاج مشوي عائلي", 1150, 1], ["بطاطا حارة", 150, 1]], status: "delivered" },
    { name: "فاطمة (حي النخيل)", phone: "0662345678", meals: [["برغر كويك كلاسيك", 500, 2], ["عصير برتقال", 100, 1]], status: "delivered" },
    { name: "يوسف (وسط المدينة)", phone: "0771122334", meals: [["بيتزا مارغريتا", 350, 2], ["كوكا", 150, 1]], status: "delivered" },
    { name: "سارة (استلام من الفرع)", phone: "0790001122", meals: [["ساندويتش سوبريم", 600, 1]], status: "pending" },
    { name: "كريم (شارع الجمهورية)", phone: "0773456789", meals: [["برغر كويك كلاسيك", 500, 1], ["بطاطس ويدجز", 350, 1]], status: "confirmed" },
  ];
  const orders = [];
  for (let d = 6; d >= 0; d--) {
    for (let i = 0; i < 4; i++) {
      const row = table[(i + d) % table.length];
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - d);
      createdAt.setHours(10 + i * 3, (i * 17) % 60, 0, 0);
      const items = row.meals.map(([name, price, qty]) => ({ id: name, name, price, qty, subtotal: price * qty }));
      const cancelled = i === 3 && d % 2 === 0;
      orders.push({
        id: `QK${createdAt.getTime().toString(36).toUpperCase()}`,
        customer: { name: row.name, phone: row.phone, address: "—" },
        items,
        total: items.reduce((sum, it) => sum + it.subtotal, 0),
        status: cancelled ? "cancelled" : row.status,
        createdAt,
      });
    }
  }
  return orders;
})();

let orders = [];

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek(d) {
  const day = startOfDay(d);
  const gap = day.getDay();
  day.setDate(day.getDate() - gap);
  return day;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function valid(o) {
  return o.status !== "cancelled" && o.createdAt instanceof Date && !Number.isNaN(o.createdAt.getTime());
}

function sumTotal(list) {
  return list.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
}

function buildStats() {
  const mono = (o) => o.createdAt.getTime();
  const now = new Date();
  const today = startOfDay(now).getTime();
  const week = startOfWeek(now).getTime();
  const month = startOfMonth(now).getTime();

  const todayList = orders.filter((o) => valid(o) && mono(o) >= today);
  const weekList = orders.filter((o) => valid(o) && mono(o) >= week);
  const monthAll = orders.filter((o) => valid(o) && mono(o) >= month);
  const cancelledMonth = orders.filter((o) => o.status === "cancelled" && mono(o) >= month);

  const dayCounts = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today - i * 86400000);
    const next = dayStart.getTime() + 86400000;
    const count = orders.filter((o) => o.status !== "cancelled" && mono(o) >= dayStart.getTime() && mono(o) < next).length;
    dayCounts.push({ label: WEEKDAY.format(dayStart).replace("\u060c", ""), title: `${DAY.format(dayStart)} ${WEEKDAY.format(dayStart)}`, count });
  }

  const customerStats = {};
  for (const o of monthAll) {
    const name = String((o.customer && o.customer.name) || "عميل").trim();
    customerStats[name] = customerStats[name] || { name, count: 0, revenue: 0, phone: (o.customer && o.customer.phone) || "" };
    customerStats[name].count += 1;
    customerStats[name].revenue += Number(o.total) || 0;
  }
  const topCustomers = Object.values(customerStats).sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 3);

  const mealStats = {};
  for (const o of monthAll) {
    for (const it of Array.isArray(o.items) ? o.items : []) {
      const key = String(it.name || "منتج").trim();
      mealStats[key] = mealStats[key] || { name: key, qty: 0, revenue: 0 };
      mealStats[key].qty += Number(it.qty) || 0;
      mealStats[key].revenue += Number(it.subtotal) || Number(it.price || 0) * (Number(it.qty) || 0);
    }
  }
  const topMeals = Object.values(mealStats).sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5);

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const o of monthAll) weekdayCounts[o.createdAt.getDay()] += 1;
  const busiestIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts));
  const busiestDay = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "long" }).format(new Date(2026, 0, busiestIndex + 1)).replace("\u060c", "");

  const totalToday = sumTotal(todayList);
  const totalWeek = sumTotal(weekList);
  const totalMonth = sumTotal(monthAll);
  const biggest = monthAll.reduce((acc, o) => (Number(o.total) || 0) > (acc ? acc.total : 0) ? o : acc, null);

  return {
    today: { total: totalToday, count: todayList.length },
    week: { total: totalWeek, count: weekList.length },
    month: { total: totalMonth, count: monthAll.length },
    cancelledMonth: cancelledMonth.length,
    dayCounts,
    topCustomers,
    topMeals,
    avgOrder: monthAll.length ? totalMonth / monthAll.length : 0,
    busiestDay: { name: busiestDay, count: Math.max(...weekdayCounts) },
    biggest: biggest ? { total: biggest.total, label: (biggest.customer && biggest.customer.name) || "—" } : null,
  };
}

function kpiCard(label, total, count, icon, iconClass, sub) {
  return `
  <div class="rounded-xl p-space-sm shadow-sm flex flex-col gap-space-xs bg-surface-container-lowest border border-outline-variant/30">
    <div class="flex items-center justify-between">
      <span class="text-xs font-bold text-on-surface">${label}</span>
      <span class="w-7 h-7 rounded-lg flex items-center justify-center ${iconClass}">
        <span class="material-symbols-outlined text-[17px]">${icon}</span>
      </span>
    </div>
    <div class="flex flex-col gap-0.5">
      <span class="text-lg font-bold text-primary">${escapeHtml(formatPrice(total))}</span>
      <span class="text-[11px] text-on-surface-variant">${toArabicDigits(count)} ${count === 1 ? "طلب" : "طلبات"} — ${sub}</span>
    </div>
  </div>`;
}

const DONUT_PALETTE = [
  "rgb(var(--c-primary))",
  "rgb(var(--c-secondary))",
  "rgb(var(--c-tertiary))",
  "rgb(var(--c-warning))",
  "rgb(var(--c-error))",
  "rgb(var(--c-primary-fixed))",
  "rgb(var(--c-secondary-fixed))",
];

function pctLabel(count, total) {
  if (!total) return "0";
  const p = (count / total) * 100;
  return p >= 1 ? String(Math.round(p)) : p.toFixed(1);
}

function barChartMarkup(dayCounts) {
  const max = Math.max(1, ...dayCounts.map((d) => d.count));
  const total = dayCounts.reduce((a, d) => a + d.count, 0);

  const CHORDS = 2 * Math.PI * 44;
  let acc = 0;
  const segments = dayCounts
    .map((d, index) => {
      const len = total ? (d.count / total) * CHORDS : 0;
      const seg = `<circle cx="60" cy="60" r="44" fill="none" stroke="${DONUT_PALETTE[index % DONUT_PALETTE.length]}" stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(CHORDS - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"></circle>`;
      acc += len;
      return len > 0 ? seg : "";
    })
    .join("");

  const legend = dayCounts
    .map(
      (d, index) => `
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${DONUT_PALETTE[index % DONUT_PALETTE.length]}"></span>
        <span class="text-xs text-on-surface-variant truncate flex-1">${escapeHtml(d.title)}</span>
        <span class="text-xs font-bold text-on-surface shrink-0">${toArabicDigits(d.count)} · ${pctLabel(d.count, total)}%</span>
      </div>`,
    )
    .join("");

  return `
  <div class="rounded-xl p-space-md shadow-sm flex flex-col gap-space-md bg-surface-container-lowest border border-outline-variant/30">
    <div class="flex items-center justify-between">
      <div class="flex flex-col">
        <span class="text-sm font-bold text-on-surface">الطلبات حسب اليوم</span>
        <span class="text-[11px] text-on-surface-variant">آخر 7 أيام — ${toArabicDigits(total)} ${total === 1 ? "طلب" : "طلبات"}</span>
      </div>
      <span class="material-symbols-outlined text-primary">calendar_month</span>
    </div>

    <div class="flex flex-col md:flex-row items-center gap-6">
      <div class="relative w-40 h-40 shrink-0" role="img" aria-label="دائرة توزيع طلبات الأسبوع">
        <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="44" fill="none" stroke="rgb(var(--c-surface-container-high))" stroke-width="18"></circle>
          ${segments}
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span class="text-xl font-bold text-on-surface">${toArabicDigits(total)}</span>
          <span class="text-[10px] text-on-surface-variant">إجمالي الأسبوع</span>
        </div>
      </div>
      <div class="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 min-w-0">
        ${legend}
      </div>
    </div>

    <div class="border-t border-surface-container-high/60 pt-4 flex items-end justify-between gap-2 h-36" role="img" aria-label="مخطط الطلبات الأسبوعية">
      ${dayCounts
        .map((d, index) => {
          const isToday = index === dayCounts.length - 1;
          const height = Math.max(d.count === 0 ? 4 : Math.round((d.count / max) * 100), 6);
          return `
          <div class="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span class="text-[11px] font-bold ${d.count ? "text-on-surface" : "text-on-surface-variant"}">${toArabicDigits(d.count)}</span>
            <div class="w-full max-w-[34px] rounded-lg ${isToday ? "bg-primary" : "bg-surface-container-high"} transition-colors" style="height:${height}%" title="${escapeHtml(d.title)}"></div>
            <span class="text-[10px] truncate w-full text-center ${isToday ? "text-primary font-bold" : "text-on-surface-variant"}">${escapeHtml(d.label)}</span>
          </div>`;
        })
        .join("")}
    </div>
  </div>`;
}

function topBlockMarkup(title, icon, rowsMarkup, emptyText) {
  return `
  <div class="rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm bg-surface-container-lowest border border-outline-variant/30">
    <div class="flex items-center gap-2">
      <span class="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-container-high text-primary">
        <span class="material-symbols-outlined text-[17px]">${icon}</span>
      </span>
      <span class="text-sm font-bold text-on-surface">${title}</span>
    </div>
    ${rowsMarkup || `<div class="py-6 text-center text-xs text-on-surface-variant">${emptyText}</div>`}
  </div>`;
}

function render() {
  const s = buildStats();
  const monthLabel = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { month: "long", year: "numeric" }).format(new Date());

  const customerRows = s.topCustomers.length
    ? `<ol class="flex flex-col gap-2">
        ${s.topCustomers
          .map(
            (c, i) => `<li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 ${
              i === 0 ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
            }">${toArabicDigits(i + 1)}</span>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs font-bold truncate text-on-surface">${escapeHtml(c.name)}</span>
              <span class="text-[10px] text-on-surface-variant" dir="ltr">${escapeHtml(c.phone)}</span>
            </div>
            <span class="text-[11px] font-bold text-on-surface-variant shrink-0">${toArabicDigits(c.count)} ${c.count === 1 ? "توريد" : "توريدات"}</span>
          </li>`,
          )
          .join("")}
      </ol>`
    : "";

  const mealRows = s.topMeals.length
    ? `<ol class="flex flex-col gap-2">
        ${s.topMeals
          .map(
            (m, i) => `<li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 ${
              i === 0 ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
            }">${toArabicDigits(i + 1)}</span>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-xs font-bold truncate text-on-surface">${escapeHtml(m.name)}</span>
              <span class="text-[10px] text-on-surface-variant">قيمة مساهمة: ${escapeHtml(formatPrice(m.revenue))}</span>
            </div>
            <span class="h-5 px-2 rounded-full bg-surface-container-high text-[11px] font-bold text-on-surface shrink-0 flex items-center">×${toArabicDigits(m.qty)}</span>
          </li>`,
          )
          .join("")}
      </ol>`
    : "";

  const insights = `
  <div class="grid grid-cols-3 gap-space-xs">
    <div class="rounded-xl p-space-sm shadow-sm bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1">
      <span class="w-6 h-6 rounded-lg flex items-center justify-center bg-surface-container-high text-primary"><span class="material-symbols-outlined text-[15px]">shopping_basket</span></span>
      <span class="text-base font-bold text-on-surface">${escapeHtml(formatPrice(s.avgOrder))}</span>
      <span class="text-[10px] text-on-surface-variant">متوسط قيمة السلة (الشهر)</span>
    </div>
    <div class="rounded-xl p-space-sm shadow-sm bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1">
      <span class="w-6 h-6 rounded-lg flex items-center justify-center bg-warning-container text-on-warning-container"><span class="material-symbols-outlined text-[15px]">calendar_month</span></span>
      <span class="text-base font-bold text-on-surface">${escapeHtml(s.busiestDay.name)}</span>
      <span class="text-[10px] text-on-surface-variant">الأكثر ازدحاماً (${toArabicDigits(s.busiestDay.count)} طلب)</span>
    </div>
    <div class="rounded-xl p-space-sm shadow-sm bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1">
      <span class="w-6 h-6 rounded-lg flex items-center justify-center bg-error-container text-on-error-container"><span class="material-symbols-outlined text-[15px]">cancel</span></span>
      <span class="text-base font-bold text-on-surface">${toArabicDigits(s.cancelledMonth)}</span>
      <span class="text-[10px] text-on-surface-variant">ملغى هذا الشهر</span>
    </div>
  </div>`;

  const biggestLine = s.biggest
    ? `<div class="flex items-center gap-2 rounded-xl p-space-sm bg-surface-container-low border border-outline-variant/30 text-xs">
        <span class="material-symbols-outlined text-[16px] text-primary shrink-0">workspace_premium</span>
        <span class="text-on-surface-variant">أعلى فاتورة هذا الشهر:</span>
        <span class="font-bold text-on-surface truncate">${escapeHtml(s.biggest.label)}</span>
        <span class="font-bold text-primary shrink-0">${escapeHtml(formatPrice(s.biggest.total))}</span>
      </div>`
    : "";

  content.innerHTML = `
    <div class="flex flex-col gap-space-md w-full px-margin-mobile md:px-margin py-space-md">
      <div class="flex items-start justify-between gap-2">
        <div class="flex flex-col gap-0.5">
          <h1 class="font-headline-sm text-headline-sm text-on-surface font-bold">نظرة عامة — ${monthLabel}</h1>
          <span class="text-xs text-on-surface-variant">آخر تحديث: ${timeAgo(new Date())} • يشمل الطلبات المؤكدة والمسلّمة حصراً</span>
        </div>
        <span class="material-symbols-outlined text-[26px] text-primary shrink-0">monitoring</span>
      </div>

      <section aria-label="إيراد اليوم والأسبوع والشهر" class="grid grid-cols-3 gap-space-xs">
        ${kpiCard("اليوم", s.today.total, s.today.count, "today", "bg-surface-container-high text-primary", "منذ منتصف الليل")}
        ${kpiCard("هذا الأسبوع", s.week.total, s.week.count, "calendar_view_week", "bg-surface-container-high text-primary", `من ${WEEKDAY.format(startOfWeek(new Date())).replace("\u060c", "")}`)}
        ${kpiCard("هذا الشهر", s.month.total, s.month.count, "calendar_month", "bg-surface-container-high text-primary", "منذ بداية الشهر")}
      </section>

      ${biggestLine}

      <div class="flex flex-col gap-space-md">
        ${barChartMarkup(s.dayCounts)}
        ${insights}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        ${topBlockMarkup("الأكثر طلباً من العملاء", "favorite", customerRows, "لا توجد طلبات مؤكدة هذا الشهر بعد.")}
        ${topBlockMarkup("الأطباق الأكثر طلباً", "restaurant_menu", mealRows, "لا توجد طلبات مؤكدة هذا الشهر بعد.")}
      </div>
    </div>`;
}

const TRANSIENT = new Set(["unavailable", "aborted", "deadline-exceeded", "internal", "resource-exhausted", "data-loss"]);

function showStatsError(text, meta = {}) {
  const codeLine = meta.code && meta.code !== "unknown"
    ? `<pre class="mt-1 text-[10px] opacity-70 whitespace-pre-wrap break-words">code: ${escapeHtml(String(meta.code))}${meta.message ? "\n" + escapeHtml(String(meta.message).slice(0, 180)) : ""}</pre>`
    : "";
  content.innerHTML = `
    <div class="flex flex-col gap-3 w-full px-margin-mobile md:px-margin py-space-md">
      <div class="w-full p-4 flex flex-col gap-2 rounded-xl bg-error-container text-on-error-container border border-outline-variant/30">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px]">error</span>
          <span class="text-sm font-semibold">${text}</span>
        </div>
        ${codeLine}
        ${meta.retry ? `<button class="self-end h-9 px-4 rounded-lg text-xs font-bold bg-on-error-container text-error-container hover:opacity-90 transition-opacity border-0 cursor-pointer" id="stats-retry" type="button">
          <span class="material-symbols-outlined text-[16px] align-[-3px]">refresh</span> إعادة المحاولة
        </button>` : ""}
      </div>
    </div>`;
  if (meta.retry) {
    document.getElementById("stats-retry")?.addEventListener("click", () => load(1));
  }
}

async function load(attempt = 1) {
  const now = new Date();
  const from = Math.min(startOfWeek(now).getTime(), startOfMonth(now).getTime());
  try {
    orders = PREVIEW ? DEMO_ORDERS : await orderRepository.listBetween(new Date(from), now);
    render();
  } catch (error) {
    console.warn("[admin.statistics] load failed:", error);
    const code = (error && error.code) || (error && error.name) || "unknown";
    const message = (error && error.message) || String(error || "");

    if (code === "permission-denied") {
      showStatsError("لا توجد صلاحية لقراءة الطلبات. تأكد من نشر قواعد الأمان (allow read للطلبات بحساب المسؤول الأصلي).", { code, message });
      return;
    }
    if (TRANSIENT.has(code) && attempt < 4) {
      showStatsError(`تعذّر الاتصال أثناء تحميل الإحصائيات — إعادة المحاولة (${toArabicDigits(attempt)}/3)…`, { code, message });
      window.setTimeout(() => load(attempt + 1), 1200 * attempt);
      return;
    }
    showStatsError("تعذّر تحميل الإحصائيات. أعد المحاولة لاحقاً.", { code, message, retry: true });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", load, { once: true });
} else {
  load();
}