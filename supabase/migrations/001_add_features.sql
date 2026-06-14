-- Migration 001: user_categories, shared spaces, invites, location, updated RLS
-- Rodar no SQL Editor do Supabase

-- ============ USER CATEGORIES ============
create table if not exists public.user_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists user_categories_user_idx on public.user_categories (user_id, position);
alter table public.user_categories enable row level security;
create policy "user_categories: own rows"
  on public.user_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ SHARED SPACES ============
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.spaces enable row level security;
create policy "spaces: members can select"
  on public.spaces for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = id and sm.user_id = auth.uid()
    )
  );
create policy "spaces: owner can insert"
  on public.spaces for insert
  with check (auth.uid() = owner_id);
create policy "spaces: owner can update"
  on public.spaces for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "spaces: owner can delete"
  on public.spaces for delete
  using (auth.uid() = owner_id);

-- ============ SPACE MEMBERS ============
create table if not exists public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
alter table public.space_members enable row level security;
create policy "space_members: members can select"
  on public.space_members for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())
    or exists (select 1 from public.space_members sm2 where sm2.space_id = space_members.space_id and sm2.user_id = auth.uid())
  );
create policy "space_members: owner can manage"
  on public.space_members for all
  using (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));
create policy "space_members: self can insert"
  on public.space_members for insert
  with check (auth.uid() = user_id);
create policy "space_members: self can delete"
  on public.space_members for delete
  using (auth.uid() = user_id);

-- ============ SPACE INVITES ============
create table if not exists public.space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  code text not null unique default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid not null references auth.users (id),
  used_by uuid references auth.users (id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.space_invites enable row level security;
create policy "space_invites: anyone can select"
  on public.space_invites for select using (true);
create policy "space_invites: owner can insert"
  on public.space_invites for insert
  with check (
    auth.uid() = created_by
    and exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())
  );
create policy "space_invites: update used_by"
  on public.space_invites for update
  using (used_by is null)
  with check (auth.uid() = used_by);
create policy "space_invites: owner can delete"
  on public.space_invites for delete
  using (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));

-- ============ ALTER EXPENSES: location + space ============
alter table public.expenses
  add column if not exists space_id uuid references public.spaces (id) on delete set null,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists address text;

create index if not exists expenses_space_idx on public.expenses (space_id) where space_id is not null;

-- Update expenses RLS: split the single "for all" into separate policies
-- so space members can READ shared expenses without being able to modify them
drop policy if exists "expenses: own rows" on public.expenses;

create policy "expenses: own or shared select"
  on public.expenses for select
  using (
    auth.uid() = user_id
    or (
      space_id is not null
      and (
        exists (select 1 from public.space_members sm where sm.space_id = expenses.space_id and sm.user_id = auth.uid())
        or exists (select 1 from public.spaces s where s.id = expenses.space_id and s.owner_id = auth.uid())
      )
    )
  );

create policy "expenses: own insert"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "expenses: own update"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses: own delete"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- Update expense_items RLS similarly
drop policy if exists "expense_items: via parent" on public.expense_items;

create policy "expense_items: select via parent"
  on public.expense_items for select
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id
    and (
      e.user_id = auth.uid()
      or (
        e.space_id is not null
        and (
          exists (select 1 from public.space_members sm where sm.space_id = e.space_id and sm.user_id = auth.uid())
          or exists (select 1 from public.spaces s where s.id = e.space_id and s.owner_id = auth.uid())
        )
      )
    )
  ));

create policy "expense_items: modify via parent owner"
  on public.expense_items for all
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and e.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_id and e.user_id = auth.uid()
  ));
