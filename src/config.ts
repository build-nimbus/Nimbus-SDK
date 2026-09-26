/**
 * `@totym/sdk/config` — the parts with no client dependency.
 *
 * ── Why this entry point exists ─────────────────────────────────────────────
 *
 * `dist/index.js` carries a `"use client"` banner, which it must: every component
 * and hook in it needs one, and stamping the bundle is the only way to declare the
 * boundary from inside the package rather than asking each installer to do it.
 *
 * The cost was invisible until somebody built the documented pattern. `defineConfig`
 * is an identity function — `return config` — and it was only reachable from the
 * banner'd bundle, so calling it at module scope in a `totym.config.ts` and importing
 * that file from a root layout produced:
 *
 *   Attempted to call defineConfig() from the server but defineConfig is on the
 *   client. It's not possible to invoke a client function from the server.
 *
 * A root layout is a server component, and that pattern is the one the README and
 * `defineConfig`'s own doc comment both describe. So the config feature could not be
 * used, in the framework this package's documentation leads with, for the whole of
 * 0.2.0. Nothing caught it because the Totym application does not use `defineConfig`
 * — it reads gate configuration from a database — so the feature had no integration
 * at all. `VERSIONING.md` says `1.0.0` needs an integration outside Totym; this is
 * that condition demonstrating itself.
 *
 * ── What may live here ──────────────────────────────────────────────────────
 *
 * Only things with no client state and no React. `defineConfig` returns its
 * argument, `detectChain` inspects a string, `EVM_CHAIN_IDS` is a frozen record.
 * `clearCache` is NOT here and must not be: it mutates a module-level cache that
 * belongs to the client bundle, and a second copy of that cache reachable from the
 * server would be a bug that looks like a caching bug.
 *
 * `scripts/verify-surface.mjs` asserts this bundle has no `"use client"` banner. That
 * is the entire point of the file, and it would be silent if it regressed.
 */

export { defineConfig } from "./lib/config";
export { detectChain } from "./lib/chain-detect";
export { EVM_CHAIN_IDS } from "./types";
export type {
  TotymChain,
  WalletKind,
  TotymConfig,
  CommunityConfig,
  TierConfig,
  AccessQuery,
} from "./types";
