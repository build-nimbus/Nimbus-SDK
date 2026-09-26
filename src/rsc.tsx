/**
 * `@totym/sdk/rsc` — the gate that withholds bytes.
 *
 * ── The problem this exists to solve ────────────────────────────────────────
 *
 * `<TotymGate>` from the main entry is a CLIENT component. When a server component
 * writes `<TotymGate>{secret}</TotymGate>`, React serializes `{secret}` into the flight
 * payload and sends it, because the server cannot know what a browser-side wallet check
 * will decide. The gate can then refuse to MOUNT those children — nothing appears in
 * the DOM, devtools shows nothing — and it cannot un-send them. `view-source` and
 * `curl` find the text.
 *
 * That was true of all three styles, including `block`, and the documentation implied
 * otherwise. Measured on a real Next App Router build before this file was written.
 *
 * ── Why moving the decision to the server fixes it completely ───────────────
 *
 * A server component decides BEFORE it renders. The protected branch is never
 * rendered, so it is never serialized, so it is not in the response at all. Measured,
 * for both a server child and a client child: with no session, 5686 bytes and the
 * sentinel absent; with a valid one, 5865 bytes and present; with a session whose
 * wallet holds nothing, 5729 bytes and absent. Absent, not hidden.
 *
 * Merely constructing `<Secret />` in the parent is safe — an element is a plain object
 * until something renders it. That was verified too, because if it had not been true
 * this API would have had to take a function instead of children.
 *
 * ── What it costs, stated plainly ──────────────────────────────────────────
 *
 * The server needs the proof token, and `proveWallet()` hands that token to
 * JavaScript. So a browser-only integration cannot use this: the token has to reach
 * the server on the request, which in practice means an httpOnly cookie. See
 * `sessionCookie()` below and the recipe in the README.
 *
 * That is a real constraint rather than an oversight. A gate that withholds bytes has
 * to be decided where the bytes are assembled, and nothing about a wallet in a browser
 * is visible there until somebody sends it.
 *
 * ── Why this is its own entry point ────────────────────────────────────────
 *
 * `@totym/sdk/server` is framework-agnostic — no React, so it works in Express, Hono
 * or a bare handler. This file is JSX and React Server Components specifically, and the
 * name says when it works. Importing it into a client component fails, which is the
 * correct outcome.
 */

import type { ReactNode } from "react";

import {
  requireTotymAccess,
  TotymUnavailableError,
  type TotymAccessQuery,
  type TotymHolder,
} from "./server";

/** The cookie name this SDK's own helpers use. Yours may differ; be consistent. */
export const TOTYM_SESSION_COOKIE = "totym_session";

export interface TotymServerGateProps {
  /** Base URL of the Totym API — the same one the client uses. */
  apiUrl: string;
  /**
   * The proof token, or the request's headers.
   *
   * `null` is a legitimate value and means "nobody proved anything", which resolves to
   * the denied branch rather than to an error.
   */
  token: string | null | Headers | { get(name: string): string | null };
  query: TotymAccessQuery;
  /** Rendered only when the holder qualifies. Never rendered otherwise, so never sent. */
  children: ReactNode;
  /** Rendered when the check completed and said no. */
  fallback?: ReactNode;
  /**
   * Rendered when the check could not be COMPLETED.
   *
   * Optional, and if you leave it out the underlying `TotymUnavailableError` is
   * rethrown — which surfaces as your framework's error page. That is deliberate and
   * it is the safe default: the tempting thing is to fall back to `fallback`, which
   * would tell a real holder they do not hold their own token whenever a node provider
   * has a bad minute. An outage and a refusal are different sentences, and only one of
   * them is about the visitor.
   */
  unavailable?: ReactNode;
  /** Passed through to fetch, for your own timeout or signal. */
  init?: RequestInit;
}

