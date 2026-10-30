create or replace function public.set_inquiry_status(p_id bigint, p_status inquiry_status, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inq inquiries%rowtype;
  is_owner boolean;
  is_customer boolean;
  notify_user uuid;
begin
  select * into inq from inquiries where inquiry_id = p_id;
  if not found then
    raise exception 'Inquiry not found.';
  end if;

  is_owner := inq.caterer_id = my_caterer_id();
  is_customer := inq.customer_id in (select customer_id from customers where user_id = auth.uid());

  if not (is_owner or is_customer) then
    raise exception 'Not allowed.';
  end if;

  -- customers may only cancel their own Pending inquiry
  if not is_owner and not (inq.status = 'Pending' and p_status = 'Cancelled') then
    raise exception 'Customers can only cancel a Pending inquiry.';
  end if;

  if p_status in ('Unavailable', 'Cancelled') and coalesce(trim(p_message), '') = '' then
    raise exception 'A reply is required for Unavailable or Cancelled.';
  end if;

  update inquiries set status = p_status where inquiry_id = p_id;

  insert into inquiry_status_history (inquiry_id, previous_status, status, message, changed_by)
  values (p_id, inq.status, p_status, nullif(trim(p_message), ''), auth.uid());

  -- notify the other party
  if is_owner then
    select user_id into notify_user from customers where customer_id = inq.customer_id;
  else
    select user_id into notify_user from caterer_profiles where caterer_id = inq.caterer_id;
  end if;

  if notify_user is not null and notify_user is distinct from auth.uid() then
    insert into notifications (user_id, message, type)
    values (notify_user, inq.ref || ' is now ' || p_status || coalesce(': ' || nullif(trim(p_message), ''), ''), 'inquiry');
  end if;
end $$;