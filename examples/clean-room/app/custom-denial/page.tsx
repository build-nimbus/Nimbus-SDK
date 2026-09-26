import { TotymReveal } from "@totym/sdk";

/**
 * 4 — Custom denial UI.
 *
 * `fallback` replaces the default wall entirely. Worth saying what a good one
 * does: it tells somebody what would get them in, rather than only that they are
 * out. "You need 1 USDC on Solana" is actionable; "Access denied" is not.
 */
function NotYet() {
  return (
    <div style={{ padding: "1.25rem", border: "1px solid #ccc", borderRadius: 8 }}>
      <strong>You need 1 USDC on Solana to see this.</strong>
      <p style={{ margin: "0.5rem 0 0", color: "#555" }}>
        Connect a wallet that holds some, and this section fills in. Nothing here
        charges you anything.
      </p>
    </div>
  );
}

export default function CustomDenial() {
  return (
    <main style={{ maxWidth: "42rem" }}>
      <h1>Custom denial UI</h1>
      <TotymReveal tier="holder" fallback={<NotYet />}>
        <p>Unlocked.</p>
      </TotymReveal>
    </main>
  );
}
