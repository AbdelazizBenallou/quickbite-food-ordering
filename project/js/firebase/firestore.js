/**
 * Firestore client.
 *
 * Creating the client is local and lazy: no request is sent until a
 * repository method (js/repositories/index.js) is actually called.
 */
import { getFirestore } from "../vendor/firebase/firebase-firestore.js";
import { app } from "./firebase.js";

export const db = getFirestore(app);
