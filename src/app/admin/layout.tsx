import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <nav className="border-b border-paper/10 bg-ink-soft">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-extrabold text-stamp">Admin</span>
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/usuarios" className="hover:underline">
              Usuários
            </Link>
          </div>
          <div className="ml-auto">
            <Link
              href="/dashboard"
              className="text-sm text-paper/60 underline underline-offset-2"
            >
              ← App
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl p-4 pb-16">{children}</main>
    </div>
  );
}
