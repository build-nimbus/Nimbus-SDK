import { defineConfig } from "tsup";

/**
 * Two builds, because the two halves of this package must not be built alike.
 */
export default defineConfig([
  {
    // ── The client surface ──────────────────────────────────────────────────
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["react", "react/jsx-runtime"],
    // treeshake disabled: tsup's rollup pass strips the "use client" banner.
    // Consumer bundlers still tree-shake via ESM output + sideEffects:false.
    treeshake: false,
    // Bundlers strip module-level directives from source files. Without this,
    // importing any SDK component into a Next.js Server Component crashes with
    // an opaque hooks error. The banner restores the directive on the bundle.
    banner: { js: '"use client";' },
  },
  {
    // ── The server guard ────────────────────────────────────────────────────
    //
    // Deliberately NOT the config above, and the difference is the banner.
    // `@totym/sdk/server` is the module that withholds data, and stamping
    // "use client" on it would mark the one server-only file in the package as
    // client code — the precise inversion of what the separate entry point
    // exists to guarantee. It would still run, which is what makes it worth a
    // comment: the failure would be silent.
    //
    // `clean` is false so this build does not wipe the client output above.
    entry: ["src/server.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: false,
    treeshake: false,
  },
  {
    // ── The parts with no client dependency ─────────────────────────────────
    //
    // No banner, for the same reason the server build has none, and found the same
    // way: by building the documented pattern and watching it fail.
    //
    // `defineConfig` is an identity function. It was reachable only from the
    // banner'd client bundle, so a `totym.config.ts` calling it at module scope and
    // imported by a root layout — which is what the README describes — could not
    // build in a Next App Router app. The whole config feature was unusable in the
    // framework this package's documentation leads with, for all of 0.2.0.
    //
    // `clean` is false so this does not wipe either build above.
    entry: ["src/config.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: false,
    treeshake: false,
  },
]);
