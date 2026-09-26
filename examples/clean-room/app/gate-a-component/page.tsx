import { TotymReveal } from "@totym/sdk";

/**
 * 1 — Gate a component.
 *
 * A server component rendering a client gate. Nothing here is marked
 * `"use client"`; the SDK's bundle declares that for itself.
 */
export default function GateAComponent() {
  return (
    <main style={{ maxWidth: "42rem" }}>
      <h1>Gate a component</h1>
      <p>Everything outside the gate renders for everybody.</p>

      <TotymReveal tier="holder">
        <p style={{ padding: "1rem", background: "#eef", borderRadius: 8 }}>
          Members only. If you can read this, the connected wallet holds at least one
          USDC on Solana.
        </p>
      </TotymReveal>

      <p>And everything after it renders for everybody too.</p>
    </main>
  );
}
