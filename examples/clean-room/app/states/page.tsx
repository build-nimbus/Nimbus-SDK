"use client";

import { useTotymAccess } from "@totym/sdk";

/**
 * 5 — Loading and error states.
 *
 * `<TotymReveal>` folds all four states into two outcomes, which is right for a
 * component and wrong for a page that wants to explain itself. The hook exposes
 * them, and the distinction below is the one that matters:
 *
 *   isLoading            nobody has asked yet
 *   error                the check could not be COMPLETED
 *   !hasAccess           the check completed and said no
 *   hasAccess            the check completed and said yes
 *
 * The middle two are not the same thing, and telling a holder "you do not hold
 * this" when the truth is "the provider timed out" is the bug this product fixed
 * in its own code. `error` is not a denial. Say so.
 *
 * This page is `"use client"` because it calls a hook. Nothing else here needs to
 * be.
 */
export default function States() {
  const { hasAccess, isLoading, error, balance, tier, isCreator } = useTotymAccess({
    tier: "holder",
  });

  if (isLoading) {
    return (
      <main style={{ maxWidth: "42rem" }}>
        <h1>Checking</h1>
        <p aria-live="polite">Reading the chain. This usually takes under a second.</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: "42rem" }}>
        <h1>We could not check</h1>
        <p role="alert">
          This is not a refusal — nobody found out whether you qualify. Trying again
          usually works.
        </p>
        <p style={{ color: "#555" }}>
          <code>{error}</code>
        </p>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main style={{ maxWidth: "42rem" }}>
        <h1>Not this time</h1>
        <p>
          The check completed and the wallet does not qualify. Tier: <code>{tier}</code>.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "42rem" }}>
      <h1>In</h1>
      <p>
        Tier <code>{tier}</code>
        {isCreator ? " — as the community's creator, so no balance was read." : `, balance ${balance}.`}
      </p>
    </main>
  );
}
