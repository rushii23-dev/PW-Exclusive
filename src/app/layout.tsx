import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import "./globals.css";

/* Three voices, each with a job, and none of them showy. Inter reads the
   interface, Inter Tight sets headlines at a tighter, more confident fit,
   JetBrains holds the contract text the reader is checking word for word. */
const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin"],
  display: "swap",
});

const display = Inter_Tight({
  variable: "--font-display-stack",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ClearClause — understand what you're signing",
    template: "%s · ClearClause",
  },
  description:
    "Paste any contract and get a plain-language breakdown: what each clause means, where the risks are, and what to ask before you sign. Nothing is stored.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* First tab stop on every page: straight to the content. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
