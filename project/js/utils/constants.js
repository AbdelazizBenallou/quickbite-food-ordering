/**
 * Shared constants. No imports — safe to use from any layer.
 */

// Firestore collection names (see README: "Adding a new collection")
export const COLLECTIONS = {
  CATEGORIES: "categories",
  ITEMS: "items",
  ORDERS: "orders",
  SETTINGS: "settings",
};

// Order lifecycle
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

// DOM ids / selectors owned by the page
export const SELECTORS = {
  MENU_ROOT: "#menu-root",
  CART_ITEMS: "#cart-items",
  CART_EMPTY: "#cart-empty",
  CART_TOTAL: "#cart-total",
  CONFIRM_BUTTON: "#btn-confirm",
  SUCCESS_BOX: "#order-success-box",
  ORDER_NUMBER: "#order-number",
  ORDER_ERROR: "#order-error",
  CUSTOMER_FORM: {
    NAME: "#cust-name",
    PHONE: "#cust-phone",
    ADDRESS: "#cust-address",
  },
  THEME_TOGGLE: "#theme-toggle",
  STORE_STATUS_CHIP: "#store-status-chip",
  STORE_STATUS_TEXT: "#store-status-text",
  STORE_CLOSED_NOTICE: "#store-closed-notice",
  CONFIRM_BUTTON_LABEL: "#btn-confirm-label",
};

// Attributes used to wire the UI without inline JavaScript
export const ACTIONS = {
  ADD_TO_CART: "data-add",
  QTY_CHANGE: "data-qty",
  CLEAR_CART: "data-clear-cart",
  NEW_ORDER: "data-new-order",
};
