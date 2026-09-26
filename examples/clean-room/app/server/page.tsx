import Link from "next/link";

/**
 * The page that talks about `/api/protected`, rather than a page that is itself
 * gated. The protection is in the route handler; this is just how to find it.
 */
export default function ServerSide() {
  return (
    <main style={{ maxWidth: "42rem" }}>
      <h1>Server-side verification</h1>
      <p>
        The code is in <code>app/api/protected/route.ts</code> — about thirty lines, most
        of them explaining why the three answers are three and not two.
      </p>
      <p>Try it without a token:</p>
      <pre style={{ background: "#f4f4f4", padding: "1rem", borderRadius: 8, overflowX: "auto" }}>
        {`curl -i http://localhost:3000/api/protected`}
      </pre>
      <p>
        You should get <code>403</code> and no payload. With a token from{" "}
        <Link href="/connect">proveWallet</Link>:
      </p>
      <pre style={{ background: "#f4f4f4", padding: "1rem", borderRadius: 8, overflowX: "auto" }}>
        {`curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/protected`}
      </pre>
      <p>
        If the Totym API cannot be reached you get <code>503</code>, not <code>403</code>.
        A refusal and an outage are different sentences, and only one of them is about
        you.
      </p>
    </main>
  );
}
