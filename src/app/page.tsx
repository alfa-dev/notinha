"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      "#0B1020",
  surface: "#111827",
  raised:  "#1A2238",
  primary: "#FF6433",
  hover:   "#FF7B52",
  text:    "#FFFFFF",
  muted:   "#94A3B8",
  border:  "rgba(255,255,255,0.08)",
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function useCounter(target: number, started: boolean, duration = 1800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(step);
      else setVal(target);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return val;
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Fade({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const { ref, visible } = useFadeIn();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function Btn({ href, children, variant = "primary" }: {
  href: string; children: React.ReactNode; variant?: "primary" | "ghost";
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "13px 26px", borderRadius: 12,
    fontSize: 15, fontWeight: 600, textDecoration: "none",
    transition: "all 0.18s ease", cursor: "pointer",
  };
  const styles = variant === "primary" ? {
    ...base, backgroundColor: C.primary, color: "#fff",
    boxShadow: "0 0 0 0 rgba(255,100,51,0)",
  } : {
    ...base, backgroundColor: "transparent", color: C.text,
    border: `1px solid ${C.border}`,
  };
  return (
    <Link href={href} style={styles}
      onMouseEnter={e => {
        if (variant === "primary") {
          e.currentTarget.style.backgroundColor = C.hover;
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,100,51,0.28)";
          e.currentTarget.style.transform = "translateY(-1px)";
        } else {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
        }
      }}
      onMouseLeave={e => {
        if (variant === "primary") {
          e.currentTarget.style.backgroundColor = C.primary;
          e.currentTarget.style.boxShadow = "0 0 0 0 rgba(255,100,51,0)";
          e.currentTarget.style.transform = "translateY(0)";
        } else {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {children}
    </Link>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      backgroundColor: scrolled ? "rgba(11,16,32,0.88)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: `1px solid ${scrolled ? C.border : "transparent"}`,
      transition: "all 0.3s ease",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, backgroundColor: C.primary, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff" }}>N</div>
          <span style={{ fontWeight: 700, fontSize: 17, color: C.text }}>notinha</span>
        </div>
        <div className="hidden sm:flex" style={{ alignItems: "center", gap: 28 }}>
          {(["#como-funciona:Como funciona", "#produto:Produto", "/planos:Planos"] as const).map(s => {
            const [href, label] = s.split(":");
            const isExt = href.startsWith("/");
            const El = isExt ? Link : "a";
            return (
              <El key={label} href={href} style={{ color: C.muted, fontSize: 14, textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                {label}
              </El>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login" className="hidden sm:block" style={{ color: C.muted, fontSize: 14, textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
            Entrar
          </Link>
          <Link href="/login" style={{
            backgroundColor: C.primary, color: "#fff", fontSize: 14, fontWeight: 600,
            padding: "8px 18px", borderRadius: 10, textDecoration: "none", transition: "background-color 0.18s ease",
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.primary)}>
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── App Mockup ───────────────────────────────────────────────────────────────
function AppMockup() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = [800, 2200, 3600].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
      {/* Dashboard card */}
      <div style={{
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
      }}>
        {/* Top bar */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#FF5F56","#FFBD2E","#27C93F"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />)}
          </div>
          <div style={{ flex: 1, backgroundColor: C.raised, borderRadius: 6, height: 22, display: "flex", alignItems: "center", paddingLeft: 8 }}>
            <span style={{ color: C.muted, fontSize: 11 }}>notinha.app/dashboard</span>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* Summary row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <p style={{ color: C.muted, fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total — Junho 2026</p>
              <p style={{ color: C.text, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>R$ 2.847<span style={{ fontSize: 16, fontWeight: 500, color: C.muted }}>,90</span></p>
            </div>
            <div style={{ backgroundColor: "rgba(255,100,51,0.1)", border: "1px solid rgba(255,100,51,0.2)", color: C.primary, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>
              ↓ 12% vs mai
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 70, marginBottom: 20 }}>
            {[38, 52, 70, 48, 82, 65].map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: "100%", height: `${h}%`,
                  backgroundColor: i === 5 ? C.primary : C.raised,
                  borderRadius: "4px 4px 0 0",
                  boxShadow: i === 5 ? "0 0 12px rgba(255,100,51,0.4)" : "none",
                }} />
                <span style={{ color: C.muted, fontSize: 9 }}>{"JFMAMJ"[i]}</span>
              </div>
            ))}
          </div>

          {/* Category rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Alimentação", pct: 42, color: C.primary,  val: "R$ 1.196" },
              { label: "Transporte",  pct: 22, color: "#3B82F6",  val: "R$ 626"   },
              { label: "Moradia",     pct: 19, color: "#10B981",  val: "R$ 541"   },
            ].map(cat => (
              <div key={cat.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: C.text, fontSize: 12, fontWeight: 500 }}>{cat.label}</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{cat.val}</span>
                </div>
                <div style={{ height: 3, backgroundColor: C.raised, borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${cat.pct}%`, backgroundColor: cat.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Expense rows */}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { name: "Mercado Central", cat: "Alimentação", val: "R$ 152,90", date: "hoje" },
              { name: "Posto Ipiranga",  cat: "Transporte",  val: "R$ 89,00",  date: "ontem" },
            ].map(e => (
              <div key={e.name} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", borderRadius: 8, backgroundColor: C.raised,
              }}>
                <div>
                  <p style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{e.name}</p>
                  <p style={{ color: C.muted, fontSize: 10 }}>{e.cat} · {e.date}</p>
                </div>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{e.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating OCR result card */}
      <div style={{
        position: "absolute", top: -18, right: -18,
        width: 190, backgroundColor: C.raised,
        border: `1px solid ${step >= 2 ? "rgba(16,185,129,0.35)" : C.border}`,
        borderRadius: 16, padding: 14,
        boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
        opacity: step >= 1 ? 1 : 0,
        transform: step >= 1 ? "translateY(0) scale(1)" : "translateY(12px) scale(0.94)",
        transition: "all 0.5s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {step === 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.primary, animation: "nPulse 1s ease-in-out infinite" }} />
            <span style={{ color: C.primary, fontSize: 11, fontWeight: 600 }}>Processando IA…</span>
          </div>
        )}
        {step >= 2 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#10B981" }}>✓</div>
            <span style={{ color: "#10B981", fontSize: 11, fontWeight: 600 }}>OCR concluído</span>
          </div>
        )}
        <p style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Mercado Central</p>
        <p style={{ color: C.primary, fontSize: 17, fontWeight: 800, marginBottom: 6 }}>R$ 152,90</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <span style={{ backgroundColor: "rgba(255,100,51,0.1)", color: C.primary, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>Alimentação</span>
          <span style={{ backgroundColor: C.surface, color: C.muted, fontSize: 10, padding: "2px 8px", borderRadius: 6 }}>14 Jun</span>
        </div>
      </div>

      {/* Bottom notification */}
      <div style={{
        position: "absolute", bottom: -16, left: -16,
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "9px 14px",
        display: "flex", alignItems: "center", gap: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        opacity: step >= 3 ? 1 : 0,
        transform: step >= 3 ? "translateY(0)" : "translateY(6px)",
        transition: "all 0.4s ease",
        whiteSpace: "nowrap",
      }}>
        <span style={{ fontSize: 14 }}>✨</span>
        <span style={{ color: "#10B981", fontSize: 12, fontWeight: 600 }}>Gasto adicionado automaticamente</span>
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", paddingTop: 64 }}>
      <style>{`
        @keyframes nPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes nFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .nhover-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.4) !important; }
        .nhover-card { transition: all 0.25s ease; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* Gradient mesh */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse 70% 60% at 75% 15%, rgba(255,100,51,0.09) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 15% 85%, rgba(59,130,246,0.06) 0%, transparent 55%)` }} />
      {/* Dot grid */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px", width: "100%" }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "rgba(255,100,51,0.08)", border: "1px solid rgba(255,100,51,0.18)", borderRadius: 24, padding: "6px 14px", marginBottom: 28 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.primary, animation: "nPulse 2s ease-in-out infinite" }} />
              <span style={{ color: C.primary, fontSize: 11, fontWeight: 700, letterSpacing: "0.10em" }}>CONTROLE FINANCEIRO COM IA</span>
            </div>

            <h1 style={{ fontSize: "clamp(38px,5vw,64px)", fontWeight: 800, lineHeight: 1.08, color: C.text, marginBottom: 20 }}>
              Pare de guardar<br />cupons.
              <span style={{ display: "block", color: C.primary, marginTop: 4 }}>Tire uma foto.</span>
              <span style={{ display: "block", color: C.primary }}>A IA faz o resto.</span>
            </h1>

            <p style={{ fontSize: 18, color: C.muted, lineHeight: 1.7, marginBottom: 40, maxWidth: 460 }}>
              Transforme notas fiscais e comprovantes em relatórios automáticos de gastos, categorias, mapas e históricos pesquisáveis.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <Btn href="/login">Começar grátis →</Btn>
              <Btn href="#como-funciona" variant="ghost">Ver demonstração</Btn>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <p style={{ color: C.muted, fontSize: 13 }}>Sem cartão de crédito.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {["#FF6433","#3B82F6","#10B981","#8B5CF6"].map((c, i) => (
                  <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: c, border: `2px solid ${C.bg}`, marginLeft: i > 0 ? -6 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>{["R","S","M","A"][i]}</div>
                ))}
                <span style={{ color: C.muted, fontSize: 12, marginLeft: 4 }}>+12k usuários</span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex justify-center lg:justify-end">
            <AppMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", icon: "📸", title: "Tire uma foto", desc: "Fotografe qualquer nota fiscal, cupom ou comprovante. Funciona com câmera ou galeria." },
    { num: "02", icon: "🤖", title: "IA interpreta", desc: "Extraímos automaticamente valor, estabelecimento, categoria, data e localização." },
    { num: "03", icon: "📊", title: "Entenda seus gastos", desc: "Visualize tudo em gráficos, mapas e relatórios organizados por categoria e período." },
  ];
  return (
    <section id="como-funciona" style={{ padding: "96px 24px", position: "relative" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Fade>
          <p style={{ color: C.primary, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textAlign: "center", marginBottom: 12 }}>COMO FUNCIONA</p>
          <h2 style={{ fontSize: "clamp(32px,4vw,48px)", fontWeight: 800, color: C.text, textAlign: "center", marginBottom: 16 }}>Funciona em segundos</h2>
          <p style={{ color: C.muted, fontSize: 17, textAlign: "center", maxWidth: 480, margin: "0 auto 64px" }}>Nenhuma configuração necessária. Aponte, fotografe, pronto.</p>
        </Fade>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <Fade key={s.num} delay={i * 120}>
              <div className="nhover-card" style={{
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 20, padding: 28,
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                cursor: "default",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <span style={{ fontSize: 32 }}>{s.icon}</span>
                  <span style={{ color: C.raised, fontSize: 13, fontWeight: 700, backgroundColor: C.raised, padding: "3px 9px", borderRadius: 8 }}>{s.num}</span>
                </div>
                <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.65 }}>{s.desc}</p>
                <div style={{ marginTop: 20, height: 2, backgroundColor: C.raised, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${[60, 90, 75][i]}%`, backgroundColor: C.primary, borderRadius: 2 }} />
                </div>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Product Showcase ─────────────────────────────────────────────────────────
function ProductShowcase() {
  return (
    <section id="produto" style={{ padding: "80px 24px", backgroundColor: C.surface }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Fade>
          <p style={{ color: C.primary, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textAlign: "center", marginBottom: 12 }}>O PRODUTO</p>
          <h2 style={{ fontSize: "clamp(30px,4vw,48px)", fontWeight: 800, color: C.text, textAlign: "center", marginBottom: 14 }}>Seus gastos organizados automaticamente</h2>
          <p style={{ color: C.muted, fontSize: 17, textAlign: "center", maxWidth: 520, margin: "0 auto 56px" }}>Sem planilhas. Sem digitação. Sem trabalho manual.</p>
        </Fade>

        <Fade delay={100}>
          <div style={{
            backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 24,
            overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          }}>
            {/* Browser chrome */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, backgroundColor: C.raised }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#FF5F56","#FFBD2E","#27C93F"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />)}
              </div>
              <div style={{ flex: 1, maxWidth: 320, margin: "0 auto", backgroundColor: C.surface, borderRadius: 6, height: 22, display: "flex", alignItems: "center", paddingLeft: 10 }}>
                <span style={{ color: C.muted, fontSize: 11 }}>notinha.app/dashboard</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3" style={{ minHeight: 380 }}>
              {/* Sidebar */}
              <div style={{ borderRight: `1px solid ${C.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 6 }} className="hidden lg:flex">
                {["Dashboard","Gastos","Mapa","Espaços","Importar","Configurações"].map((item, i) => (
                  <div key={item} style={{
                    padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                    backgroundColor: i === 0 ? "rgba(255,100,51,0.1)" : "transparent",
                    color: i === 0 ? C.primary : C.muted, fontSize: 13, fontWeight: i === 0 ? 600 : 400,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 13 }}>{"📊🧾🗺️👥📂⚙️"[i]}</span>
                    {item}
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div style={{ gridColumn: "span 2", padding: 24 }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 24 }}>
                  {[
                    { label: "Este mês",    val: "R$ 2.847", delta: "↓ 12%", color: "#10B981" },
                    { label: "Transações",  val: "47",       delta: "+8",    color: C.primary  },
                    { label: "Categorias",  val: "6",        delta: "ativas",color: "#8B5CF6"  },
                  ].map(s => (
                    <div key={s.label} style={{ backgroundColor: C.raised, borderRadius: 14, padding: "16px 18px" }}>
                      <p style={{ color: C.muted, fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
                      <p style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>{s.val}</p>
                      <p style={{ color: s.color, fontSize: 12, marginTop: 4 }}>{s.delta}</p>
                    </div>
                  ))}
                </div>

                {/* Mini chart */}
                <div style={{ backgroundColor: C.raised, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                  <p style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>Evolução mensal</p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                    {[30,48,62,44,78,58,85,70,55,68,90,75].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}%`, backgroundColor: i === 10 ? C.primary : C.surface, borderRadius: "3px 3px 0 0", boxShadow: i === 10 ? "0 0 10px rgba(255,100,51,0.4)" : "none" }} />
                    ))}
                  </div>
                </div>

                {/* Recent expenses */}
                <div style={{ backgroundColor: C.raised, borderRadius: 14, padding: "16px 18px" }}>
                  <p style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Últimas anotações</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { n: "Mercado Central", c: "🍎 Alimentação", v: "R$ 152,90", tag: "#FF6433" },
                      { n: "Shell — Rod. Anhanguera", c: "🚗 Transporte", v: "R$ 89,00", tag: "#3B82F6" },
                      { n: "Farmácia Drogasil", c: "💊 Saúde", v: "R$ 47,60", tag: "#10B981" },
                    ].map(e => (
                      <div key={e.n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 3, height: 32, backgroundColor: e.tag, borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{e.n}</p>
                          <p style={{ color: C.muted, fontSize: 11 }}>{e.c}</p>
                        </div>
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{e.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Fade>
      </div>
    </section>
  );
}

// ─── Benefits ────────────────────────────────────────────────────────────────
function Benefits() {
  const items = [
    {
      label: "RELATÓRIOS",
      title: "Descubra para onde\nseu dinheiro vai",
      desc: "Gráficos de evolução mensal, categorias e tendências calculados automaticamente. Sem configuração.",
      visual: (
        <div style={{ backgroundColor: C.bg, borderRadius: 16, padding: 20 }}>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>Gastos por categoria — Jun 2026</p>
          {[
            { label: "Alimentação", pct: 42, color: C.primary },
            { label: "Transporte",  pct: 22, color: "#3B82F6" },
            { label: "Moradia",     pct: 19, color: "#10B981" },
            { label: "Saúde",       pct: 10, color: "#8B5CF6" },
            { label: "Lazer",       pct: 7,  color: "#F59E0B" },
          ].map(c => (
            <div key={c.label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: C.text, fontSize: 13 }}>{c.label}</span>
                <span style={{ color: C.muted, fontSize: 13 }}>{c.pct}%</span>
              </div>
              <div style={{ height: 6, backgroundColor: C.raised, borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${c.pct}%`, backgroundColor: c.color, borderRadius: 4, boxShadow: `0 0 8px ${c.color}60` }} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: "MAPA",
      title: "Veja onde você\nmais gasta",
      desc: "GPS automático ao fotografar. Veja todos os seus gastos em um mapa interativo com clustering por região.",
      visual: (
        <div style={{ backgroundColor: C.bg, borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{ position: "relative", height: 200, borderRadius: 12, overflow: "hidden", backgroundColor: C.raised, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            {[
              { x: 30, y: 40, size: 36, val: "R$ 850" },
              { x: 55, y: 25, size: 28, val: "R$ 420" },
              { x: 70, y: 60, size: 22, val: "R$ 210" },
              { x: 20, y: 65, size: 18, val: "R$ 89" },
            ].map((p, i) => (
              <div key={i} style={{
                position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
                width: p.size, height: p.size,
                backgroundColor: `rgba(255,100,51,${0.15 + i * 0.06})`,
                border: "2px solid rgba(255,100,51,0.5)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, color: C.primary, fontWeight: 700,
                transform: "translate(-50%,-50%)",
              }}>
                {i === 0 ? <span style={{ fontSize: 7 }}>{p.val}</span> : null}
              </div>
            ))}
            <div style={{ position: "absolute", bottom: 10, right: 10, backgroundColor: C.surface, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: C.primary, fontWeight: 600 }}>
              📍 47 locais mapeados
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "COMPARTILHAMENTO",
      title: "Compartilhe com\nsua família",
      desc: "Crie espaços compartilhados com cônjuge, filhos ou parceiros. Cada um registra, todos visualizam.",
      visual: (
        <div style={{ backgroundColor: C.bg, borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { name: "Rafael", role: "Admin", color: C.primary, exp: "R$ 1.240" },
              { name: "Mariana", role: "Membro", color: "#3B82F6", exp: "R$ 890" },
              { name: "Pedro", role: "Membro", color: "#10B981", exp: "R$ 417" },
            ].map(m => (
              <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12, backgroundColor: C.raised, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: `${m.color}22`, border: `2px solid ${m.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: m.color, fontWeight: 700, fontSize: 14 }}>{m.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{m.name}</p>
                  <p style={{ color: C.muted, fontSize: 11 }}>{m.role}</p>
                </div>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{m.exp}</span>
              </div>
            ))}
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <span style={{ color: C.primary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Convidar via QR Code</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "IMPORTAÇÃO",
      title: "Importe suas\nfaturas",
      desc: "Importe CSV do seu banco ou fotografe a fatura do cartão de crédito. A IA categoriza tudo automaticamente.",
      visual: (
        <div style={{ backgroundColor: C.bg, borderRadius: 16, padding: 20 }}>
          <div style={{ border: `2px dashed rgba(255,100,51,0.3)`, borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>fatura-itau-jun-2026.csv</p>
            <p style={{ color: "#10B981", fontSize: 13, fontWeight: 600 }}>✓ 68 transações importadas</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Alimentação: 24","Transporte: 12","Assinaturas: 8","Outros: 24"].map(t => (
              <span key={t} style={{ backgroundColor: C.raised, color: C.muted, fontSize: 11, padding: "4px 10px", borderRadius: 20 }}>{t}</span>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Fade>
          <p style={{ color: C.primary, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textAlign: "center", marginBottom: 12 }}>FUNCIONALIDADES</p>
          <h2 style={{ fontSize: "clamp(30px,4vw,48px)", fontWeight: 800, color: C.text, textAlign: "center", marginBottom: 64 }}>Tudo que você precisa</h2>
        </Fade>

        <div style={{ display: "flex", flexDirection: "column", gap: 80 }}>
          {items.map((item, i) => (
            <Fade key={item.label} delay={60}>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div>
                  <span style={{ color: C.primary, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em" }}>{item.label}</span>
                  <h3 style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 800, color: C.text, marginTop: 10, marginBottom: 16, whiteSpace: "pre-line" }}>{item.title}</h3>
                  <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.7 }}>{item.desc}</p>
                </div>
                <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
                  {item.visual}
                </div>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Social Proof ─────────────────────────────────────────────────────────────
function SocialProof() {
  const { ref, visible } = useFadeIn();
  const n1 = useCounter(12000,  visible);
  const n2 = useCounter(850000, visible);
  const n3 = useCounter(98,     visible);

  return (
    <section style={{ padding: "80px 24px", backgroundColor: C.surface, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 80% at 50% 50%, rgba(255,100,51,0.05) 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div ref={ref} style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Fade>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 800, color: C.text, textAlign: "center", marginBottom: 56 }}>
            Números que falam<br /><span style={{ color: C.primary }}>por si só</span>
          </h2>
        </Fade>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { val: n1, suffix: "+", label: "Notas processadas",       sub: "com precisão de 98%" },
            { val: `R$ ${(n2/1000).toFixed(0)}k`, suffix: "+", label: "Em despesas organizadas", sub: "pelos nossos usuários" },
            { val: n3, suffix: "%",  label: "Precisão OCR",           sub: "com Claude AI" },
          ].map((s, i) => (
            <Fade key={s.label} delay={i * 100}>
              <div style={{
                backgroundColor: C.raised, border: `1px solid ${C.border}`,
                borderRadius: 20, padding: 36, textAlign: "center",
                boxShadow: i === 1 ? `0 0 40px rgba(255,100,51,0.1), 0 0 0 1px rgba(255,100,51,0.15)` : "none",
              }}>
                <p style={{ fontSize: "clamp(36px,5vw,56px)", fontWeight: 800, color: C.text, lineHeight: 1, marginBottom: 8 }}>
                  {typeof s.val === "number" ? s.val.toLocaleString("pt-BR") : s.val}
                  <span style={{ color: C.primary }}>{s.suffix}</span>
                </p>
                <p style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{s.label}</p>
                <p style={{ color: C.muted, fontSize: 13 }}>{s.sub}</p>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  async function subscribe(tier: "plus" | "pro") {
    setLoading(tier);
    const res = await fetch("/api/stripe/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) });
    if (res.ok) { const d = await res.json(); window.location.href = d.url; }
    else setLoading(null);
  }

  const plans = [
    {
      id: "free", name: "Free", price: "R$ 0", period: "", badge: null,
      features: ["1 OCR por foto/dia", "Gastos manuais ilimitados", "Visualizações e filtros", "Histórico completo"],
      cta: "Começar grátis", ctaHref: "/login", highlight: false,
    },
    {
      id: "plus", name: "Plus", price: "R$ 15", period: "/mês", badge: "Mais popular",
      features: ["5 OCRs por foto/dia", "Espaços compartilhados", "Importação CSV", "Mapa com GPS", "Categorias personalizadas"],
      cta: "Assinar Plus", ctaHref: null, highlight: true,
    },
    {
      id: "pro", name: "Pro", price: "R$ 39", period: "/mês", badge: null,
      features: ["OCR ilimitado", "Import por foto de fatura", "Tudo do Plus", "Histórico ilimitado", "Suporte prioritário"],
      cta: "Assinar Pro", ctaHref: null, highlight: false,
    },
  ];

  return (
    <section id="planos" style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Fade>
          <p style={{ color: C.primary, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textAlign: "center", marginBottom: 12 }}>PLANOS</p>
          <h2 style={{ fontSize: "clamp(30px,4vw,48px)", fontWeight: 800, color: C.text, textAlign: "center", marginBottom: 14 }}>Simples e transparente</h2>
          <p style={{ color: C.muted, fontSize: 17, textAlign: "center", marginBottom: 64 }}>Comece grátis. Faça upgrade quando precisar. Cancele quando quiser.</p>
        </Fade>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <Fade key={plan.id} delay={i * 80}>
              <div style={{
                backgroundColor: plan.highlight ? C.surface : C.surface,
                border: `1px solid ${plan.highlight ? "rgba(255,100,51,0.35)" : C.border}`,
                borderRadius: 24, padding: 32, position: "relative",
                boxShadow: plan.highlight ? "0 0 60px rgba(255,100,51,0.12), 0 0 0 1px rgba(255,100,51,0.2)" : "none",
                transform: plan.highlight ? "scale(1.03)" : "none",
              }}>
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    backgroundColor: C.primary, color: "#fff", fontSize: 11, fontWeight: 700,
                    padding: "4px 16px", borderRadius: 20, letterSpacing: "0.06em",
                  }}>
                    {plan.badge.toUpperCase()}
                  </div>
                )}

                <p style={{ color: C.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>{plan.name.toUpperCase()}</p>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: C.text }}>{plan.price}</span>
                  <span style={{ color: C.muted, fontSize: 14 }}>{plan.period}</span>
                </div>

                <div style={{ height: 1, backgroundColor: C.border, marginBottom: 24 }} />

                <ul style={{ listStyle: "none", padding: 0, marginBottom: 32, display: "flex", flexDirection: "column", gap: 12 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: plan.highlight ? "rgba(255,100,51,0.12)" : C.raised, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: plan.highlight ? C.primary : "#10B981", fontSize: 10 }}>✓</span>
                      </div>
                      <span style={{ color: C.text, fontSize: 14 }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.ctaHref ? (
                  <Link href={plan.ctaHref} style={{
                    display: "block", textAlign: "center",
                    backgroundColor: plan.highlight ? C.primary : C.raised,
                    color: "#fff", fontSize: 15, fontWeight: 600,
                    padding: "13px 20px", borderRadius: 12, textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = plan.highlight ? C.hover : "#263050"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = plan.highlight ? C.primary : C.raised; e.currentTarget.style.transform = "translateY(0)"; }}
                  >{plan.cta}</Link>
                ) : (
                  <button
                    disabled={loading === plan.id}
                    onClick={() => subscribe(plan.id as "plus" | "pro")}
                    style={{
                      width: "100%", cursor: loading === plan.id ? "default" : "pointer",
                      backgroundColor: plan.highlight ? C.primary : C.raised,
                      color: "#fff", fontSize: 15, fontWeight: 600,
                      padding: "13px 20px", borderRadius: 12, border: "none",
                      transition: "all 0.2s ease", opacity: loading === plan.id ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.backgroundColor = plan.highlight ? C.hover : "#263050"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = plan.highlight ? C.primary : C.raised; e.currentTarget.style.transform = "translateY(0)"; }}
                  >{loading === plan.id ? "Aguarde…" : plan.cta}</button>
                )}
              </div>
            </Fade>
          ))}
        </div>
        <Fade delay={200}>
          <p style={{ textAlign: "center", color: C.muted, fontSize: 13, marginTop: 32 }}>Pagamento via Stripe. SSL. Cancele quando quiser.</p>
        </Fade>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ padding: "96px 24px", backgroundColor: C.surface, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 70% at 50% 50%, rgba(255,100,51,0.07) 0%, transparent 65%)`, pointerEvents: "none" }} />
      <Fade>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, color: C.text, lineHeight: 1.1, marginBottom: 20 }}>
            Comece a entender<br />para onde seu dinheiro<br /><span style={{ color: C.primary }}>está indo.</span>
          </h2>
          <p style={{ color: C.muted, fontSize: 18, marginBottom: 40, lineHeight: 1.6 }}>
            Crie sua conta gratuita em menos de um minuto.<br />Sem cartão de crédito.
          </p>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            backgroundColor: C.primary, color: "#fff", fontSize: 17, fontWeight: 700,
            padding: "16px 36px", borderRadius: 14, textDecoration: "none",
            boxShadow: "0 0 40px rgba(255,100,51,0.3)",
            transition: "all 0.2s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.hover; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(255,100,51,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.primary; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(255,100,51,0.3)"; }}
          >
            Criar conta grátis →
          </Link>
        </div>
      </Fade>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "32px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, backgroundColor: C.primary, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#fff" }}>N</div>
          <span style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>notinha</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          {[["Planos","/planos"],["Privacidade","#"],["Termos","#"],["Contato","#"]].map(([l,h]) => (
            <Link key={l} href={h} style={{ color: C.muted, fontSize: 13, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              {l}
            </Link>
          ))}
        </div>
        <p style={{ color: C.muted, fontSize: 12 }}>© {new Date().getFullYear()} notinha</p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
      <Navbar />
      <Hero />
      <HowItWorks />
      <ProductShowcase />
      <Benefits />
      <SocialProof />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
