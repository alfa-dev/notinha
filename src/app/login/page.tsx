"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = `${typeof location !== "undefined" ? location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink() {
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
    }
  }

  async function googleLogin() {
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
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="receipt-edge w-full max-w-sm px-6 py-10">
        <p className="text-center text-xs tracking-[0.3em] uppercase text-print-faint">
          Documento não fiscal
        </p>
        <h1 className="mt-2 text-center text-3xl font-extrabold tracking-tight">
          Notinha
        </h1>
        <p className="mt-1 text-center text-sm text-print-faint">
          Manda a foto que eu anoto.
        </p>

        <div className="dashed-rule my-6" />

        {sent ? (
          <p className="text-center text-sm">
            Link enviado pra <strong>{email}</strong>. Abre teu e-mail pra
            entrar.
          </p>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border-2 border-print/20 bg-white px-3 py-3 text-print outline-none focus:border-stamp"
            />
            <button
              onClick={sendLink}
              disabled={!email}
              className="w-full rounded-md bg-print py-3 font-bold text-paper disabled:opacity-40"
            >
              Entrar com link mágico
            </button>
            <button
              onClick={googleLogin}
              className="w-full rounded-md border-2 border-print/20 py-3 font-bold"
            >
              Entrar com Google
            </button>
            {error && <p className="text-sm text-stamp">{error}</p>}
          </div>
        )}
      </div>
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
