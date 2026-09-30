/**
 * One-off Admin SDK script: grant the `admin` custom claim.
 * Run ONCE, then delete this file.
 *
 *   node tools/grant-admin.mjs <SERVICE-ACCOUNT-KEY.json> <ACCOUNT-EMAIL-OR-UID>
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const keyPath = process.argv[2];
const target = process.argv[3];
if (!keyPath || !target) {
  console.error("usage: node tools/grant-admin.mjs <SERVICE-ACCOUNT-KEY.json> <ACCOUNT-EMAIL-OR-UID>");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
if (!serviceAccount.project_id) {
  console.error("That file is not a Firebase service-account key.");
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);

const record = target.includes("@")
  ? await auth.getUserByEmail(target)
  : await auth.getUser(target);

await auth.setCustomUserClaims(record.uid, { admin: true });

const check = await auth.getUser(record.uid);
console.log(JSON.stringify({ uid: check.uid, email: check.email, customClaims: check.customClaims }, null, 2));
process.exit(0);