-- Fix infinite recursion between spaces ↔ space_members RLS policies
--
-- Root cause: "space_members: owner can manage" is FOR ALL (includes SELECT)
-- with USING (exists(select from spaces ...)).
-- spaces SELECT policy also has exists(select from space_members ...).
-- This creates an infinite loop:
--   expenses → space_members (SELECT) → spaces (SELECT) → space_members (SELECT) → ...
--
-- Fix: split the FOR ALL policy into INSERT/UPDATE/DELETE only.
-- SELECT is handled by a simple policy with no subqueries.

-- 1. Drop both policies that affect SELECT on space_members
drop policy if exists "space_members: members can select"  on public.space_members;
drop policy if exists "space_members: owner can manage"    on public.space_members;

-- 2. Recreate owner policy WITHOUT SELECT (INSERT + UPDATE + DELETE only)
create policy "space_members: owner can insert"
  on public.space_members for insert
  with check (
    exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid())
  );

create policy "space_members: owner can update"
  on public.space_members for update
  using  (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));

create policy "space_members: owner can delete"
  on public.space_members for delete
  using (exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));

-- 3. Simple SELECT: each user sees only their own rows — zero subqueries, zero recursion
create policy "space_members: members can select"
  on public.space_members for select
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
