/**
 * The access layer answers correctly for the cases that are easy to get wrong.
 *
 *   npm test
 *
 * WHY THIS FILE EXISTS
 *
 * The SDK had no tests, and two defects lived in it for exactly that reason.
 * Both were found by reading the SDK against the API it actually calls rather
 * than against its own README.
 *
 *   1. A creator came back as `tier: "none"` while `hasAccess` was true. The
 *      creator bypass grants access without reading the chain, so no balance
 *      comes back; the SDK read the empty field as 0, and 0 clears no
 *      threshold. Any UI that branches on the tier — which is what tiers are
 *      for — hid a community from the person who owns it.
 *
 *   2. `gate_type` was hardcoded to "erc20" in the EVM URL builder, so
 *      `gateType: "nft"` was silently Solana-only. The endpoint has served
 *      `erc721` all along. Worse than a plain failure: ERC-721 also exposes
 *      `balanceOf(address)`, so the wrong ABI did not revert — it returned a
 *      number that was usually right and never guaranteed to be.
 *
 * Both are asserted here against the real modules, with `fetch` stubbed so the
 * checks need no network, no key and no server.
 */

import { deriveTier } from "../src/lib/config";
import { verifyAccess } from "../src/lib/verify";
import { clearCache } from "../src/lib/cache";

declare const process: { exitCode: number };

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const config = {
  communities: { bonk: { mint: "M", chain: "solana" as const } },
  tiers: {
    holder: { community: "bonk", minimum: 1 },
    whale: { community: "bonk", minimum: 1_000_000 },
    other: { community: "elsewhere", minimum: 999 },
  },
};

console.log("\nderiveTier — the creator case");
check("a creator with balance 0 is not 'none'", deriveTier(0, true, "bonk", config, true) !== "none");
check(
  "a creator gets the top tier of THEIR community",
  deriveTier(0, true, "bonk", config, true) === "whale",
  deriveTier(0, true, "bonk", config, true)
);
check("a tier from another community is not borrowed", deriveTier(0, true, "bonk", config, true) !== "other");
check("a creator with no tier config is 'holder'", deriveTier(0, true, undefined, undefined, true) === "holder");
check("without the flag the old answer still stands", deriveTier(0, true, "bonk", config, false) === "none");

console.log("\nderiveTier — everyone else is unchanged");
check("balance 1 is 'holder'", deriveTier(1, true, "bonk", config) === "holder");
check("balance 1,000,000 is 'whale'", deriveTier(1_000_000, true, "bonk", config) === "whale");
check("balance 0 is 'none'", deriveTier(0, false, "bonk", config) === "none");
check("no config, has access -> 'holder'", deriveTier(5, true, undefined, undefined) === "holder");
check("no config, no access -> 'none'", deriveTier(0, false, undefined, undefined) === "none");

async function main(): Promise<void> {
  console.log("\nverifyAccess — the EVM gate_type passthrough");
  const seen: string[] = [];
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
    seen.push(url);
    return { ok: true, json: async () => ({ hasAccess: true, balance: 7 }) };
  };

  const evmBase = {
    contract: "0xabc",
    chain: "base" as const,
    minimum: 1,
    gateMode: "token_amount" as const,
  };

  await verifyAccess("https://totym.io", "0xwallet", { ...evmBase, gateType: "token" });
  const tokenUrl = seen[0] ?? "";
    check("a token gate sends gate_type=erc20", tokenUrl.includes("gate_type=erc20"), tokenUrl);

  clearCache();
  await verifyAccess("https://totym.io", "0xwallet", { ...evmBase, gateType: "nft" });
  const nftUrl = seen[1] ?? "";
    check("an NFT gate sends gate_type=erc721", nftUrl.includes("gate_type=erc721"), nftUrl);
    check("...and not erc20", !nftUrl.includes("gate_type=erc20"));

  console.log("\nverifyAccess — the creator response");
  clearCache();
  (globalThis as unknown as { fetch: unknown }).fetch = async () => ({
    ok: true,
    // Exactly what the API sends. It sent the same bytes before, via
    // `balance: Infinity`, which JSON.stringify emits as null.
    json: async () => ({ hasAccess: true, balance: null, isCreator: true }),
  });
  const creator = await verifyAccess("https://totym.io", "W", {
    mint: "M",
    chain: "solana",
    minimum: 1000,
    gateType: "token",
    gateMode: "token_amount",
  });
  check("hasAccess survives a null balance", creator.hasAccess === true);
  check("a null balance reads as 0, not NaN", creator.balance === 0);
  check("isCreator is carried through", creator.isCreator === true);

  clearCache();
  (globalThis as unknown as { fetch: unknown }).fetch = async () => ({
    ok: true,
    json: async () => ({ hasAccess: true, balance: 42 }),
  });
  const holder = await verifyAccess("https://totym.io", "W2", {
    mint: "M",
    chain: "solana",
    minimum: 1,
    gateType: "token",
    gateMode: "token_amount",
  });
  check("an ordinary holder is not flagged a creator", holder.isCreator === false);
  check("an ordinary balance is preserved", holder.balance === 42);

  console.log("\nend to end");
  check(
    "a creator's tier, derived from a real response, is 'whale'",
    deriveTier(creator.balance, creator.hasAccess, "bonk", config, creator.isCreator) === "whale"
  );
}

await main();

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
