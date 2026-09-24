/**
 * The wallet-proof flow, end to end, against a running Totym API.
 *
 *   npm run build
 *   node scripts/verify-wallet-proof.mjs [apiUrl]
 *
 * WHY THIS RUNS AGAINST THE BUILD
 *
 * It imports `../dist`, not `../src`. The thing being checked is not only that
 * the logic is right but that the PACKAGE is: that `@totym/sdk/server` exists
 * as its own entry, and that the bundler did not stamp `"use client"` on the
 * one module that must never carry it.
 *
 * WHAT IT ASSERTS THAT A UNIT TEST CANNOT
 *
 * That `proveWallet` and `requireTotymAccess` agree with the API they talk to.
 * A mocked test agrees with whatever the mock was written to believe, and the
 * bug this package shipped with was exactly a disagreement between the SDK's
 * idea of the API and the API.
 *
 * The keypair is generated here and holds nothing, which makes it the honest
 * subject for both directions: refused by a gate that wants a balance,
 * admitted by one that does not. No funded wallet required.
 */

import crypto from "node:crypto";
import { proveWallet } from "../dist/index.js";
import { requireTotymAccess, bearerFrom } from "../dist/server.js";

const API = process.argv[2] ?? "http://localhost:3000";
const MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
/** Self-contained base58, so this script needs no package resolution. */
const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const b58 = (bytes) => {
  let n = 0n;
  for (const byte of bytes) n = n * 256n + BigInt(byte);
  let out = "";
  while (n > 0n) { out = ALPHA[Number(n % 58n)] + out; n /= 58n; }
  for (const byte of bytes) { if (byte === 0) out = "1" + out; else break; }
  return out;
};

let pass = 0, fail = 0;
const check = (label, ok, detail = "") => {
  (ok ? pass++ : fail++);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  (${detail})` : ""}`);
};

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const address = b58(new Uint8Array(publicKey.export({ format: "der", type: "spki" }).subarray(-32)));
const signMessage = async (m) => b58(new Uint8Array(crypto.sign(null, Buffer.from(m, "utf8"), privateKey)));

console.log("\nproveWallet() — the client half");
const session = await proveWallet({ apiUrl: API, wallet: address, chain: "solana", signMessage });
check("a session is returned", typeof session.token === "string" && session.token.length > 0);
check("bound to the wallet that signed", session.wallet === address);
check("carries an expiry", session.expiresIn > 0, `${session.expiresIn}s`);

console.log("\nrequireTotymAccess() — the server half");

// A freshly generated keypair holds nothing, so it is the honest subject for
// BOTH directions: refused by a gate that wants a balance, admitted by one
// that does not. No funded wallet required to exercise either.
const gated = { mint: MINT, minimum: 1 };
const open = { mint: MINT, minimum: 0 };

const anon = await requireTotymAccess({ apiUrl: API, token: null, query: gated });
check("no token -> null, not a throw", anon === null);

const forged = await requireTotymAccess({ apiUrl: API, token: session.token.slice(0, -1) + "X", query: gated });
check("a tampered token -> null", forged === null);

const denied = await requireTotymAccess({ apiUrl: API, token: session.token, query: gated });
check("proved but holding nothing -> null", denied === null, "a correct denial, not a failure");

const holder = await requireTotymAccess({ apiUrl: API, token: session.token, query: open });
check("proved and meeting the gate -> a holder", holder !== null, holder ? `balance ${holder.balance}` : "null");
check("the holder is the wallet that signed", holder?.wallet === address);
check("and it came back marked verified", holder?.chain === "solana");

console.log("\nIt reads the token from request headers too");
const headers = new Headers({ authorization: `Bearer ${session.token}` });
check("bearerFrom extracts it", bearerFrom(headers) === session.token);
const viaHeaders = await requireTotymAccess({ apiUrl: API, token: headers, query: open });
check("passing Headers works the same", viaHeaders?.wallet === address);

console.log("\nAn unavailable check THROWS rather than denying");
let threw = null;
try {
  await requireTotymAccess({ apiUrl: "http://127.0.0.1:59999", token: session.token, query: open });
} catch (e) { threw = e; }
check("a dead API raises instead of returning null", threw !== null, threw?.constructor?.name ?? "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
