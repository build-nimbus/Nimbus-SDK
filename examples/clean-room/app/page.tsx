import Link from "next/link";

/**
 * The index. A server component, listing every pattern as its own route so each
 * one can be read on its own and copied whole.
 */
const PATTERNS: [string, string, string][] = [
  ["/gate-a-component", "Gate a component", "The smallest thing the SDK does."],
  ["/gate-a-page", "Gate a page", "The same, around a whole route's content."],
  ["/styles", "Block, fade and blur", "What each one actually withholds, which is not the same."],
  ["/custom-denial", "Custom denial UI", "Replace the default wall with your own."],
  ["/states", "Loading and error states", "The two a gate spends most of its life in."],
  ["/connect", "Wallet connection and proof", "Connect, then prove control with a signature."],
  ["/server", "Server-side verification", "The only one of these that protects anything."],
];

export default function Home() {
  return (
    <main style={{ maxWidth: "42rem" }}>
      <h1>Totym clean room</h1>
      <p>
        This app installs <code>@totym/sdk</code> from the registry, the way somebody
        outside Totym would. There is no workspace, no path alias and no
        <code> transpilePackages</code> — <code>next.config.ts</code> is empty on purpose,
        because an empty config is the claim being tested.
      </p>
      <p>
        It builds and typechecks with no Totym account and no API key. The gates below
        will report <strong>locked</strong> without a connected wallet, which is the
        correct answer rather than a broken one.
      </p>
      <ul>
        {PATTERNS.map(([href, title, note]) => (
          <li key={href} style={{ marginBottom: "0.75rem" }}>
            <Link href={href}>
              <strong>{title}</strong>
            </Link>
            <br />
            <span style={{ color: "#555" }}>{note}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
