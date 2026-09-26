# @totym/sdk

Token-gated access for any React app.

```
Wallet ownership → token verification → access → participation
```

All verification is **server-side** via the Totym API. The SDK never makes blockchain calls and never trusts client-reported balances.

## Install

```bash
npm install @totym/sdk
```

Zero runtime dependencies. React ≥18 peer dependency only.

> **Renamed.** This package shipped as `@buildnimbus/sdk@0.1.0`. Everything the
> SDK exports carried a `Nimbus` prefix and now carries `Totym`:
> `NimbusProvider` → `TotymProvider`, `useNimbusAccess` → `useTotymAccess`, and
> so on for all eight exports. Nothing else changed — same props, same return
> shapes, same API endpoints. A find-and-replace of `Nimbus` → `Totym` plus the
> new package name is the whole migration.
>
> `@buildnimbus/sdk@0.1.0` stays on npm and keeps working; it will not get
> further releases.

## Quickstart

```tsx
// app/providers.tsx
import { TotymProvider } from "@totym/sdk";

<TotymProvider
  apiUrl="https://totym.io"
  config={{
    communities: {
      bonk: { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", chain: "solana" },
    },
    tiers: {
      whale:  { community: "bonk", minimum: 1000000 },
      holder: { community: "bonk", minimum: 1 },
    },
  }}
>
  {children}
</TotymProvider>
```

```tsx
import { TotymGate, useTotymAccess } from "@totym/sdk";

// Component gating
<TotymGate tier="whale">
  <WhaleOnlyContent />
</TotymGate>

// Direct mint, no config needed
<TotymGate mint="TOKEN_ADDRESS" minimum={1000}>
  <p>Holder-only content</p>
</TotymGate>

// Word-level gating
<TotymGate tier="holder">PROMO50</TotymGate>

// Custom non-holder UI
<TotymGate tier="holder" fallback={<UpgradePrompt />}>
  premium content
</TotymGate>

// NFT gating — a Solana collection, or an ERC-721 contract
<TotymGate gateType="nft" collectionAddress="COLLECTION_ADDRESS">
  <HolderOnly />
</TotymGate>

<TotymGate gateType="nft" contract="0x..." chain="base">
  <HolderOnly />
</TotymGate>

// Hook for custom UI
const { hasAccess, balance, tier, isCreator, isLoading, error } =
  useTotymAccess({ community: "bonk" });
```

## Wallets

The SDK bundles no wallet library. Two paths:

**Your app already manages wallets** (Solana Wallet Adapter, wagmi, Privy) — pass the address down:

```tsx
// wagmi example (The Pantheon)
const { address } = useAccount();

<TotymProvider apiUrl="..." wallet={{ address: address ?? null }}>
```

**No wallet setup** — the SDK detects injected providers (`window.solana`, `window.ethereum`) automatically.

## Chains

**Verified today:** `solana` (default) · `ethereum` · `base`

`polygon` is present in the `TotymChain` type and in `EVM_CHAIN_IDS`, but the
API does not serve it: `/api/check-access-evm` answers only chain ids `1`
(Ethereum) and `8453` (Base), and returns a `400` naming what is served for
anything else. A `<TotymGate chain="polygon">` therefore surfaces as an `error`
and stays locked — it fails closed, but it does not work. Do not ship one until
the endpoint serves 137.

Chain is inferred from config or address format; pass `chain` explicitly to override.

### What `minimum` counts

Not the same unit on both sides, and this bites:

- **Solana** — `minimum` is in whole tokens. The API returns the decimal-adjusted
  `uiAmount`, so `minimum={1000}` means 1,000 tokens.
- **EVM** — `minimum` is in raw base units. The API returns `balanceOf` verbatim,
  undivided, so on an 18-decimal ERC-20 one token is `1000000000000000000`.
  `minimum={1000}` there is a millionth of a millionth of a token, which every
  holder clears.

Balances above 2^53 also lose precision on the way through JSON, so treat the
EVM `balance` as an ordering signal, not an exact figure.

### NFT gates

`gateType="nft"` works on both families:

- **Solana** — pass `collectionAddress`. The API walks the wallet's assets and
  checks collection membership.
- **EVM** — pass `contract` and a `chain`. The API reads it as an ERC-721.

ERC-1155 is not supported and is refused rather than attempted: its `balanceOf`
takes a token id, which neither this query nor the endpoint accepts.


## Config file (one source of truth)

```ts
// totym.config.ts (project root)
import { defineConfig } from "@totym/sdk";

export default defineConfig({
  communities: {
    bonk: { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", chain: "solana" },
  },
  tiers: {
    whale:  { community: "bonk", minimum: 1000000 },
    holder: { community: "bonk", minimum: 1 },
  },
});
```

