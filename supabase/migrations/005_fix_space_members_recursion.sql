-- Fix infinite recursion in space_members RLS
--
-- The "members can select" policy had a self-referential subquery:
--   exists (select 1 from space_members sm2 where sm2.space_id = space_members.space_id ...)
-- This causes PostgreSQL to recurse infinitely whenever expenses (or expense_items)
-- query space_members as part of their own RLS evaluation.
--
-- Fix: introduce a SECURITY DEFINER helper that bypasses RLS when checking
-- membership, then use it in the space_members policy.

create or replace function public.check_space_member(p_space_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.space_members
    where space_id = p_space_id and user_id = p_user_id
  );
$$;

-- Drop the recursive policy and recreate it using the helper
drop policy if exists "space_members: members can select" on public.space_members;

create policy "space_members: members can select"
  on public.space_members for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())
    or public.check_space_member(space_id, auth.uid())
  );

notify pgrst, 'reload schema';
