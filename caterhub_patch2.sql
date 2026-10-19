-- Run ONCE in Supabase SQL Editor (after schema + caterhub_patch.sql).
-- 1) Photo storage bucket: public read, owners write only inside their own folder, JPG/PNG/WebP up to 2 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos','photos',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=2097152, allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy photos_public_read on storage.objects for select using (bucket_id='photos');
create policy photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id='photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id='photos' and (storage.foldername(name))[1]=auth.uid()::text);
-- 2) Reject past event dates in the database too (SFFRS-048)
create function reject_past_event() returns trigger language plpgsql as $$
begin if new.event_date < current_date then raise exception 'Past dates are not accepted'; end if; return new; end $$;
create trigger inquiries_no_past before insert on inquiries for each row execute function reject_past_event();
