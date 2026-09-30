/**
 * Cart state + rules. Pure in-memory business logic: it knows nothing about
 * Firebase and nothing about the DOM.
 */
import { appConfig } from "../config/app.config.js";
import { CartItem } from "../models/index.js";
import { findMenuItem } from "./menuService.js";

/** @type {CartItem[]} */
let cart = [];

/** Cart as an array of CartItem models (safe to hand to the UI). */
export function getCart() {
  return cart;
}

export function isCartEmpty() {
  return cart.length === 0;
}

/** Sum of every line, in د.ج. */
export function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.subtotal, 0);
}

/** Replaces the cart with the given menu ids + quantities. */
function setCart(entries) {
  cart = entries
    .map((entry) => {
      const menuItem = findMenuItem(entry.id);
      if (!menuItem) return null;
      return new CartItem({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        qty: entry.qty,
      });
    })
    .filter(Boolean);
  return cart;
}

/** Cart the app boots with — empty by default (see appConfig.initialCart). */
export function loadInitialCart() {
  return setCart(appConfig.initialCart);
}

/** Adds one of a menu item, or bumps its quantity when already in the cart. */
export function addItem(itemId) {
  const menuItem = findMenuItem(itemId);
  if (!menuItem) return null;

  const existing = cart.find((item) => item.id === itemId);
  if (existing) {
    existing.qty += 1;
    return existing;
  }

  const added = new CartItem({
    id: menuItem.id,
    name: menuItem.name,
    price: menuItem.price,
    qty: 1,
  });
  cart.push(added);
  return added;
}

/**
 * Changes a quantity by `delta`.
 * Lines that reach 0 are removed, exactly like the original cart.
 */
export function updateQty(index, delta) {
  if (!cart[index]) return null;
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  return cart[index] || null;
}

export function clearCart() {
  cart = [];
  return cart;
}

/** Cart used after "طلب جديد". */
export function resetCartToDefault() {
  return setCart(appConfig.resetCart);
}
