import { TotymReveal } from "@totym/sdk";

/**
 * 2 — Gate a page.
 *
 * Structurally identical to gating a component, which is the point: there is no
 * separate page-level API to learn.
 *
 * ── The part that matters, and it is not the gate ────────────────────────────
 *
 * This hides a page's content in the BROWSER. Every byte inside the gate was sent
 * to the visitor's machine, so anybody can read it with developer tools. It is the
 * right tool for a paywall teaser and the wrong tool for anything secret.
 *
 * For that, see `/server` — the content is fetched from a route that re-verifies,
 * so a non-holder never receives it.
 */
export default function GateAPage() {
  return (
    <TotymReveal tier="holder" message="Hold 1 USDC on Solana to read this page.">
      <main style={{ maxWidth: "42rem" }}>
        <h1>A gated page</h1>
        <p>
          This whole route sits behind one gate. Convenient, and not a protection —
          see the note in this file.
        </p>
      </main>
    </TotymReveal>
  );
}
