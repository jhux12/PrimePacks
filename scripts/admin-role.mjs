// Run only from a trusted operator machine using Application Default Credentials.
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const [projectId, identity, action] = process.argv.slice(2);
if (!projectId || !identity || !["grant", "revoke"].includes(action))
  throw Error(
    "Usage: node scripts/admin-role.mjs PROJECT_ID USER_UID_OR_EMAIL grant|revoke",
  );
initializeApp({ projectId });
const user = identity.includes("@")
  ? await getAuth().getUserByEmail(identity)
  : await getAuth().getUser(identity);
const uid = user.uid;
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
