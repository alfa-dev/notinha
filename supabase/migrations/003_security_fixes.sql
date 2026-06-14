-- Migration 003: Security fixes
-- 1. Restrict space_invites SELECT policy
-- 2. Add ai_usage table for rate limiting
-- 3. Atomic OCR increment function
-- 4. Atomic AI usage increment function

-- ============ Fix space_invites RLS ============

drop policy if exists "space_invites: anyone can select" on public.space_invites;

-- Only owner or creator can read invites; bearer lookup uses service client server-side
create policy "space_invites: owner or creator"
  on public.space_invites for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.spaces s
      where s.id = space_id and s.owner_id = auth.uid()
    )
  );

-- ============ AI Usage table ============

create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  count_today integer not null default 0,
  count_date  date    not null default current_date,
  primary key (user_id, endpoint)
);

alter table public.ai_usage enable row level security;

-- No direct client access; all writes go through security-definer functions
create policy "ai_usage: no direct access"
  on public.ai_usage for all
  using (false);

-- ============ Atomic OCR increment ============
-- Returns jsonb: { allowed: bool, reason?: text, tier?: text, limit?: int }

create or replace function public.try_increment_ocr(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tier      text;
  v_count     integer;
  v_date      date;
  v_suspended boolean;
  v_limit     integer;
  today       date := current_date;
begin
  select tier, ocr_count_today, ocr_count_date, suspended
  into   v_tier, v_count, v_date, v_suspended
  from   public.user_profiles
  where  id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'profile_not_found');
  end if;

  if v_suspended then
    return jsonb_build_object('allowed', false, 'reason', 'suspended');
  end if;

  -- Reset counter if new day
  if v_date < today then v_count := 0; end if;

  v_limit := case v_tier
    when 'free' then 1
    when 'plus' then 5
    when 'pro'  then null
    else 1
  end;

  if v_limit is not null and v_count >= v_limit then
    return jsonb_build_object(
      'allowed', false, 'reason', 'limit_reached',
      'tier', v_tier, 'limit', v_limit
    );
  end if;

  update public.user_profiles
  set    ocr_count_today = v_count + 1,
         ocr_count_date  = today
  where  id = p_user_id;

  return jsonb_build_object('allowed', true, 'tier', v_tier, 'limit', v_limit);
end;
$$;

-- ============ Atomic AI usage increment ============
-- p_limit = null means unlimited; returns true if request is allowed

create or replace function public.try_increment_ai_usage(
  p_user_id uuid,
  p_endpoint text,
  p_limit    integer  -- null = unlimited
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
  v_date  date;
  today   date := current_date;
begin
  if p_limit is null then return true; end if;

  -- Ensure row exists (safe under concurrent inserts via ON CONFLICT)
  insert into public.ai_usage (user_id, endpoint, count_today, count_date)
  values (p_user_id, p_endpoint, 0, today)
  on conflict (user_id, endpoint) do nothing;

  -- Serialize with row lock
  select count_today, count_date
  into   v_count, v_date
  from   public.ai_usage
  where  user_id = p_user_id and endpoint = p_endpoint
  for update;

  -- Reset if new day
  if v_date < today then v_count := 0; end if;

  if v_count >= p_limit then return false; end if;

  update public.ai_usage
  set    count_today = v_count + 1,
         count_date  = today
  where  user_id = p_user_id and endpoint = p_endpoint;

  return true;
end;
$$;
