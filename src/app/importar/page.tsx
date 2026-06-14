import Link from "next/link";
import ImportClient from "./ImportClient";

export default function ImportarPage() {
  return (
    <main className="mx-auto max-w-lg p-4 pb-12">
      <header className="flex items-baseline justify-between py-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Importar</h1>
        <Link
          href="/"
          className="text-sm font-bold underline underline-offset-4"
        >
          ← Gastos
        </Link>
      </header>

      <p className="mt-2 text-sm text-paper/60">
        Importe uma fatura de cartão de crédito via CSV ou foto.
      </p>

      <ImportClient />
    </main>
  );
}
