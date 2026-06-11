import { defineConfig } from "tsup";

export default defineConfig({
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
});