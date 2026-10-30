-- Lets users clear (delete) their OWN notifications. Run once in the Supabase SQL editor.
create policy notif_del on notifications for delete using (user_id = auth.uid());
grant delete on notifications to authenticated;
