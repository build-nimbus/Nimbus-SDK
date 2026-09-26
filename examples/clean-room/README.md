# Totym clean room

`@totym/sdk`, installed the way somebody outside Totym installs it.

> **`@totym/sdk@0.3.0` is not on npm yet.** This example depends on it, because it
> demonstrates the fix that release contains: `defineConfig` could not be called from
> a server component, so the `totym.config.ts` pattern the README documented did not
> build in a Next App Router app. Until 0.3.0 publishes, `npm install` here fails with
> `ETARGET`. CI builds the tarball from this repository and installs that instead,
> which is what the `clean-room` job is for.

## What this is for

It is the answer to one question: **can a developer reach a working gate using only
the public package and public documentation?** Everything here is arranged so that
question has a checkable answer rather than a confident one.

- The dependency is `"@totym/sdk": "^0.2.0"` from the registry. No workspace, no
  `file:` path, no symlink into the SDK's source tree.
- `next.config.ts` is **empty**. No `transpilePackages`, no webpack alias, no
  experimental flag. If the SDK needed one of those, this file is where it would show
  up — and an empty config is the claim being tested.
- It typechecks and builds with **no Totym account, no API key and no wallet**. Every
  gate reports locked, which is the correct answer rather than a broken one.
- CI installs the **packed tarball** over the registry copy and asserts the bytes
  match the build. So the thing being tested is the artifact, not the source.

## Run it

```bash
npm install
npm run typecheck
npm run build
npm run e2e        # starts the built app against a stub API
npm run dev        # or read it in a browser
```

Point it at a real API with `NEXT_PUBLIC_TOTYM_API_URL` (client) and `TOTYM_API_URL`
(server routes). Both default to `https://www.totym.io`.

If you install a newly built tarball over an existing checkout, `rm -rf .next` first.
Next caches the client-reference manifest, and after an export is renamed a stale cache
reports `Attempted import error: 'X' is not exported` for something that is plainly in
the bundle. Cost one build cycle to work out; CI never sees it, because a fresh checkout
has no cache.

## The seven patterns

Each is its own route, so it can be read alone and copied whole.

| Route | Pattern | The point |
|---|---|---|
| `/gate-a-component` | Gate a component | The smallest thing the SDK does. |
| `/gate-a-page` | Gate a page | Same API, wider scope. Still not a protection. |
| `/styles` | Block, fade, blur | Only `block` keeps children out of the DOM. |
| `/custom-denial` | Custom denial UI | Say what would get somebody in, not just that they are out. |
| `/states` | Loading and error | `error` is not a denial. Telling a holder it is, is the bug. |
| `/connect` | Wallet connection and proof | An address is a claim; a signature is evidence. |
| `/api/protected` | Server-side verification | A route that withholds a payload. |
| `/withheld` | The strong gate, and an honest fade | `<TotymServerGate>` — content absent from the response, not hidden in it. |

## The one that matters

Six of the seven run in the browser. A browser gate decides what to **show**, and
everything inside it was already sent to the visitor's machine — so `view-source`
reads it whatever the gate says. `/styles` demonstrates that on purpose: search the
page for "demonstration" with no wallet connected and you find it twice, under `fade`
and `blur`, and not at all under `block`.

`app/withheld/page.tsx` and `app/api/protected/route.ts` are the other kind. The payload is built **after** the
check, so a non-holder never receives it, and the route answers three ways rather
than two:

- a holder → `200`
- the check completed and said no → `403`
- the check could not be completed → `503`, never `403`

That third case is the one to get right. If an outage returned `403`, every real
holder would be locked out of their own community and the logs would show clean,
successful denials — nothing would look broken. `npm run e2e` takes the stub API down
mid-run and asserts the answer is `503`.

## Time to a first working gate

Measured, on this machine, from a blank project:

| Step | Cost |
|---|---|
| `npm install @totym/sdk react react-dom` | **1s** |
| Wrap the tree in `<TotymProvider apiUrl="…">` | one file, four lines |
| Put `<TotymGate tier="…">` around something | one file, three lines |
| `npm run build` | **5.6s** for this whole example, ten routes |

**Four steps, two files, no configuration.** No API key, no account, no `.env`, no
`transpilePackages`, no webpack alias. The gate reports locked until a wallet is
connected, which is the correct answer and not a broken one.

The step that is NOT on that list, and should be, is the one that makes any of it a
protection: moving the thing you actually care about behind
`app/api/protected/route.ts`. Four steps gets a gate. The fifth gets a boundary.

## What is deliberately not here

**A wallet adapter.** `/connect` has a `signMessage` that throws, with a note saying
to replace it. Which adapter to use is the developer's choice — wallet-adapter, wagmi,
Privy — and the SDK does not care. Picking one here would make this example an
argument about libraries instead of a demonstration of the gate.

**A `.env` file.** Both API URLs default to production, so there is nothing to
configure before the first run. That is the whole point of measuring
time-to-first-gate: every step this example needs is a step a real developer needs.
