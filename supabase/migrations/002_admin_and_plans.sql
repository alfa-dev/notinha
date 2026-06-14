-- Migration 002: user_profiles (role, tier, subscription, OCR limits)
-- Rodar no SQL Editor do Supabase

-- ============ USER PROFILES ============

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  tier text not null default 'free' check (tier in ('free', 'plus', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,          -- 'active' | 'canceled' | 'past_due' | 'trialing' | null
  subscription_period_end timestamptz,
  suspended boolean not null default false,
  ocr_count_today integer not null default 0,
  ocr_count_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_stripe_customer_idx
  on public.user_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists user_profiles_tier_idx on public.user_profiles (tier);

-- updated_at trigger
create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ADMIN HELPER ============

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(
    (select role = 'admin' from public.user_profiles where id = auth.uid()),
    false
  );
$$;

-- ============ OCR LIMIT CHECK ============

-- Returns remaining OCR calls for today (null = unlimited)
create or replace function public.get_ocr_remaining(p_user_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_tier text;
  v_count integer;
  v_date date;
  v_limit integer;
begin
  select tier, ocr_count_today, ocr_count_date
  into v_tier, v_count, v_date
  from public.user_profiles
  where id = p_user_id;

  if not found then return 0; end if;

  -- Reset if new day
  if v_date < current_date then v_count := 0; end if;

  v_limit := case v_tier
    when 'free' then 1
    when 'plus' then 5
    when 'pro'  then null  -- unlimited
    else 1
  end;

  if v_limit is null then return null; end if;  -- unlimited
  return greatest(0, v_limit - v_count);
end;
$$;

-- ============ RLS ============

alter table public.user_profiles enable row level security;

create policy "profiles: read own or admin"
  on public.user_profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles: insert own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own or admin"
  on public.user_profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- ============ STRIPE EVENTS (idempotência) ============

create table if not exists public.stripe_events (
  id text primary key,
  processed_at timestamptz not null default now()
);

-- stripe_events só acessado via service role, sem RLS

-- ============ IMPORTANTE: criar perfil pra usuários existentes ============
-- Execute isto para usuários que já existem no sistema:
insert into public.user_profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ============ PARA DEFINIR SEU USUÁRIO COMO ADMIN ============
-- Substitua o email abaixo pelo seu e execute:
-- update public.user_profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'seu@email.com');
