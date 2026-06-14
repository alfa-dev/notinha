"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const pendingRef = useRef(false);

  const complete = useCallback(() => {
    if (!pendingRef.current) return;
    clearInterval(timerRef.current);
    pendingRef.current = false;
    const el = barRef.current;
    if (!el) return;
    el.style.transition = "width 150ms ease";
    el.style.width = "100%";
    setTimeout(() => {
      if (!barRef.current) return;
      barRef.current.style.transition = "opacity 250ms ease";
      barRef.current.style.opacity = "0";
      setTimeout(() => {
        if (barRef.current) barRef.current.style.width = "0%";
      }, 260);
    }, 160);
  }, []);

  const begin = useCallback(() => {
    clearInterval(timerRef.current);
    pendingRef.current = true;
    const el = barRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.opacity = "1";
    el.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!barRef.current) return;
        barRef.current.style.transition = "width 200ms ease";
        barRef.current.style.width = "20%";
        let pct = 20;
        timerRef.current = setInterval(() => {
          pct = Math.min(pct + Math.random() * 12, 85);
          if (barRef.current) barRef.current.style.width = `${pct}%`;
        }, 350);
      });
    });
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        link.target === "_blank"
      ) return;
      begin();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [begin]);

  useEffect(() => {
    complete();
  }, [pathname, complete]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px]">
      <div
        ref={barRef}
        className="h-full bg-stamp"
        style={{ width: "0%", opacity: 0 }}
      />
    </div>
  );
}
