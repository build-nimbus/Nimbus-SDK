import { TotymReveal } from "@totym/sdk";

/**
 * 3 — Block, fade and blur.
 *
 * The difference between them is not cosmetic, and the SDK's own documentation leads
 * with it: `block` keeps children OUT OF THE DOM for a non-holder. `fade` and `blur`
 * render them and obscure them visually — you cannot fade what is not there. So all
 * three hide content from a reader, and only one of them hides it from `view-source`.
 *
 * ── Why three different sentinels ────────────────────────────────────────────
 *
 * Each gate holds a string that appears nowhere else, so the claim can be checked by
 * searching rather than by counting. The first version of `scripts/e2e.mjs` counted
 * occurrences of one shared word and expected two; it found seven, because the word
 * was also in the explanatory paragraph below and because a Next RSC response carries
 * the serialized payload alongside the rendered markup — every rendered string is in
 * the response more than once. Counting was the wrong instrument. Presence and
 * absence is the right one.
 */
const BLOCK_SENTINEL = "sentinel-behind-block";
const FADE_SENTINEL = "sentinel-behind-fade";
const BLUR_SENTINEL = "sentinel-behind-blur";

export default function Styles() {
  return (
    <main style={{ maxWidth: "42rem" }}>
      <h1>Block, fade and blur</h1>

      <h2>block — not in the DOM</h2>
      <TotymReveal tier="holder" style="block">
        <p>This paragraph contains {BLOCK_SENTINEL} and a non-holder cannot find it.</p>
      </TotymReveal>

      <h2>fade — in the DOM, dissolved</h2>
      <TotymReveal tier="holder" style="fade" fadeAt="50%">
        <p>This paragraph contains {FADE_SENTINEL} and a non-holder can find it.</p>
      </TotymReveal>

      <h2>blur — in the DOM, unreadable</h2>
      <TotymReveal tier="holder" style="blur">
        <p>This paragraph contains {BLUR_SENTINEL} and a non-holder can find it.</p>
      </TotymReveal>

      <p style={{ marginTop: "2rem", padding: "1rem", background: "#fee", borderRadius: 8 }}>
        <strong>Check this yourself.</strong> With no wallet connected, view the page
        source and search for each sentinel. Two of the three are there. The one behind{" "}
        <code>block</code> is not, because <code>block</code> never rendered it —
        which is the only one of these three that is a boundary rather than a
        presentation.
      </p>
    </main>
  );
}
