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

## Behavior notes

- **Fails closed.** Loading, errors, disconnected wallets, and misconfigured gates render the locked state — never the content.
- **Cached.** Results cache for 30s client-side; concurrent identical checks share one request. `clearCache()` is exported if you need a hard refresh.
- Note: client-side gating hides UI, it does not protect data. Anything truly secret must be fetched from a server route that re-verifies access.

## Phase status

- ✅ Phase 1 — `NimbusProvider`, `useNimbusWallet`, `useNimbusAccess`, `<NimbusGate style="block">`
- ✅ Phase 2 — `useNimbusTier`, `<NimbusTier>` (+ `.Match` for custom tiers), `<NimbusWall>`, `<NimbusButton>`
- ✅ Phase 3 — fade/blur gate styles (note: fade/blur render content in the DOM by design — teaser UX, not protection)
- ⬜ Phase 4 — `nimbus.config.js` file loader
- ⬜ Phase 5 — Pantheon swap
- ⬜ Phase 6 — npm publish

## Build

```bash
npm install
npm run build      # tsup → dist/ (ESM + CJS + types)
npm run typecheck
```
