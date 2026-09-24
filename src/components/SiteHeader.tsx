"use client";

import { FileSearch, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/analyze", label: "Analyze" },
  { href: "/compare", label: "Compare" },
  { href: "/glossary", label: "Glossary" },
  { href: "/about", label: "How it works" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on: navigating anywhere —
  // a link, the back button — closes it without an effect to sync.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const toggleRef = useRef<HTMLButtonElement>(null);

  function close({ returnFocus }: { returnFocus: boolean }) {
    setOpenOn(null);
    if (returnFocus) toggleRef.current?.focus();
  }

  return (
    <header
      className="print-hidden elev-xs sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150"
      onKeyDown={(e) => {
        if (open && e.key === "Escape") close({ returnFocus: true });
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight"
        >
          <span className="glow-primary grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary-strong to-primary text-primary-foreground">
            <FileSearch className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg tracking-tight">ClearClause</span>
          <span className="sr-only">— home</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary-strong"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/analyze"
            className="glow-primary ml-2 whitespace-nowrap rounded-lg bg-gradient-to-br from-primary-strong to-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Try it
          </Link>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => (open ? close({ returnFocus: false }) : setOpenOn(pathname))}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main menu"
          className="elev-sm border-t border-border bg-surface-raised px-4 py-3 sm:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                  onClick={() => close({ returnFocus: false })}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname.startsWith(item.href)
                      ? "bg-primary-soft text-primary-strong"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
