-- Run once in the Supabase SQL editor (safe to run again).
-- I) Customers (and guests) can SEE a Published caterer's Reserved / Unavailable dates,
--    and inquiries for those dates are refused
drop policy if exists avail_public_read on caterer_availability;
create policy avail_public_read on caterer_availability for select
  using (caterer_id in (select caterer_id from caterer_profiles where status = 'Published'));
grant select on caterer_availability to anon, authenticated;

create or replace function public.block_unavailable_dates() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from caterer_availability
             where caterer_id = new.caterer_id and day = new.event_date
               and status in ('Reserved', 'Unavailable')) then
    raise exception 'That date is not available. Please choose another date.';
  end if;
  return new;
end $$;

drop trigger if exists block_unavailable_dates on inquiries;
create trigger block_unavailable_dates before insert on inquiries
  for each row execute function public.block_unavailable_dates();

notify pgrst, 'reload schema';
