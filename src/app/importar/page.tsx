import ImportClient from "./ImportClient";
import AppHeader from "@/components/AppHeader";

export default function ImportarPage() {
  return (
    <>
      <AppHeader title="Importar fatura" />
      <main className="mx-auto max-w-lg p-4 pb-44">
        <p className="mt-2 mb-4 text-sm text-print-faint">
          Importe uma fatura de cartão via CSV, TXT ou foto.
        </p>
        <ImportClient />
      </main>
    </>
  );
}
