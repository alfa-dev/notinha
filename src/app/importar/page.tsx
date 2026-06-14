import ImportClient from "./ImportClient";
import AppHeader from "@/components/AppHeader";

export default function ImportarPage() {
  return (
    <>
      <AppHeader title="Importar fatura" />
      <main className="mx-auto max-w-lg p-4 pb-12">
        <p className="mt-2 mb-4 text-sm text-print-faint">
          Importe uma fatura de cartão de crédito via CSV ou foto.
        </p>
        <ImportClient />
      </main>
    </>
  );
}
