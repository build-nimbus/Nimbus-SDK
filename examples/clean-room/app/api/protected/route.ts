import { NextResponse } from "next/server";
import { bearerFrom, requireTotymAccess, TotymUnavailableError } from "@totym/sdk/server";

/**
 * 7 — Server-side verification. The only thing on this list that protects anything.
 *
 * ── Why the payload is built after the check and not before ──────────────────
 *
 * A non-holder never receives it. Compare `/gate-a-page`, where the content was
 * already in the response and the browser was asked not to show it.
 *
 * ── The three-way answer, which is the whole contract ────────────────────────
 *
 *   a holder      → 200 with the payload
 *   null          → 403. The check completed and said no.
 *   throws        → 503. The check could not be completed. NOT a denial.
 *
 * That third case is the one to get right. If an outage returned 403, every real
 * holder would be locked out of their own community and the logs would show clean,
 * successful denials — nothing would look broken. `TotymUnavailableError` exists so
 * that the caller has to decide, and 503 with a Retry-After is the decision.
 *
 * Note what is NOT here: a wallet parameter. The address comes out of the token,
 * which the wallet signed for. A route that takes `?wallet=` is asking the caller
 * who they are.
 */
export async function GET(req: Request) {
  const apiUrl = process.env.TOTYM_API_URL ?? "https://www.totym.io";

  let holder;
  try {
    holder = await requireTotymAccess({
      apiUrl,
      token: bearerFrom(req.headers),
      query: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", minimum: 1 },
    });
  } catch (err) {
    if (err instanceof TotymUnavailableError) {
      return NextResponse.json(
        {
          error: "We could not check whether you qualify. This is not a refusal.",
          retryable: true,
        },
        { status: 503, headers: { "Retry-After": "5" } }
      );
    }
    throw err;
  }

  if (!holder) {
    return NextResponse.json(
      { error: "This wallet does not hold enough to see this." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    secret: "A non-holder never received these bytes.",
    wallet: holder.wallet,
    chain: holder.chain,
    balance: holder.balance,
  });
}
