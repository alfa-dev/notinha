"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z"/>
      <path d="M9 22V12h6v10"/>
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C9.24 2 7 4.24 7 7c0 5.25 5 12 5 12s5-6.75 5-12c0-2.76-2.24-5-5-5z"/>
      <circle cx="12" cy="7" r="2"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M7.5 7.5L12 3l4.5 4.5"/>
      <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10"/>
      <path d="M16 15l2 2 3.5-3.5" strokeWidth="1.75"/>
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}

const NAV = [
  { href: "/dashboard",     label: "Gastos",   Icon: HomeIcon   },
  { href: "/mapa",          label: "Mapa",     Icon: MapIcon    },
  { href: "/importar",      label: "Importar", Icon: UploadIcon },
  { href: "/lista",         label: "Lista",    Icon: ListIcon   },
  { href: "/configuracoes", label: "Config",   Icon: GearIcon   },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/planos") ||
    pathname.startsWith("/convite") ||
    pathname.startsWith("/auth");

  if (isPublic) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(255,255,255,0.06)] bg-ink/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around h-16">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-[3px] px-3 py-2 rounded-xl transition-colors duration-150 ${
                active ? "text-stamp" : "text-print-faint hover:text-paper"
              }`}
            >
              <Icon />
              <span className="text-[9px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
