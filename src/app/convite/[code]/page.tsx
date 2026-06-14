import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import AcceptInviteForm from "./AcceptInviteForm";

type Props = { params: Promise<{ code: string }> };

export default async function ConvitePage({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/convite/${code}`);
  }

  // Service client bypasses RLS for invite lookup; the code itself is the bearer secret
  const service = createServiceClient();
  const { data: invite } = await service
    .from("space_invites")
    .select("*, spaces(name)")
    .eq("code", code.toUpperCase())
    .single();

  if (!invite) {
    return (
      <main className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-extrabold">Convite inválido</h1>
        <p className="mt-2 text-paper/60">
          Este convite não existe ou expirou.
        </p>
        <a href="/dashboard" className="mt-4 inline-block underline">
          Voltar ao início
        </a>
      </main>
    );
  }

  if (invite.used_by) {
    return (
      <main className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-extrabold">Convite já usado</h1>
        <p className="mt-2 text-paper/60">
          Este convite já foi aceito por outra pessoa.
        </p>
        <a href="/dashboard" className="mt-4 inline-block underline">
          Voltar ao início
        </a>
      </main>
    );
  }

  const spaceName = (invite as { spaces?: { name: string } }).spaces?.name ?? "Espaço compartilhado";

  return (
    <main className="mx-auto max-w-lg p-8">
      <div className="receipt-edge px-5 py-8 text-center">
        <p className="text-[11px] tracking-[0.3em] uppercase text-print-faint">
          Convite para
        </p>
        <h1 className="mt-2 text-2xl font-extrabold">{spaceName}</h1>
        <div className="dashed-rule my-5" />
        <p className="text-sm text-paper/70">
          Ao aceitar, você poderá ver e adicionar gastos neste espaço
          compartilhado.
        </p>
      </div>
      <AcceptInviteForm code={code} defaultName={user.email?.split("@")[0] ?? ""} />
    </main>
  );
}
