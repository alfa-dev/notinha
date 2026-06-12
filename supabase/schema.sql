-- Notinha — schema inicial
-- Rodar no SQL Editor do Supabase (ou via supabase db push)

-- ============ EXPENSES ============

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  merchant text,
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  category text not null default 'outros',
  payment_method text not null default 'outro',
  -- gasto pago por terceiro que precisa ser reembolsado (ex: "Gisele")
  reimburse_to text,
  receipt_path text, -- caminho no bucket "receipts"
  -- 'confirmed' | 'pending_review' (IA leu mas falta o usuário confirmar/responder)
  status text not null default 'confirmed',
  -- perguntas pendentes geradas pela IA: [{ "q": "...", "a": null }]
  questions jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_date_idx on public.expenses (user_id, date desc);
create index expenses_user_status_idx on public.expenses (user_id, status);

create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_cents integer,
  total_cents integer not null check (total_cents >= 0),
  position integer not null default 0
);

create index expense_items_expense_idx on public.expense_items (expense_id);

-- ============ SHOPPING LIST ============

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  quantity text, -- livre: "2", "1kg", "3 maços"
  note text,
  checked boolean not null default false,
  -- 'ai' (sugerido a partir dos gastos) | 'manual'
  source text not null default 'manual',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index shopping_items_user_idx on public.shopping_items (user_id, checked, position);

-- ============ updated_at trigger ============

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- ============ RLS ============

alter table public.expenses enable row level security;
alter table public.expense_items enable row level security;
alter table public.shopping_items enable row level security;

create policy "expenses: own rows"
  on public.expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expense_items: via parent"
  on public.expense_items for all
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and e.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_id and e.user_id = auth.uid()
  ));

create policy "shopping_items: own rows"
  on public.shopping_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ STORAGE (fotos das notinhas) ============
-- Criar bucket "receipts" (privado) no painel e aplicar as policies:

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts: upload próprio"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts: leitura própria"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts: remoção própria"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
