"use client";

/**
 * Scroll-triggered reveal that fails open.
 *
 * The naive version — render at opacity 0, animate to 1 — has a failure mode
 * this app can't afford: if the script never runs, content stays invisible.
 * So the server renders children plainly visible, and hiding happens only on
 * the client, only when an IntersectionObserver exists, only for elements
 * below the fold at mount, and never for readers who asked for reduced
 * motion. Lose the JavaScript and you lose the animation, nothing else.
 */

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type Phase = "static" | "hidden" | "revealed";

interface RevealProps {
  children: ReactNode;
  /** Seconds to wait after entering the viewport; stagger siblings with it. */
  delay?: number;
  from?: "below" | "left" | "right";
  className?: string;
  /** Semantic tag to render instead of wrapping in a div. */
  as?: ElementType;
}

const OFFSET = {
  below: "translate-y-6",
  left: "-translate-x-6",
  right: "translate-x-6",
} as const;

export function Reveal({
  children,
  delay = 0,
  from = "below",
  className,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    // Only take over what the reader cannot currently see.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setPhase("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPhase("revealed");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn(
        phase !== "static" &&
          "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        phase === "hidden" && cn("opacity-0", OFFSET[from]),
        phase === "revealed" && "opacity-100 translate-x-0 translate-y-0",
        className,
      )}
      style={phase === "revealed" && delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
