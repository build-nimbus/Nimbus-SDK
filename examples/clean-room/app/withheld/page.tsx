import { cookies } from "next/headers";
import { TotymServerGate, TOTYM_SESSION_COOKIE } from "@totym/sdk/rsc";

/**
 * 8 — A gate that withholds bytes, and a fade that is honest about its teaser.
 *
 * ── The difference from every other pattern here ─────────────────────────────
 *
 * The six client patterns decide in the browser. That means the content was already in
 * the response before the decision happened — `<TotymGate style="block">` keeps it out
 * of the DOM and cannot keep it out of `view-source`.
 *
 * This decides on the server. The protected branch is never rendered, so it is never
 * serialized, so it is not in the response at all. Absent, not hidden.
 *
 * ── What it costs ───────────────────────────────────────────────────────────
 *
 * The server has to see the proof token, and `proveWallet()` hands that token to
 * JavaScript. So the browser posts it to `/api/session` once, which sets an httpOnly
 * cookie, and from then on the server can answer before it decides what to render.
 *
 * With no cookie, everything below the first heading is missing from the response
 * rather than styled out of view.
 */
export const dynamic = "force-dynamic";

const API_URL = process.env.TOTYM_API_URL ?? "https://www.totym.io";
const QUERY = { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", minimum: 1 };

/** Public by construction. A non-holder is meant to read this. */
const TEASER =
  "This opening paragraph is public. It is sent to everybody, which is the only honest way to have a teaser: the bytes a non-holder can read are bytes you decided to give them.";

/** Never sent to a non-holder. */
const REMAINDER =
  "And this paragraph contains sentinel-withheld-remainder. A visitor who does not qualify never received it — not hidden, not blurred, not in the response.";

function Faded({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
      }}
    >
      {children}
    </div>
  );
}

export default async function Withheld() {
  const token = (await cookies()).get(TOTYM_SESSION_COOKIE)?.value ?? null;

  return (
    <main style={{ maxWidth: "42rem" }}>
      <h1>Withheld, not hidden</h1>

      <h2>The strong block</h2>
      <TotymServerGate
        apiUrl={API_URL}
        token={token}
        query={QUERY}
        fallback={<p>Locked. Hold 1 USDC on Solana — and notice there is nothing to reveal in the page source.</p>}
        unavailable={
          <p role="alert">
            We could not check whether you qualify. That is not a refusal, and trying
            again usually works.
          </p>
        }
      >
        <p>This paragraph contains sentinel-withheld-block and was never sent to anybody else.</p>
      </TotymServerGate>

      <h2>An honest fade</h2>
      <p>
        Fade and blur have to render what they obscure — you cannot fade what is not
        there. So the visible part can never be protected, and pretending otherwise is
        the whole trap. The way to have both is to decide, on the server, WHICH TEXT to
        send:
      </p>
      <TotymServerGate
        apiUrl={API_URL}
        token={token}
        query={QUERY}
        fallback={
          <>
            <Faded>
              <p>{TEASER}</p>
            </Faded>
            <p style={{ color: "#555" }}>
              The rest is not below this — it was never sent.
            </p>
          </>
        }
        unavailable={<p role="alert">We could not check. Not a refusal.</p>}
      >
        <p>{TEASER}</p>
        <p>{REMAINDER}</p>
      </TotymServerGate>

      {/* The instructions deliberately do NOT contain the sentinels.
          An earlier version of this paragraph named them, so the strings were in the
          page for everybody whatever the gate decided, and the end-to-end test failed
          on its own instructions. That is the second time in this example a check has
          been defeated by the prose explaining it. */}
      <p style={{ marginTop: "2rem", padding: "1rem", background: "#efe", borderRadius: 8 }}>
        <strong>Check this yourself.</strong> With no cookie, view the page source and
        search for the word <code>sentinel</code>. There are none. Then post a token to{" "}
        <code>/api/session</code> and reload: two appear. Compare with <code>/styles</code>,
        where the text behind <code>fade</code> and <code>blur</code> is in the source
        and the text behind <code>block</code> is in the flight payload — hidden in both
        cases, and sent in both cases.
      </p>
    </main>
  );
}