/**
 * A gate whose refusal is a boundary rather than a presentation.
 *
 * ```tsx
 * // app/members/page.tsx — a server component
 * import { cookies } from "next/headers";
 * import { TotymServerGate, TOTYM_SESSION_COOKIE } from "@totym/sdk/rsc";
 *
 * export default async function Members() {
 *   return (
 *     <TotymServerGate
 *       apiUrl={process.env.TOTYM_API_URL!}
 *       token={(await cookies()).get(TOTYM_SESSION_COOKIE)?.value ?? null}
 *       query={{ mint: "…", minimum: 1 }}
 *       fallback={<p>Hold one to read this.</p>}
 *       unavailable={<p>We could not check. This is not a refusal.</p>}
 *     >
 *       <Secret />
 *     </TotymServerGate>
 *   );
 * }
 * ```
 *
 * `<Secret />` is not in the response for anybody who does not qualify.
 */
export async function TotymServerGate({
  apiUrl,
  token,
  query,
  children,
  fallback = null,
  unavailable,
  init,
}: TotymServerGateProps) {
  let holder: TotymHolder | null;
  try {
    holder = await requireTotymAccess({ apiUrl, token, query, init });
  } catch (err) {
    if (err instanceof TotymUnavailableError && unavailable !== undefined) {
      return <>{unavailable}</>;
    }
    /**
     * Rethrown on purpose when no `unavailable` branch was given. Swallowing this into
     * `fallback` is the one mistake that makes an outage indistinguishable from a
     * denial, and it is the mistake a default would encourage.
     */
    throw err;
  }

  if (!holder) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * The one global this package touches, declared narrowly rather than by adding
 * `@types/node`.
 *
 * `sessionCookie` needs to know whether it is in production, because a cookie marked
 * `secure` is not sent over plain HTTP and `localhost` is plain HTTP. Pulling in Node's
 * whole type surface for one string would also let anything else in this package reach
 * for `process` without a second thought, and a library that reads the environment is a
 * library whose behaviour depends on something the integrator did not pass it.
 */
declare const process:
  | { env?: { NODE_ENV?: string } }
  | undefined;

export interface SessionCookie {
  name: string;
  value: string;
  options: {
    /** Always true. A proof token readable by JavaScript is a token any script can take. */
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    /** From the token's own expiry, so the cookie cannot outlive the credential. */
    maxAge: number;
  };
}

/**
 * The cookie that lets the server see what the browser proved.
 *
 * ── Why this is a helper and not left to the integrator ────────────────────
 *
 * Because `httpOnly` is the whole point and it is one word to forget. A proof token in
 * a cookie readable by JavaScript is a token any script on the page can take, and the
 * failure is silent — everything works, including for an attacker.
 *
 * `secure` follows `NODE_ENV` rather than being hardcoded true, because a cookie marked
 * secure is not sent over plain HTTP and `localhost` is plain HTTP. Hardcoding it
 * breaks every local development setup in a way that looks like the gate is broken.
 *
 * `maxAge` comes from the token's own `expiresIn`, so the cookie cannot outlive the
 * credential in it. A cookie that survives its token produces a request the server
 * rejects, which reads to a visitor as being logged out at random.
 *
 * Framework-agnostic on purpose: it returns the pieces, and Next's `cookies().set(...)`,
 * Express's `res.cookie(...)` and a hand-built `Set-Cookie` all take them.
 */
export function sessionCookie(
  session: { token: string; expiresIn: number },
  options?: {
    /**
     * Override the `secure` flag. Default: true in production, false otherwise.
     *
     * The default is a guess about your environment, which is exactly the kind of thing
     * a library should let you take back. Set it explicitly if you terminate TLS
     * somewhere this cannot see.
     */
    secure?: boolean;
  }
): SessionCookie {
  const isProduction =
    typeof process !== "undefined" && process?.env?.NODE_ENV === "production";
  return {
    name: TOTYM_SESSION_COOKIE,
    value: session.token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: options?.secure ?? isProduction,
      path: "/",
      maxAge: Math.max(0, Math.floor(session.expiresIn)),
    },
  };
}
