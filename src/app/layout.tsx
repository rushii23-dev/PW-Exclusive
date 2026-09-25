import type { Metadata, Viewport } from "next";
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
  // Only the document boxes and quotes use it, so no page preloads it; the
  // browser fetches it where monospace text actually appears.
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "ClearClause — understand what you're signing",
    template: "%s · ClearClause",
  },
  description:
    "Paste, upload or photograph any contract and get a plain-language breakdown in your language: what each clause means, where the risks and contradictions are, your options, and what to ask before you sign. Powered by Gemini. Nothing is stored.",
  applicationName: "ClearClause",
  keywords: [
    "legal document explainer",
    "contract review",
    "rental agreement",
    "employment contract",
    "legal aid",
    "Gemini",
  ],
  // What a link to the site shows when shared in chat apps and social posts.
  openGraph: {
    type: "website",
    siteName: "ClearClause",
    title: "ClearClause — understand what you're signing",
    description:
      "Plain-language explanations of contracts, in 12 languages, with every claim checked against the document. Information, not legal advice.",
  },
  twitter: {
    card: "summary",
    title: "ClearClause — understand what you're signing",
    description:
      "Plain-language explanations of contracts, in 12 languages, with every claim checked against the document.",
  },
};

/* One theme only: tell the browser so its own chrome — scrollbars, form
   controls, the address bar on mobile — matches the page. */
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f3ec",
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
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
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
