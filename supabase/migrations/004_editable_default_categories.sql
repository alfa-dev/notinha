-- Migration 004: Allow per-user overrides of default category labels
-- Adds default_category_id column to user_categories to link an override row
-- to its built-in category ID (e.g. "lazer", "alimentacao").

alter table public.user_categories
  add column if not exists default_category_id text;

-- One override per user per default category
create unique index if not exists user_categories_default_idx
  on public.user_categories (user_id, default_category_id)
  where default_category_id is not null;
