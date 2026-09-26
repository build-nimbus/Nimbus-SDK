import type { ReactNode } from "react";
import { TotymProvider } from "@totym/sdk";

import config from "../totym.config";

/**
 * The provider wraps the tree once, in the root layout.
 *
 * ── The thing worth noticing about this file ─────────────────────────────────
 *
 * It is a SERVER component — no `"use client"` at the top — and it imports and
 * renders `TotymProvider`, which is a client component. That works because the
 * SDK's build stamps `"use client"` into `dist/index.js` itself, so the boundary
 * is declared by the package rather than by whoever installs it.
 *
 * If that banner were ever missing, this file is where it would fail, with
 * "useContext only works in a Client Component". That is why this example is a
 * Next App Router app rather than a Vite one: the banner split is the SDK's
 * signature risk, and only a real React Server Components build exercises it.
 */
export const metadata = {
  title: "Totym clean room",
  description: "@totym/sdk installed the way an outside developer would install it.",
};

const API_URL = process.env.NEXT_PUBLIC_TOTYM_API_URL ?? "https://www.totym.io";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem", lineHeight: 1.6 }}>
        <TotymProvider apiUrl={API_URL} config={config}>
          {children}
        </TotymProvider>
      </body>
    </html>
  );
}
