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

## Two components, and only one of them is a boundary

`<TotymReveal>` (called `TotymGate` before 0.3.0) decides what to **show**, in the
browser. `<TotymServerGate>` decides what to **send**, on the server. The rename
happened because the old name read as a boundary and sent people to check devtools,
which is the one place that cannot tell the difference.

Use `TotymReveal` for teasers and previews: it needs no signature and no cookie, so a
visitor sees what they are missing without being asked to sign anything. Use
`TotymServerGate` when the content must not reach a non-holder.

## What a reveal protects, and what it does not

`<TotymReveal>` decides what to **show**. It is not a boundary, and the difference is
worth being exact about because it is easy to check the wrong evidence and be
reassured.

| | In the rendered markup? | In the response body? |
|---|---|---|
| `<TotymReveal style="block">` | no | **yes** |
| `<TotymReveal style="fade">` | yes, dissolved | yes |
| `<TotymReveal style="blur">` | yes, unreadable | yes |
| `<TotymServerGate>`, any style | no | **no** |

`fade` and `blur` render children and obscure them — you cannot fade what is not
there. That has always been documented.

`block` is the one worth reading twice. It keeps children out of the DOM, so devtools
shows nothing — and in a React Server Components app the server has already serialized
those children into the flight payload before the client gate runs. The gate can
refuse to mount them; it cannot un-send them. Measured on a real Next App Router
build: absent from the rendered markup, present in the response. `view-source` finds
it.

**So no client gate style withholds bytes from a non-holder.**

## The gate that does: `<TotymServerGate>`

Added in 0.3.0, at `@totym/sdk/rsc`. It is a React Server Component, so it decides
BEFORE it renders — the protected branch is never created, never serialized, and not in
the response at all. Absent, not hidden.

```tsx
// app/members/page.tsx — a server component
import { cookies } from "next/headers";
import { TotymServerGate, TOTYM_SESSION_COOKIE } from "@totym/sdk/rsc";

export default async function Members() {
  return (
    <TotymServerGate
      apiUrl={process.env.TOTYM_API_URL!}
      token={(await cookies()).get(TOTYM_SESSION_COOKIE)?.value ?? null}
      query={{ mint: "…", minimum: 1 }}
      fallback={<p>Hold one to read this.</p>}
      unavailable={<p>We could not check. This is not a refusal.</p>}
    >
      <Secret />
    </TotymServerGate>
  );
}
```

Measured on a real Next App Router build, for a server child and a client child: with no
session the protected text is absent from the whole response; with a session that
qualifies it is present; with a session whose wallet holds nothing it is absent again.

**What it costs.** The server has to see the proof token, and `proveWallet()` hands that
token to JavaScript. So the browser posts it once to a route of yours that sets an
httpOnly cookie — `sessionCookie()` returns the pieces, with `httpOnly` fixed because it
is the whole point and one word to forget. A browser-only integration cannot use this
gate, and that is a property of the problem rather than an omission: a gate that
withholds bytes has to be decided where the bytes are assembled.

### Fade and blur, honestly

Fade and blur must render what they obscure, so the visible part can never be protected.
`<TotymServerGate>` has all three styles, and for `fade` and `blur` it **requires** a
`teaser` — a type error, not a runtime surprise:

```tsx
<TotymServerGate … style="fade" teaser={<p>{firstParagraph}</p>}>
  <p>{firstParagraph}</p>
  <p>{rest}</p>
</TotymServerGate>
```

The teaser is public. Every byte of it goes to everybody, which is the honest version of
the newspaper pattern: the part a non-holder can read is the part you chose to give them.
`style="block"` takes no teaser and shows only the fallback.

The requirement exists so nobody reaches for a fade and accidentally gets one over their
protected content. If `fade` silently fell back to `block`, somebody would ship a page
they believed was teasing and was not.

A non-holder receives the teaser and nothing else. That is the newspaper model done
without the pretence: the bytes a non-holder can read are bytes you decided to give
them. `examples/clean-room/app/withheld/page.tsx` does exactly this, and
`npm run e2e` in that example asserts the remainder is absent from the response.

### Or keep it in a route

If a server component does not suit the shape of your app,
[`examples/clean-room/app/api/protected/route.ts`](examples/clean-room/app/api/protected/route.ts)
is thirty lines and returns `403` for a denial, `503` for a check that could not be
completed, and the payload only after the check passes.

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

**`Attempted to call defineConfig() from the server but defineConfig is on the client`** — import it from `@totym/sdk/config`, not `@totym/sdk`. The main entry carries a `"use client"` banner, so anything called from it at module scope is a client function; a `totym.config.ts` imported by a root layout is a server component importing one. Fixed in 0.3.0 by adding the banner-free entry — before that, the documented config pattern could not build in a Next App Router app at all.

**Wrong network / the gate is locked and the balance looks right** — check the chain, in this order. (1) Is the wallet on the chain the gate names? A Base contract read with a wallet connected to Ethereum finds nothing, and correctly reports locked. (2) On EVM, `minimum` is compared in **raw base units** — one token of an 18-decimal ERC-20 is `1000000000000000000`, not `1`. A threshold written for Solana does not transfer. (3) `chain="polygon"` never works: the API serves Ethereum, Base and Robinhood Chain, and answers `400` for anything else, which surfaces as `error` and stays locked.

**Unsupported wallet** — the SDK detects an injected Solana or EVM provider and nothing else. If your app already manages wallets with wallet-adapter, wagmi or Privy, do not fight the detection: pass the connected address to `<TotymProvider wallet={{ address }}>` and the SDK skips its own entirely. A wallet the SDK cannot see is indistinguishable to it from no wallet, which reads as locked.

**RPC failure, and why it must not look like a denial** — a node provider that times out or rate-limits produces `error` on `useTotymAccess`, and `requireTotymAccess` THROWS `TotymUnavailableError` rather than returning `null`. Do not catch that and render a locked state: nobody found out whether the person qualifies, and telling a holder they do not hold their own token is worse than telling them to try again. Return `503`, not `403` — `examples/clean-room/app/api/protected/route.ts` does exactly that, and `npm run e2e` in that example takes the API down mid-run to prove it.

**SSR and hydration** — every component in the main entry is a client component; the `"use client"` banner is in the bundle, so importing one into a server component file works. What does not work is calling a *function* from that entry at module scope on the server — see the `defineConfig` entry above. If you see a hydration mismatch around a gate, it is almost always that the server rendered the locked state (no wallet) and the client then found one: expected, and it settles on the first paint after connection.

**Missing environment variables** — the SDK reads none. `apiUrl` is a prop, deliberately, so there is no variable to forget and no build-time inlining to get wrong. If your own `NEXT_PUBLIC_…` is undefined, `apiUrl` becomes `undefined`, every fetch fails, and the gate reports `error` — which is a configuration failure surfacing as an error rather than as a denial. Give it a default.

**Stale ownership data** — access results are cached client-side for a short window, so selling a token does not lock somebody out on the next render. Call `clearCache()` after an action you know changed a balance. The server guard does its own check per request and does not read that cache; a page that trusts a client result for something that matters is trusting a cache it did not set the policy for.

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