# Notinha 🧾

App pessoal de controle de gastos: manda a foto da notinha (ou descreve o gasto em texto livre) e a IA extrai, classifica e anota. Quando algo não está claro — forma de pagamento, data, categoria ambígua — o app **te pergunta** antes de confirmar. Também monta **lista de compras** a partir do seu histórico.

Stack: **Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Auth + Postgres + Storage, RLS) · Claude API**.

## Funcionalidades

- 📷 **Foto da notinha** → Claude (vision) extrai estabelecimento, data, itens, total e sugere categoria/pagamento
- ✍️ **Texto livre** ("2 maços de cigarro no pix, 23 reais") → mesmo fluxo
- ❓ **Perguntas pendentes**: se a IA não tiver certeza, salva como `pending_review` com as perguntas; você responde depois direto na lista
- 🌙 **Regra da madrugada**: compras entre 00h e 05h geram a pergunta "conta como noite de ontem?"
- 💳 Controle por forma de pagamento, incluindo **"a pagar pra alguém"** (ex: cartão da Gisele)
- 🛒 **Lista de compras**: a IA sugere itens recorrentes do histórico (sem cigarro/álcool por padrão); tudo editável inline

## Setup

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Rode `supabase/schema.sql` no **SQL Editor** (cria tabelas, RLS e o bucket `receipts`)
3. Em **Authentication > Providers**, habilite Email (magic link) e, se quiser, Google
4. Em **Authentication > URL Configuration**, adicione `http://localhost:3000/auth/callback` e a URL de produção

### 2. Anthropic

Crie uma API key em [console.anthropic.com](https://console.anthropic.com). Ela só é usada nos route handlers (servidor) — nunca exposta no cliente.

### 3. Variáveis de ambiente

```bash
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
```

### 4. Rodar

```bash
npm install
npm run dev
```

### 5. Deploy (Vercel)

```bash
vercel
```

Configure as 3 env vars no painel. O `bodySizeLimit` de 8 MB já está no `next.config.ts` para aguentar as fotos.

## Estrutura

```
src/
  app/
    page.tsx                   # dashboard: cupom-resumo do mês + gastos por dia
    lista/page.tsx             # lista de compras
    login/page.tsx             # magic link + Google
    actions.ts                 # server actions (CRUD)
    api/
      parse-receipt/route.ts   # foto/texto -> Claude -> JSON estruturado
      shopping/generate/route.ts # histórico -> Claude -> itens sugeridos
  components/
    ReceiptCapture.tsx         # captura + revisão + perguntas da IA
    ExpenseList.tsx            # gastos agrupados por dia, resolve pendências
    ShoppingList.tsx           # lista editável (check, rename, delete)
  lib/
    categories.ts              # categorias, pagamentos, formatBRL
    types.ts
    supabase/{client,server}.ts
supabase/schema.sql            # tabelas + RLS + bucket de fotos
```

## Decisões de projeto

- **Valores em centavos** (`integer`) — nada de float pra dinheiro
- **`status: pending_review` + `questions jsonb`** no próprio gasto: o fluxo de pergunta/resposta não precisa de tabela extra
- **RLS em tudo**, incluindo o Storage (cada usuário só enxerga `receipts/{seu-uid}/...`)
- **Fotos não bloqueiam o fluxo**: se o upload pro Storage falhar, o gasto salva mesmo assim
- O prompt de parsing vive em `api/parse-receipt/route.ts` — ajuste as regras de categoria/perguntas ali conforme seu uso

## Próximos passos sugeridos

- [ ] Gráficos por categoria/mês (recharts)
- [ ] Exportar CSV/planilha do mês
- [ ] Marcar reembolso como quitado ("paguei a Gisele")
- [ ] PWA (manifest + service worker) pra instalar no celular
- [ ] Editar gasto completo (hoje só apaga/recria)
