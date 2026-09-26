import { NextResponse } from "next/server";
import { sessionCookie } from "@totym/sdk/rsc";

/**
 * The missing link between a browser wallet and a server decision.
 *
 * `proveWallet()` hands a token to JavaScript. A server component cannot read
 * JavaScript's variables, so while the token lives only in the browser, every gate
 * decision has to happen in the browser — which is why client gates ship the content
 * they are hiding.
 *
 * The browser posts the token here once. `sessionCookie()` returns it as an httpOnly
 * cookie, so from then on the server can answer "does this visitor hold it" BEFORE it
 * decides what to render. `httpOnly` is the point: a proof token readable by JavaScript
 * is a token any script on the page can take, and nothing would look wrong.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { token?: string; expiresIn?: number };
  if (!body.token) return NextResponse.json({ error: "no token" }, { status: 400 });

  const { name, value, options } = sessionCookie({
    token: body.token,
    expiresIn: body.expiresIn ?? 600,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}
