"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"link" | "google" | null>(null);

  const callbackUrl = `${typeof location !== "undefined" ? location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink() {
    if (!email) return;
    setLoading("link");
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(null);
    }
  }

  async function googleLogin() {
    setLoading("google");
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (error) setError(error.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B1020",
        padding: "24px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Background gradient */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,100,51,0.07) 0%, transparent 65%)",
      }} />

      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40, textDecoration: "none" }}>
        <div style={{ width: 32, height: 32, backgroundColor: "#FF6433", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>N</div>
        <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 18 }}>notinha</span>
      </Link>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 400, position: "relative", zIndex: 1,
        backgroundColor: "#111827",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "36px 32px",
      }}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <h2 style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Link enviado!</h2>
            <p style={{ color: "#94A3B8", fontSize: 15, lineHeight: 1.6 }}>
              Enviamos um link de acesso para{" "}
              <strong style={{ color: "#FFFFFF" }}>{email}</strong>.
              <br />Abra seu e-mail e clique no link.
            </p>
            <button
              onClick={() => setSent(false)}
              style={{ marginTop: 24, color: "#94A3B8", fontSize: 13, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <>
            <h1 style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Entrar na Notinha</h1>
            <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              Sem senha. Acesse com link mágico ou Google.
            </p>

            {/* Google */}
            <button
              onClick={googleLogin}
              disabled={loading !== null}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "12px 20px", borderRadius: 12, marginBottom: 16,
                backgroundColor: "#1A2238", border: "1px solid rgba(255,255,255,0.1)",
                color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: loading ? "default" : "pointer",
                transition: "all 0.18s ease", opacity: loading === "google" ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = "#22304a"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#1A2238"; }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {loading === "google" ? "Redirecionando…" : "Continuar com Google"}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
              <span style={{ color: "#94A3B8", fontSize: 12 }}>ou</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendLink()}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "12px 16px", borderRadius: 12,
                  backgroundColor: "#1A2238",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#FFFFFF", fontSize: 15,
                  outline: "none", transition: "border-color 0.18s ease",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,100,51,0.5)")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            <button
              onClick={sendLink}
              disabled={!email || loading !== null}
              style={{
                width: "100%", padding: "13px 20px", borderRadius: 12,
                backgroundColor: !email || loading ? "#1A2238" : "#FF6433",
                color: "#FFFFFF", fontSize: 15, fontWeight: 600,
                border: "none", cursor: !email || loading ? "default" : "pointer",
                transition: "all 0.18s ease", opacity: loading === "link" ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (email && !loading) e.currentTarget.style.backgroundColor = "#FF7B52"; }}
              onMouseLeave={e => { if (email && !loading) e.currentTarget.style.backgroundColor = "#FF6433"; else e.currentTarget.style.backgroundColor = "#1A2238"; }}
            >
              {loading === "link" ? "Enviando…" : "Entrar com link mágico"}
            </button>

            {error && (
              <p style={{ marginTop: 12, color: "#FF6433", fontSize: 13, textAlign: "center" }}>{error}</p>
            )}
          </>
        )}
      </div>

      <p style={{ marginTop: 24, color: "#94A3B8", fontSize: 13, textAlign: "center", position: "relative", zIndex: 1 }}>
        Ainda não tem conta?{" "}
        <Link href="/" style={{ color: "#FF6433", textDecoration: "none", fontWeight: 600 }}>
          Saiba mais →
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
