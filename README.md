# @nimbus/sdk

Token-gated access for any React app.

```
Wallet ownership → token verification → access → participation
```

All verification is **server-side** via the Nimbus API. The SDK never makes blockchain calls and never trusts client-reported balances.

## Install

```bash
npm install @nimbus/sdk
```

Zero runtime dependencies. React ≥18 peer dependency only.

## Quickstart

```tsx
// app/providers.tsx
import { NimbusProvider } from "@nimbus/sdk";

<NimbusProvider
  apiUrl="https://nimbus-seven-alpha.vercel.app"
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
</NimbusProvider>
```

```tsx
import { NimbusGate, useNimbusAccess } from "@nimbus/sdk";

// Component gating
<NimbusGate tier="whale">
  <WhaleOnlyContent />
</NimbusGate>

// Direct mint, no config needed
<NimbusGate mint="TOKEN_ADDRESS" minimum={1000}>
  <p>Holder-only content</p>
</NimbusGate>

// Word-level gating
<NimbusGate tier="holder">PROMO50</NimbusGate>

// Custom non-holder UI
<NimbusGate tier="holder" fallback={<UpgradePrompt />}>
  premium content
</NimbusGate>

// Hook for custom UI
const { hasAccess, balance, tier, isLoading, error } = useNimbusAccess({ community: "bonk" });
```

## Wallets

The SDK bundles no wallet library. Two paths:

**Your app already manages wallets** (Solana Wallet Adapter, wagmi, Privy) — pass the address down:

```tsx
// wagmi example (The Pantheon)
const { address } = useAccount();

<NimbusProvider apiUrl="..." wallet={{ address: address ?? null }}>
```

**No wallet setup** — the SDK detects injected providers (`window.solana`, `window.ethereum`) automatically.

## Chains

`solana` (default) · `base` · `ethereum` · `polygon`

Chain is inferred from config or address format; pass `chain` explicitly to override.


## Config file (one source of truth)

```ts
// nimbus.config.ts (project root)
import { defineConfig } from "@nimbus/sdk";

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
import nimbusConfig from "../nimbus.config";

<NimbusProvider apiUrl="..." config={nimbusConfig}>
```

Change a threshold in the config file and every `<NimbusGate tier="...">` on the site updates. `defineConfig` provides autocomplete and compile-time shape validation.

## Using with your wallet stack

The SDK detects injected wallets by default. If your app already manages wallets, pass the address down — that's the whole integration:

```tsx
// wagmi
const { address } = useAccount();
<NimbusProvider apiUrl="..." wallet={{ address: address ?? null }}>

// Solana Wallet Adapter
const { publicKey } = useWallet();
<NimbusProvider apiUrl="..." wallet={{ address: publicKey?.toBase58() ?? null }}>

// Privy
const { user } = usePrivy();
<NimbusProvider apiUrl="..." wallet={{ address: user?.wallet?.address ?? null }}>
```

## Behavior notes

- **Fails closed.** Loading, errors, disconnected wallets, and misconfigured gates render the locked state — never the content.
- **Cached.** Results cache for 30s client-side; concurrent identical checks share one request. `clearCache()` is exported if you need a hard refresh.
- Note: client-side gating hides UI, it does not protect data. Anything truly secret must be fetched from a server route that re-verifies access.

## Phase status

- ✅ Phase 1 — `NimbusProvider`, `useNimbusWallet`, `useNimbusAccess`, `<NimbusGate style="block">`
- ✅ Phase 2 — `useNimbusTier`, `<NimbusTier>` (+ `.Match` for custom tiers), `<NimbusWall>`, `<NimbusButton>`
- ✅ Phase 3 — fade/blur gate styles (note: fade/blur render content in the DOM by design — teaser UX, not protection)
- ✅ Phase 4 — config system (`defineConfig` + import pattern)
- ⬜ Phase 5 — Pantheon swap
- ✅ Phase 6 — publish-ready (LICENSE, metadata, prepublish pipeline; awaiting scope/name decision + `npm publish`)

## Troubleshooting

**"useContext/useState only works in Client Components" in Next.js App Router** — fixed in 0.1.0 via build banner. All SDK components are client components; the `"use client"` directive is baked into the bundle, so importing `<NimbusGate>` directly into a Server Component file works. If you see this on an older build, rebuild the package.

**Gate always locked / `hasAccess` always false** — check, in order: (1) is `<NimbusProvider apiUrl="...">` wrapping the tree? A missing provider throws; a wrong apiUrl fails closed. (2) Is a wallet connected or passed via the `wallet` prop? No wallet = locked, by design. (3) Open the Network tab — a CORS error means the API host hasn't allowed your origin.

**Import errors after updating a locally-linked package** — restart your dev server and your editor's TypeScript server. Local-path installs are symlinks; both tools cache aggressively.

**`Type '"blur"' has no properties in common with type 'Properties...'` when styling NimbusWall or NimbusButton** — the `style` prop means two different things in this SDK: on `<NimbusGate>` it selects the gate style (`"block" | "fade" | "blur"`); on `<NimbusWall>` and `<NimbusButton>` it's the standard React CSS style object for theming. Gate styles only exist on `NimbusGate` — a wall is already its own presentation.

**`Type '""' is not assignable to type 'NimbusChain'`** — editor autocomplete tends to insert `chain=""`. An empty string isn't a chain; either pass a real value (`"solana"`, `"base"`, `"ethereum"`, `"polygon"`) or omit the prop and let detection/config decide.

## Build

```bash
npm install
npm run build      # tsup → dist/ (ESM + CJS + types)
npm run typecheck
```