```tsx
import totymConfig from "../totym.config";

<TotymProvider apiUrl="..." config={totymConfig}>
```

Change a threshold in the config file and every `<TotymGate tier="...">` on the site updates. `defineConfig` provides autocomplete and compile-time shape validation.

## Using with your wallet stack

The SDK detects injected wallets by default. If your app already manages wallets, pass the address down — that's the whole integration:

```tsx
// wagmi
const { address } = useAccount();
<TotymProvider apiUrl="..." wallet={{ address: address ?? null }}>

// Solana Wallet Adapter
const { publicKey } = useWallet();
<TotymProvider apiUrl="..." wallet={{ address: publicKey?.toBase58() ?? null }}>

// Privy
const { user } = usePrivy();
<TotymProvider apiUrl="..." wallet={{ address: user?.wallet?.address ?? null }}>
```

## Behavior notes

- **Fails closed.** Loading, errors, disconnected wallets, and misconfigured gates render the locked state — never the content.
- **Creators are let in without a balance read.** If the connected wallet created the community, the API grants access before touching the chain and returns `isCreator: true` with no balance. `balance` reads `0` in that case and means nothing — branch on `isCreator`, not on the number. `tier` resolves to the highest tier configured for that community, not `"none"`.
- **Cached.** Results cache for 30s client-side; concurrent identical checks share one request. `clearCache()` is exported if you need a hard refresh.
- Note: client-side gating hides UI, it does not protect data. Anything truly secret must be fetched from a server route that re-verifies access.

## Phase status

- ✅ Phase 1 — `TotymProvider`, `useTotymWallet`, `useTotymAccess`, `<TotymGate style="block">`
- ✅ Phase 2 — `useTotymTier`, `<TotymTier>` (+ `.Match` for custom tiers), `<TotymWall>`, `<TotymButton>`
- ✅ Phase 3 — fade/blur gate styles (note: fade/blur render content in the DOM by design — teaser UX, not protection)
- ✅ Phase 4 — config system (`defineConfig` + import pattern)
- ⬜ Phase 5 — Pantheon swap
- ✅ Phase 6 — published to npm 2026-06-16 as `@buildnimbus/sdk@0.1.0`
- ✅ Phase 7 — renamed to Totym (`@totym/sdk@0.2.0`)

## Troubleshooting

**"useContext/useState only works in Client Components" in Next.js App Router** — fixed in 0.1.0 via build banner. All SDK components are client components; the `"use client"` directive is baked into the bundle, so importing `<TotymGate>` directly into a Server Component file works. If you see this on an older build, rebuild the package.

**Gate always locked / `hasAccess` always false** — check, in order: (1) is `<TotymProvider apiUrl="...">` wrapping the tree? A missing provider throws; a wrong apiUrl fails closed. (2) Is a wallet connected or passed via the `wallet` prop? No wallet = locked, by design. (3) Open the Network tab — a CORS error means the API host hasn't allowed your origin.

**Import errors after updating a locally-linked package** — restart your dev server and your editor's TypeScript server. Local-path installs are symlinks; both tools cache aggressively.

**`Type '"blur"' has no properties in common with type 'Properties...'` when styling TotymWall or TotymButton** — the `style` prop means two different things in this SDK: on `<TotymGate>` it selects the gate style (`"block" | "fade" | "blur"`); on `<TotymWall>` and `<TotymButton>` it's the standard React CSS style object for theming. Gate styles only exist on `TotymGate` — a wall is already its own presentation.

**`Type '""' is not assignable to type 'TotymChain'`** — editor autocomplete tends to insert `chain=""`. An empty string isn't a chain; either pass a real value (`"solana"`, `"base"`, `"ethereum"`, `"polygon"`) or omit the prop and let detection/config decide.

## Versioning

`0.x`, which under semantic versioning means the public API may change in a minor
release. [`VERSIONING.md`](VERSIONING.md) says what each bump contains, what `1.0.0`
will require (three conditions, not a date), how deprecation works, and which exports
are experimental. The short version: pin with `~0.2.0` rather than `^0.2.0` until
`1.0.0`, and a change that breaks a working integration ships as a minor with a
migration note, never as a patch.

Every published version carries a signed provenance attestation binding the tarball to
the commit and workflow run that built it, and `dist/BUILD` inside the package names
the same commit in plain text. So "the code I read is the code I installed" is
checkable rather than trusted.

## Build

```bash
npm install
npm run build      # tsup → dist/ (ESM + CJS + types)
npm run typecheck
```