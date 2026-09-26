/**
 * What a developer may rely on, and how much.
 *
 * ── Why a module and not a table in the README ──────────────────────────────
 *
 * Because a table in a README cannot be checked. `scripts/verify-surface.mjs` reads
 * the BUILT artifact — `dist/index.js` and `dist/server.js` — and fails when this
 * list and the package disagree in either direction:
 *
 *   · an export the package has and this list does not → an export nobody decided
 *     was public, which is how an accidental export becomes an API somebody depends
 *     on
 *   · an export this list has and the package does not → a promise about something
 *     that is not there
 *
 * The second direction is the one a README always gets wrong, and the first is worse.
 * The application repository found three exports of this package that no
 * documentation mentioned, two of them the error classes a developer needs in order
 * to handle failure at all. Nothing in this repository would have caught that.
 *
 * ── This file is not shipped ────────────────────────────────────────────────
 *
 * It is not exported from `index.ts` and `package.json`'s `files` field publishes only
 * `dist`, so it costs a reader nothing at install time. It exists for the build and
 * for `VERSIONING.md` to point at.
 *
 * ── Runtime values only ─────────────────────────────────────────────────────
 *
 * Types are erased, so no check could enumerate them from `dist`, and listing them
 * here would be a second copy nothing can verify. A developer who misuses a type gets
 * a type error rather than a surprise; the seventeen values below are what can
 * actually be called at runtime and are what a breaking change breaks.
 */

export type Entry = "root" | "server" | "config" | "rsc";

/**
 * `stable` — a breaking change to it ships as a minor WITH a migration note.
 * `experimental` — may change in a minor with only a changelog line.
 *
 * See VERSIONING.md. There is no third level: "beta" and "preview" in a package with
 * one known integration mean the same thing as experimental and sound safer.
 */
export type Stability = "stable" | "experimental";

export interface PublicExport {
  name: string;
  entry: Entry;
  stability: Stability;
  /** Why it is experimental. Required when it is, and empty otherwise. */
  why?: string;
}

export const PUBLIC_EXPORTS: readonly PublicExport[] = [
  // The two entries that actually withhold something.
  { name: "proveWallet", entry: "root", stability: "stable" },
  { name: "requireTotymAccess", entry: "server", stability: "stable" },
  { name: "bearerFrom", entry: "server", stability: "stable" },

  // Failure. A developer cannot handle it without these.
  { name: "TotymProofError", entry: "root", stability: "stable" },
  { name: "TotymUnavailableError", entry: "server", stability: "stable" },

  // Rendering.
  { name: "TotymProvider", entry: "root", stability: "stable" },
  { name: "TotymReveal", entry: "root", stability: "stable" },
  /**
   * The old name, kept working. It was renamed because `TotymGate` reads as a boundary
   * and this component is not one — it decides what to SHOW, and the content it hides
   * has already been sent. Step one of the three in VERSIONING.md: announce in the
   * types, keep it working.
   */
  { name: "TotymGate", entry: "root", stability: "experimental", why: "A deprecated alias for TotymReveal. It will be removed, on the schedule in VERSIONING.md — announce, warn, remove, never fewer than three releases and never in a patch." },
  { name: "TotymTier", entry: "root", stability: "stable" },
  { name: "TotymWall", entry: "root", stability: "stable" },
  { name: "TotymButton", entry: "root", stability: "stable" },

  // Reading state.
  { name: "useTotymAccess", entry: "root", stability: "stable" },
  { name: "useTotymTier", entry: "root", stability: "stable" },
  { name: "useTotymWallet", entry: "root", stability: "stable" },

  // Helpers. The pure three are exported from BOTH the root entry (for client code
  // that already imports from there) and `@totym/sdk/config` (for anything at module
  // scope or on a server). Listed once per entry, because the check enumerates each
  // bundle separately and a name is public in each place it appears.
  { name: "defineConfig", entry: "root", stability: "stable" },
  { name: "detectChain", entry: "root", stability: "stable" },
  { name: "clearCache", entry: "root", stability: "stable" },

  /**
   * `@totym/sdk/config` — no `"use client"` banner, which is the whole reason it
   * exists. `defineConfig` was reachable only from the banner'd bundle, so the
   * documented `totym.config.ts` pattern could not build in a Next App Router app
   * for all of 0.2.0.
   *
   * `clearCache` is deliberately absent: it mutates a module-level cache belonging
   * to the client bundle, and a second copy reachable from the server would be a bug
   * that looks like a caching bug.
   */
  /**
   * `@totym/sdk/rsc` — the only gate in this package that withholds BYTES.
   *
   * Every other gate decides what to show in a browser, which means the content was
   * already sent. This one decides on the server before rendering, so a visitor who
   * does not qualify never receives the protected branch at all. Measured before it
   * shipped, for a server child and a client child.
   *
   * Experimental, honestly: it is new, it constrains the integration (the proof token
   * has to reach the server, which means a cookie), and the shape of that constraint is
   * the part most likely to change once somebody outside Totym has lived with it.
   */
  { name: "TotymServerGate", entry: "rsc", stability: "experimental", why: "New, and it constrains the integration — the proof token must reach the server, which in practice means an httpOnly cookie. That constraint's shape is what an outside integration is most likely to change." },
  { name: "TOTYM_SESSION_COOKIE", entry: "rsc", stability: "experimental", why: "A naming convention rather than a mechanism; it moves if the session shape does." },
  { name: "sessionCookie", entry: "rsc", stability: "experimental", why: "Same reason as TotymServerGate: it encodes a cookie policy that has had one integration." },

  { name: "defineConfig", entry: "config", stability: "stable" },
  { name: "detectChain", entry: "config", stability: "stable" },
  { name: "EVM_CHAIN_IDS", entry: "config", stability: "experimental", why: "Same reason as the root copy: the chain set is the least settled thing here." },

  {
    name: "EVM_CHAIN_IDS",
    entry: "root",
    stability: "experimental",
    why:
      "The set of chains it describes is the least settled thing in this package. It currently names polygon, which the API refuses, and cannot name Robinhood Chain, which the API serves — a list that is wrong in both directions is not something to promise stability about.",
  },
];

/**
 * Exports that must live only at `@totym/sdk/server`.
 *
 * Not tidiness. Importing the server guard into a client component is supposed to be
 * a BUILD ERROR rather than a silent leak of whatever it was configured with, and
 * that guarantee rests entirely on these three being absent from the root entry —
 * which nothing about the package would look different if they were not.
 */
export const SERVER_ONLY: readonly string[] = PUBLIC_EXPORTS.filter(
  (e) => e.entry === "server"
).map((e) => e.name);
