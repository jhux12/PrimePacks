// Run only from a trusted operator machine using Application Default Credentials.
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const [projectId, uid, action] = process.argv.slice(2);
if (!projectId || !uid || !["grant", "revoke"].includes(action))
  throw Error(
    "Usage: node scripts/admin-role.mjs PROJECT_ID USER_UID grant|revoke",
  );
initializeApp({ projectId });
const user = await getAuth().getUser(uid);
if (action === "grant" && !user.emailVerified)
  throw Error("Administrator email must be verified");
await getAuth().setCustomUserClaims(uid, {
  ...user.customClaims,
  admin: action === "grant",
});
await getAuth().revokeRefreshTokens(uid);
console.log(
  `Admin role ${action === "grant" ? "granted" : "revoked"} for UID ${uid}. Sign out and sign in again.`,
);
