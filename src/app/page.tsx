import Link from "next/link";
import dynamic from "next/dynamic";

const ReceiptCanvas = dynamic(() => import("@/components/ReceiptCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const FEATURES = [
  {
    icon: "📸",
    title: "Foto vira nota",
    desc: "Aponte a câmera para qualquer cupom fiscal. A IA extrai todos os itens automaticamente.",
  },
  {
    icon: "📊",
    title: "Visualizações inteligentes",
    desc: "Agrupe por dia, categoria, método de pagamento, pessoa ou localização.",
  },
  {
    icon: "🗺️",
    title: "Mapa de gastos",
    desc: "Veja no mapa onde você gastou. GPS automático ao fotografar.",
  },
  {
    icon: "👥",
    title: "Espaços compartilhados",
    desc: "Divida despesas com família, parceiro ou equipe em tempo real.",
  },
  {
    icon: "💳",
    title: "Import de fatura",
    desc: "Importe CSV do seu banco ou fotografe a fatura do cartão.",
  },
  {
    icon: "🔒",
    title: "Seus dados, seu controle",
    desc: "Dados criptografados, hospedado no Brasil. Nunca vendemos informações.",
  },
];

const PLANS = [
  { name: "Free", price: "Grátis", features: ["1 OCR/dia", "Gastos manuais ∞", "Todas as visualizações"] },
  { name: "Plus", price: "R$ 15/mês", features: ["5 OCRs/dia", "Espaços compartilhados", "Import CSV"], highlight: true },
  { name: "Pro", price: "R$ 39/mês", features: ["OCR ilimitado", "Import por foto de fatura", "Suporte prioritário"] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-paper/10 bg-print/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <span className="font-extrabold tracking-tight text-stamp text-lg">
            notinha
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="#planos"
              className="hidden text-sm text-paper/60 hover:text-paper sm:block"
            >
              Planos
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-stamp px-4 py-1.5 text-sm font-bold text-paper"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
        {/* 3D canvas background */}
        <div className="absolute inset-0 opacity-60">
          <ReceiptCanvas />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-print via-print/80 to-transparent" />

        <div className="relative mx-auto max-w-5xl px-6 py-24">
          <div className="max-w-lg">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-stamp/80">
              Controle financeiro pessoal
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Suas notas fiscais
              <br />
              <span className="text-stamp">num segundo.</span>
            </h1>
            <p className="mt-5 text-lg text-paper/60 leading-relaxed">
              Fotografe o cupom, a IA lê tudo. Acompanhe seus gastos com
              visualizações detalhadas, mapa e espaços compartilhados.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-stamp px-7 py-3 font-extrabold text-paper shadow-lg"
              >
                Começar grátis
              </Link>
              <a
                href="#funcionalidades"
                className="rounded-lg border border-paper/20 px-7 py-3 font-bold text-paper/70 hover:border-paper/40"
              >
                Ver funcionalidades
              </a>
            </div>
            <p className="mt-4 text-xs text-paper/30">
              Sem cartão de crédito. Plano grátis permanente.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="bg-ink-soft py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-extrabold">
            Tudo que você precisa
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-paper/50">
            Desenvolvido para quem quer gastar menos tempo catalogando e mais
            tempo entendendo seus gastos.
          </p>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="receipt-edge px-6 py-5 hover:shadow-md transition-shadow"
              >
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="font-extrabold">{f.title}</h3>
                <p className="mt-2 text-sm text-paper/55 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / demo strip */}
      <section className="py-16 bg-print border-y border-paper/10">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-3xl font-extrabold">
            <span className="text-stamp">R$ 0</span> para começar.
          </p>
          <p className="mt-3 text-paper/50">
            Crie sua conta agora e registre seus primeiros gastos em menos de 1
            minuto.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-stamp px-8 py-3 font-extrabold text-paper"
          >
            Criar conta grátis →
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 bg-ink-soft">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-extrabold">Planos</h2>
          <p className="mt-3 text-center text-paper/50">
            Comece grátis. Faça upgrade quando precisar.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`receipt-edge px-6 py-7 flex flex-col ${
                  p.highlight ? "ring-2 ring-ok/40" : ""
                }`}
              >
                {p.highlight && (
                  <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-ok">
                    Mais popular
                  </p>
                )}
                <p className="text-center text-xs uppercase tracking-[0.25em] text-paper/50">
                  {p.name}
                </p>
                <p className="money mt-2 text-center text-2xl font-extrabold">
                  {p.price}
                </p>
                <div className="dashed-rule my-4" />
                <ul className="flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <span className="text-ok shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-5 block rounded-md py-2 text-center text-sm font-bold ${
                    p.highlight
                      ? "bg-ok text-paper"
                      : "bg-ink text-paper/70 hover:bg-ink-soft"
                  }`}
                >
                  Começar
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-paper/30">
            Pagamento via Stripe. Cancele quando quiser. Sem fidelidade.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-paper/10 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6">
          <span className="font-extrabold text-stamp">notinha</span>
          <div className="flex gap-4 text-xs text-paper/40">
            <Link href="/planos" className="hover:text-paper/70">
              Planos
            </Link>
            <Link href="/login" className="hover:text-paper/70">
              Entrar
            </Link>
          </div>
          <p className="text-xs text-paper/30">
            © {new Date().getFullYear()} notinha
          </p>
        </div>
      </footer>
    </div>
  );
}
