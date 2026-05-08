import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TweaksPanel } from "@/components/TweaksPanel";
import { TweaksProvider } from "@/components/TweaksContext";

export const metadata: Metadata = {
  title: "SBD Metrics",
  description: "GRC assessment-ops dashboard for ICAA + ISA.",
};

// Inline script: read saved theme from localStorage and apply before paint to
// avoid a light-mode flash for dark-mode users.
const noFlashTheme = `
try {
  var t = JSON.parse(localStorage.getItem('sbd-tweaks') || '{}').theme;
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body>
        <TweaksProvider>
          <div className="app">
            <Sidebar />
            <main className="main">{children}</main>
          </div>
          <TweaksPanel />
        </TweaksProvider>
      </body>
    </html>
  );
}
