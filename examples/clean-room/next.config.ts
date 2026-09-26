import type { NextConfig } from "next";

/**
 * Deliberately empty.
 *
 * No transpilePackages, no webpack alias, no experimental flag. If `@totym/sdk`
 * needed any of those to work in a Next App Router app, this file is where that
 * would show up — and a developer would have to find it out themselves. An empty
 * config is the claim being tested.
 */
const config: NextConfig = {};

export default config;
