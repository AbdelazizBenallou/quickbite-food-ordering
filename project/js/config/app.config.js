/**
 * Application configuration — everything about the app that is *not* Firebase.
 * Pure data: no Firebase imports, no DOM access.
 */
export const appConfig = {
  // Restaurant / brand
  restaurant: {
    name: "كويك بايت",
    tagline: "طلب الطعام",
  },

  // Money & number formatting
  currency: {
    code: "د.ج",
    // Keeps the original `Number.prototype.toLocaleString()` output (1,200)
    locale: "en-US",
  },

  // Checkout
  checkout: {
    deliveryFee: 0,
    estimatedMinutes: 25,
    // Shown when an order could not be persisted to Firestore
    fallbackOrderNumber: "#1001",
  },

  // Which phone numbers the checkout accepts. Add or remove a pattern when the
  // restaurant's country changes — nothing else has to be edited.
  //   exactly 10 digits, starting with 05, 06 or 07
  validation: {
    phonePatterns: [/^0[567]\d{8}$/],
    phoneDigits: 10,
    phoneHint: "أدخل 10 أرقام تبدأ بـ 05 أو 06 أو 07",
  },

  // Local data files (relative paths — works on Vercel and any static host)
  data: {
    menu: "assets/data/menu.json",
  },

  // Sections used when Firestore cannot be reached (offline menu.json fallback).
  // Same ids as the `categories` documents, so the cart resolves either way.
  fallbackCategories: [
    { id: "food", name: "المأكولات", slug: "food", icon: "lunch_dining", order: 1 },
    { id: "drinks", name: "المشروبات", slug: "drinks", icon: "local_cafe", order: 2 },
  ],

  // The cart starts empty — the customer picks what they want.
  // Add entries here (e.g. { id: "pizza", qty: 1 }) to pre-fill it.
  initialCart: [],

  // What the cart holds after "طلب جديد".
  resetCart: [],
};
