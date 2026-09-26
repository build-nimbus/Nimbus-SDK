/**
 * End to end, against the built app and a stub Totym API.
 *
 *   npm run build && npm run e2e
 *
 * WHY A STUB AND NOT THE REAL API
 *
 * The three answers this is here to prove — 200, 403 and 503 — cannot all be
 * produced against production. A 503 needs the API to be unreachable, and nobody is
 * going to take it down to satisfy a test. So the stub serves the same shapes the
 * real endpoint serves, and the run that matters is the one where it refuses to
 * answer at all.
 *
 * What is NOT stubbed is the thing under test: the packed `@totym/sdk` running
 * inside a real Next production build, in a real route handler, reading a real
 * `Authorization` header. The only fake is the far side of the network.
 *
 * ── The assertion that justifies the whole file ─────────────────────────────
 *
 * An outage must produce 503 and never 403. If it produced 403, every holder would
 * be locked out of their own community during an outage and the logs would show
 * clean, successful denials — the failure would be invisible. That is the bug the
 * application repository found in its own code, and this is the test that stops an
 * integration reproducing it.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";

const APP_PORT = 3199;
const API_PORT = 3198;

let passed = 0;
let failed = 0;
function check(condition, label, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}${detail ? `  (${detail})` : ""}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}${detail ? `  (${detail})` : ""}`);
  }
}
const section = (t) => console.log(`\n${t}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The stub. `mode` decides what the access endpoint does, so one server covers
 * "holds enough", "holds nothing" and "cannot answer".
 */
let mode = "holder";
const api = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${API_PORT}`);

  if (mode === "unavailable") {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "the stub is refusing to answer" }));
    return;
  }

  if (url.pathname === "/api/sdk/access") {
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "no token" }));
      return;
    }
    const hasAccess = mode === "holder";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        hasAccess,
        verified: true,
        balance: hasAccess ? 5 : 0,
        wallet: "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ",
        chain: "solana",
        isCreator: false,
      })
    );
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not a stubbed route" }));
});

api.listen(API_PORT);
await once(api, "listening");

const app = spawn("npx", ["next", "start", "-p", String(APP_PORT)], {
  env: { ...process.env, TOTYM_API_URL: `http://127.0.0.1:${API_PORT}` },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
app.stdout?.resume();
app.stderr?.resume();

function stop() {
  try {
    if (app.pid) process.kill(-app.pid, "SIGKILL");
  } catch {
    /* already gone */
  }
  api.close();
}

