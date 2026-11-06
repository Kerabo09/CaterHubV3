-- Adds the business address and map link columns for caterers.
-- Run once in the Supabase SQL editor (Run the whole script).
alter table caterer_profiles add column if not exists address text;
alter table caterer_profiles add column if not exists map_link text;
-- refresh Supabase's schema cache so the new columns are found right away
notify pgrst, 'reload schema';

-- Extra: Profile status: add "Deactivated" (hidden from customers, like Draft)
alter table caterer_profiles drop constraint if exists caterer_profiles_status_check;
alter table caterer_profiles add constraint caterer_profiles_status_check
  check (status in ('Draft','Published','Deactivated'));

