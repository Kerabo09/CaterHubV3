-- Run ONCE in Supabase SQL Editor AFTER your main schema. Adds what the website needs
-- (owner can see customer names, status history, notifications, reply/cancel) without loosening RLS.
create function my_inquiry_customer_ids() returns setof bigint language sql stable security definer set search_path = public as
$$ select customer_id from inquiries where caterer_id = my_caterer_id() $$;
create policy customers_owner_read on customers for select using (customer_id in (select my_inquiry_customer_ids()));

create function log_new_inquiry() returns trigger language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  insert into inquiry_status_history (inquiry_id, status, changed_by) values (new.inquiry_id, 'Pending', auth.uid());
  select user_id into o from caterer_profiles where caterer_id = new.caterer_id;
  if o is not null then insert into notifications (user_id, message, type) values (o, 'New inquiry ' || new.ref || ' for ' || new.event_date, 'inquiry'); end if;
  return new;
end $$;
create trigger inquiries_new after insert on inquiries for each row execute function log_new_inquiry();

create function set_inquiry_status(p_id bigint, p_status inquiry_status, p_message text default '') returns void
language plpgsql security definer set search_path = public as $$
declare i inquiries; cu uuid; is_owner boolean;
begin
  select * into i from inquiries where inquiry_id = p_id;
  if i.inquiry_id is null then raise exception 'Inquiry not found'; end if;
  is_owner := i.caterer_id = my_caterer_id();
  if is_owner then
    if p_status in ('Unavailable','Cancelled') and coalesce(trim(p_message),'') = '' then raise exception 'A reply is required for Unavailable or Cancelled'; end if;
  elsif i.customer_id in (select customer_id from customers where user_id = auth.uid()) then
    if p_status <> 'Cancelled' or i.status <> 'Pending' then raise exception 'You can cancel only Pending inquiries'; end if;
  else raise exception 'Not allowed'; end if;
  update inquiries set status = p_status where inquiry_id = p_id;
  insert into inquiry_status_history (inquiry_id, previous_status, status, message, changed_by)
    values (p_id, i.status, p_status, coalesce(p_message,''), auth.uid());
  if is_owner then
    select user_id into cu from customers where customer_id = i.customer_id;
    if cu is not null then insert into notifications (user_id, message, type) values (cu, i.ref || ' is now ' || p_status, 'status'); end if;
  end if;
end $$;
revoke execute on function set_inquiry_status(bigint, inquiry_status, text) from public, anon;
grant execute on function set_inquiry_status(bigint, inquiry_status, text) to authenticated;
