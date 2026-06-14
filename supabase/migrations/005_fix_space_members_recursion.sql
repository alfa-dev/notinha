-- Fix infinite recursion in space_members RLS
--
-- The original "members can select" policy had a self-referential subquery:
--   exists (select 1 from space_members sm2 where sm2.space_id = space_members.space_id ...)
-- This caused PostgreSQL to recurse infinitely when expenses (or expense_items)
-- tried to check membership as part of their own RLS evaluation.
--
-- Fix: remove the recursive third condition. Users can see:
--   1. Their own membership row (auth.uid() = user_id)
--   2. All rows in spaces they own (owner)
-- This is sufficient for all expense/space queries to work correctly.

drop policy if exists "space_members: members can select" on public.space_members;

create policy "space_members: members can select"
  on public.space_members for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.spaces s
      where s.id = space_id and s.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
