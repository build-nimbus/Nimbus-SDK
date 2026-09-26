# Versioning and deprecation

## The honest headline

This package is `0.x`. Under semantic versioning that means **the public API may
change in a minor release**, and pretending otherwise would be the first thing in
this document a reader could catch out.

So the promise below is narrower than "we follow semver" and is worth more, because
it is one this project can actually keep at its current size:

> **A change that breaks a working integration ships as a minor bump, never a patch,
> and always with an entry in the changelog naming what to change.**

Pin accordingly. `"@totym/sdk": "~0.2.0"` takes patches only. `"^0.2.0"` on a `0.x`
package takes minors too, which npm treats as breaking-allowed — that is npm's rule,
not a Totym one, and it is why the tilde is the safer default until `1.0.0`.

## What each bump means, today

| Bump | Contains | Example |
|---|---|---|
| **patch** `0.2.0 → 0.2.1` | Bug fixes, better error messages, documentation. Nothing that changes what correct code does. | `TotymProofError` carrying a status it previously omitted. |
| **minor** `0.2.0 → 0.3.0` | New exports, new props, and **breaking changes with a migration note**. | Removing a chain from `TotymChain` that the API refuses. |
| **major** `0.x → 1.0.0` | The API is declared stable. From then on, breaking changes are majors and nothing else. | Not yet. See below. |

## What `1.0.0` will require

Not a date — three conditions, so this is checkable rather than aspirational:

1. **An integration outside Totym.** Everything in this package is exercised today by
   one application written by the same people. A stable API claim made without a
   second integrator is a guess about what other people need.
2. **The chain list stops moving.** `TotymChain` currently names a chain the API
   refuses and cannot name one it serves. A type that is wrong in both directions is
   not a stable interface.
3. **The failure path is exercised by somebody else.** `TotymUnavailableError` exists
   because a check that could not be completed used to surface as a denial. Until an
   outside integrator has handled one, we do not know whether the shape is usable.

## Stability, per export

Every public export is declared `stable` or `experimental` in
[`src/stability.ts`](src/stability.ts), and that file is checked against the built
artifact: an export that exists and is not declared fails the build, and so does a
declaration for an export that does not exist.

- **stable** — a breaking change to it gets the migration note above.
- **experimental** — may change in a minor with only a changelog line. Today:
  `EVM_CHAIN_IDS`, because the set of chains it describes is the thing least settled
  in this package.

## Releases so far

**0.3.0** — adds `@totym/sdk/config`, a banner-free entry point for `defineConfig`,
`detectChain` and `EVM_CHAIN_IDS`. A minor rather than a patch because it adds exports,
and the reason it exists is a defect: `defineConfig` shipped only inside the
`"use client"` bundle, so the `totym.config.ts` pattern documented in the README and in
the function's own doc comment could not build in a Next App Router app. Nothing in
0.2.0 needs changing — the root entry still exports all three — but a config file
imported by a root layout must import from `@totym/sdk/config`.

No deprecation is needed for the root copies. They work for client code, which is where
they were reachable from before.

Also in 0.3.0: `@totym/sdk/rsc`, with `TotymServerGate`, `sessionCookie` and
`TOTYM_SESSION_COOKIE`. A React Server Component gate that decides before rendering, so
the protected content is absent from the response rather than hidden in it. All three are
marked **experimental**: they are new, and they constrain the integration — the proof
token has to reach the server, which in practice means an httpOnly cookie. The shape of
that constraint is the part an outside integration is most likely to change, which is
exactly what `experimental` is for.

## Deprecation

A public export is removed in three steps, never fewer:

1. **Announce.** A minor release marks it `@deprecated` in the types, so an editor
   says so at the call site, and names the replacement. The changelog entry says what
   to use instead. It keeps working.
2. **Warn.** The next minor logs a single `console.warn` on first use, in development
   only — `process.env.NODE_ENV !== "production"`, so nothing is added to a
   production bundle's noise. It keeps working.
3. **Remove.** The minor after that. Never in the same release as the announcement,
   and never in a patch.

Two releases of warning is not long. It is proportional to a package with one known
integration, and the alternative — a deprecation window measured in quarters — is a
promise about maintenance capacity that does not exist here.

**Nothing is removed silently.** If an export disappears from this package without
having gone through the three steps, that is a bug in the release, not a decision.

## Security fixes

The exception, and the only one. A fix for a vulnerability ships as fast as it can be
built, in whatever bump makes it installable for the most people — including a patch
that changes behaviour, if the behaviour was the vulnerability. The changelog says
plainly that it is a security fix and what was exposed.

`SECURITY.md` in the application repository has the reporting route. A report about
this package goes to the same place.

## Where the versions are recorded

- **npm** — `npm view @totym/sdk versions` lists every published version.
- **Provenance** — each published version carries a signed attestation binding the
  tarball to the commit and the workflow run that produced it. `npm view @totym/sdk`
  shows it, and `dist/BUILD` inside the package names the same commit in plain text.
  So "the code I read is the code I installed" is checkable rather than trusted.
