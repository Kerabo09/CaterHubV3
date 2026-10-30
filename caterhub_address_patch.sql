-- Adds the business address column for caterers. Run once in the Supabase SQL editor.
alter table caterer_profiles add column if not exists address text;