/** Wait for the app, bounded — a hung start should fail the run, not hang it. */
let up = false;
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}/`, { signal: AbortSignal.timeout(4000) });
    if (res.status === 200) {
      up = true;
      break;
    }
  } catch {
    /* not yet */
  }
  await wait(500);
}

if (!up) {
  check(false, "the built app starts", `nothing answered on ${APP_PORT} within 30s`);
  stop();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(1);
}

try {
  section("the app the packed SDK is installed into actually runs");
  check(true, "the built app starts and serves /", `port ${APP_PORT}`);

  const home = await fetch(`http://127.0.0.1:${APP_PORT}/`).then((r) => r.text());
  check(home.includes("Totym clean room"), "and renders the index");

  /**
   * The banner split, observed rather than inferred. `layout.tsx` is a SERVER
   * component that renders `TotymProvider`, a client component. If the published
   * bundle lost its `"use client"` banner this page would 500 with "useContext only
   * works in a Client Component" — so a 200 here IS the check.
   */
  section("the server/client boundary holds in a real RSC build");
  const gate = await fetch(`http://127.0.0.1:${APP_PORT}/gate-a-component`);
  check(gate.status === 200, "a server component can render a client gate",
    `HTTP ${gate.status} — a 500 here means the "use client" banner is missing from dist`);

  /**
   * What `block` withholds, versus what `fade` and `blur` withhold — and the third
   * thing, which the SDK's documentation did not distinguish and this test found.
   *
   * Measured on a real response, twice over: once as rendered markup (scripts
   * stripped, which is what a browser paints and what devtools shows) and once as the
   * whole response body (which is what `view-source` and `curl` show).
   *
   *   block      absent from the markup, PRESENT in the response body
   *   fade/blur  present in both
   *
   * The middle result is the finding. In a React Server Components app the server
   * serializes a client component's children into the flight payload before the
   * client component runs, so `<TotymGate style="block">` can refuse to MOUNT its
   * children and cannot un-send them. Its guarantee is about the DOM, and the DOM is
   * not the response.
   *
   * A developer who put real content behind `block`, checked devtools, and saw
   * nothing would be reassured by the wrong evidence. That is why this is asserted in
   * both directions rather than just the flattering one.
   *
   * Two earlier versions of this check were wrong: the first counted one shared word
   * and expected two, finding seven, because the word was also in the page's own
   * prose and because every rendered string appears in the payload as well. The
   * second used distinct sentinels but tested the whole body, so `block` failed — and
   * the failure was real information rather than a broken test.
   */
  section("what each gate style actually withholds");
  const styles = await fetch(`http://127.0.0.1:${APP_PORT}/styles`).then((r) => r.text());
  /** Scripts stripped: what a browser paints, as opposed to what it was sent. */
  const markup = styles.replace(/<script[\s\S]*?<\/script>/g, "");

  check(
    !markup.includes("sentinel-behind-block"),
    "block keeps its children out of the rendered markup",
    "nothing to see in devtools, which is the guarantee as written"
  );
  check(
    styles.includes("sentinel-behind-block"),
    "and its children ARE still in the response body",
    "RSC serializes a client component's children before the client runs — block can refuse to mount them, not un-send them. view-source finds them; devtools does not."
  );
  check(
    markup.includes("sentinel-behind-fade") && markup.includes("sentinel-behind-blur"),
    "fade and blur render their children and obscure them",
    "you cannot fade what was not rendered — documented, not a defect"
  );

  section("the server guard answers three ways, not two");

  mode = "holder";
  const denied = await fetch(`http://127.0.0.1:${APP_PORT}/api/protected`);
  const deniedBody = await denied.text();
  check(denied.status === 403, "no token → 403", `HTTP ${denied.status}`);
  check(!deniedBody.includes("never received these bytes"),
    "and the payload is not in the response",
    "a non-holder never receives it, which is the difference from a client-side gate");

  const allowed = await fetch(`http://127.0.0.1:${APP_PORT}/api/protected`, {
    headers: { authorization: "Bearer stub-token-for-the-clean-room-e2e" },
  });
  const allowedBody = await allowed.json();
  check(allowed.status === 200, "a token the stub accepts → 200", `HTTP ${allowed.status}`);
  check(allowedBody.secret !== undefined, "and the payload is there", allowedBody.wallet ?? "");

  mode = "denied";
  const refused = await fetch(`http://127.0.0.1:${APP_PORT}/api/protected`, {
    headers: { authorization: "Bearer stub-token-for-the-clean-room-e2e" },
  });
  check(refused.status === 403, "a token whose wallet holds nothing → 403", `HTTP ${refused.status}`);

  mode = "unavailable";
  const unavailable = await fetch(`http://127.0.0.1:${APP_PORT}/api/protected`, {
    headers: { authorization: "Bearer stub-token-for-the-clean-room-e2e" },
  });
  const unavailableBody = await unavailable.json().catch(() => ({}));
  check(
    unavailable.status === 503,
    "an API that cannot answer → 503, NOT 403",
    `HTTP ${unavailable.status} — a 403 here would lock every holder out during an outage and log it as a clean denial`
  );
  check(unavailable.headers.get("retry-after") !== null, "and it says when to come back",
    unavailable.headers.get("retry-after") ?? "no Retry-After");
  check(unavailableBody.retryable === true, "and says the failure is retryable");
} finally {
  stop();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
