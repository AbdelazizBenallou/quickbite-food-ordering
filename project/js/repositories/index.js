/**
 * Repositories — the only place in the app that speaks Firestore.
 *
 * Controllers and components never import the Firebase SDK; services call
 * these repositories; repositories return Models.
 *
 * Nothing here runs automatically: the app calls a repository only when a
 * feature is switched on (see README: "Persisting orders").
 */
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "../vendor/firebase/firebase-firestore.js";
import { db } from "../firebase/firestore.js";
import { COLLECTIONS } from "../utils/constants.js";
import { Category, MenuItem, Order } from "../models/index.js";

/**
 * Menu reads: the sections the owner maintains, and the products in them.
 * Two simple `getDocs` — no composite index required.
 */
export const menuRepository = {
  /** `categories/{id}` → Category[], sorted by `order`. */
  async getCategories() {
    const snap = await getDocs(query(collection(db, COLLECTIONS.CATEGORIES), orderBy("order", "asc")));
    return snap.docs.map((entry) => Category.fromFirestore(entry.id, entry.data()));
  },

  /** `items/{id}` → MenuItem[], sorted by `order`. */
  async getItems() {
    const snap = await getDocs(query(collection(db, COLLECTIONS.ITEMS), orderBy("order", "asc")));
    return snap.docs.map((entry) => MenuItem.fromFirestore(entry.id, entry.data()));
  },
};

/**
 * Orders collection (`orders/{autoId}`).
 *
 * Add more methods here as the app grows — getById, getByUser, updateStatus,
 * delete… — never inside a service or a controller.
 */
export const orderRepository = {
  /** Stores a new order and returns the created Order model. */
  async create(order) {
    const payload = order.toFirestore(serverTimestamp());
    const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), payload);
    return Order.fromFirestore(docRef.id, { ...payload, createdAt: null });
  },

  /** Newest orders first, capped at `limit` (admin panel). Requires an
   *  authenticated admin session + the matching rules on the `orders` path. */
  async listAll(options = {}) {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      orderBy("createdAt", "desc"),
      limit(options.limit || 100),
    );
    const snap = await getDocs(q);
    return snap.docs.map((entry) => Order.fromFirestore(entry.id, entry.data()));
  },

  /** Orders created within `[from, to]`, newest first (ranges on createdAt). */
  async listBetween(from, to, options = {}) {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where("createdAt", ">=", from),
      where("createdAt", "<=", to),
      orderBy("createdAt", "desc"),
      limit(options.limit || 1000),
    );
    const snap = await getDocs(q);
    return snap.docs.map((entry) => Order.fromFirestore(entry.id, entry.data()));
  },

  /** Advances an order's status (pending → confirmed → delivered …). */
  async updateStatus(id, status) {
    await updateDoc(doc(db, COLLECTIONS.ORDERS, id), { status });
  },
};

export default orderRepository;

/**
 * App settings (`settings/store`): the open/closed state of the restaurant.
 * Publicly readable, so the customer site can freeze ordering when closed.
 */
export const storeRepository = {
  ref() {
    return doc(db, COLLECTIONS.SETTINGS, "store");
  },

  /** Reads the current open/closed flag (defaults to open). */
  async getStatus() {
    const snap = await getDoc(this.ref());
    return Boolean(snap.exists() && snap.data().open !== false);
  },

  /** Persists the open/closed flag (admin). */
  async setStatus(open) {
    await setDoc(this.ref(), { open: Boolean(open) });
  },

  /**
   * Live store status. Calls `callback({ open, ready })` with `ready: false`
   * when the read fails (missing rules/network) — pages then default to open.
   * Returns an unsubscribe function.
   */
  onStatus(callback) {
    return onSnapshot(
      this.ref(),
      (snap) => {
        if (callback) {
          callback({ open: Boolean(snap.exists() && snap.data().open !== false), ready: true });
        }
      },
      (error) => {
        console.warn("[storeRepository] store status unavailable:", error && error.code);
        if (callback) callback({ open: true, ready: false });
      },
    );
  },
};
