import Link from "next/link";

interface Props {
  title: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}

export default function AppHeader({
  title,
  backHref = "/dashboard",
  backLabel = "← Dashboard",
  action,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-print-faint hover:text-paper transition-colors text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">{backLabel.replace("← ", "")}</span>
          </Link>
          <span className="text-[rgba(255,255,255,0.15)] text-sm select-none">/</span>
          <h1 className="font-semibold text-sm text-paper">{title}</h1>
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}
