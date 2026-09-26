import { defineConfig } from "@totym/sdk/config";

/**
 * Note the import path. `@totym/sdk` carries a `"use client"` banner, so calling
 * `defineConfig` from there at module scope and importing this file from a root
 * layout — which is a server component — fails with "Attempted to call
 * defineConfig() from the server".
 *
 * That is how this example found the bug: the pattern the README described could not
 * build. `@totym/sdk/config` is the banner-free entry added in 0.3.0 for exactly
 * this.
 */

/**
 * One source of truth for what this app gates on.
 *
 * The addresses are real and public — USDC's Solana mint and its Base contract —
 * chosen so the example is not a placeholder. A developer running this against a
 * live API gets a real answer about a real token rather than an error about a
 * made-up address, and nobody has to invent credentials to try it.
 */
export default defineConfig({
  communities: {
    usdc: {
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      chain: "solana",
    },
    "usdc-base": {
      contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      chain: "base",
    },
  },
  tiers: {
    holder: { community: "usdc", minimum: 1 },
    whale: { community: "usdc", minimum: 1000 },
  },
});
