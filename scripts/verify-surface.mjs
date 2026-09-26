/**
 * The built artifact exports exactly what was declared public — no more, no less.
 *
 *   npm run build && node scripts/verify-surface.mjs
 *
 * WHY THIS EXISTS
 *
 * `src/stability.ts` says what a developer may rely on. This checks it against
 * `dist/`, because a declaration that nobody compares to the artifact is a README
 * table with extra steps.
 *
 * Two directions, and the first is the one that bites:
 *
 *   · the package exports something this list does not mention. That is an export
 *     nobody decided was public, and the moment somebody imports it, it is an API
 *     whether it was meant to be or not. The application repository found three of
 *     these — two were the error classes a developer needs in order to handle
 *     failure at all, and nothing in THIS repository noticed.
 *   · the list mentions something the package does not export. A promise about
 *     something that is not there.
 *
 * ── Read from dist, never from src ──────────────────────────────────────────
 *
 * A check against the source tree would pass while the tarball differed. `tsup`
 * builds two entries with different banners, `files` publishes only `dist`, and a
 * developer installs the tarball — so the tarball is the subject.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;
function check(condition, label, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}${detail ? `  (${detail})` : ""}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}${detail ? `  (${detail})` : ""}`);
  }
}
function section(title) {
  console.log(`\n${title}`);
}

const DIST = join(ROOT, "dist");
if (!existsSync(join(DIST, "index.js")) || !existsSync(join(DIST, "server.js"))) {
  console.error("No build found. Run `npm run build` first — this checks the artifact, not the source.");
  process.exit(1);
}

/**
 * `stability.ts` is TypeScript and this script is plain ESM, so the list is read by
 * parsing rather than importing. Deliberate: adding a build step to the thing that
 * checks the build is a way to have the check depend on what it is checking.
 */
const stabilitySrc = readFileSync(join(ROOT, "src/stability.ts"), "utf8");
const declared = [...stabilitySrc.matchAll(/\{\s*name:\s*"([^"]+)",\s*entry:\s*"(root|server)",\s*stability:\s*"(stable|experimental)"/g)].map(
  (m) => ({ name: m[1], entry: m[2], stability: m[3] })
);

section("the declaration parses");
check(declared.length > 0, "exports were found in src/stability.ts", `${declared.length}`);
const names = declared.map((d) => d.name);
check(new Set(names).size === names.length, "each appears once",
  names.filter((n, i) => names.indexOf(n) !== i).join(", ") || "no duplicates");

/**
 * An experimental export must say why. Without the reason, the label is a way to
 * avoid committing to something rather than a statement about it.
 */
const experimental = declared.filter((d) => d.stability === "experimental");
const unexplained = experimental.filter(
  (d) => !new RegExp(`name: "${d.name}"[\\s\\S]{0,400}?why:`).test(stabilitySrc)
);
check(unexplained.length === 0, "every experimental export says why",
  unexplained.map((d) => d.name).join(", ") ||
    `${experimental.length} experimental: ${experimental.map((d) => d.name).join(", ") || "none"}`);

section("dist exports exactly what was declared");

const actual = {
  root: Object.keys(await import(join(DIST, "index.js"))).sort(),
  server: Object.keys(await import(join(DIST, "server.js"))).sort(),
};

for (const entry of ["root", "server"]) {
  const want = declared.filter((d) => d.entry === entry).map((d) => d.name).sort();
  const undeclared = actual[entry].filter((n) => !want.includes(n));
  const phantom = want.filter((n) => !actual[entry].includes(n));
  check(
    undeclared.length === 0,
    `nothing in the ${entry} entry is undeclared`,
    undeclared.join(", ") ||
      `${actual[entry].length} exports, all decided on`
  );
  check(
    phantom.length === 0,
    `and nothing declared for ${entry} is missing from it`,
    phantom.join(", ") || "no promises about absent things"
  );
}

section("the server half is not reachable from the client half");

const serverOnly = declared.filter((d) => d.entry === "server").map((d) => d.name);
const leaked = serverOnly.filter((n) => actual.root.includes(n));
check(
  leaked.length === 0,
  "no server export is importable from the root entry",
  leaked.join(", ") ||
    `${serverOnly.join(", ")} — so importing the guard into a client component stays a build error`
);

section("the banner split survived the build");

/**
 * Duplicated from ci.yml on purpose, so `npm test` catches it on a laptop as well as
 * on a runner. The failure is silent: a server-only module marked as client code
 * still runs, it just stops being the thing the separate entry point guarantees.
 */
const head = (file) => readFileSync(join(DIST, file), "utf8").slice(0, 200);
check(head("index.js").includes('"use client"'), "dist/index.js carries the client banner");
check(!head("server.js").includes('"use client"'), "and dist/server.js does not",
  "a server entry marked as client code is the silent version of this failure");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
