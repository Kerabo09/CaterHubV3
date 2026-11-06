-- Run once in the Supabase SQL editor (safe to run again).
-- J) Customer replies to the caterer (from Notifications)
create table if not exists inquiry_messages (
  message_id  bigint generated always as identity primary key,
  inquiry_id  bigint not null references inquiries(inquiry_id) on delete cascade,
  sender_id   uuid not null,
  sender_role text not null check (sender_role in ('Customer', 'Caterer')),
  message     text not null check (length(trim(message)) > 0),
  created_at  timestamptz not null default now()
);
create index if not exists inquiry_messages_inquiry_idx on inquiry_messages (inquiry_id, created_at);
alter table inquiry_messages enable row level security;

drop policy if exists msg_read on inquiry_messages;
create policy msg_read on inquiry_messages for select using (
  inquiry_id in (
    select inquiry_id from inquiries
    where caterer_id = my_caterer_id()
       or customer_id in (select customer_id from customers where user_id = auth.uid())
  )
);
grant select on inquiry_messages to authenticated;

create or replace function public.reply_to_inquiry(p_ref text, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inq inquiries%rowtype;
  cust customers%rowtype;
  owner_id uuid;
  txt text := nullif(trim(p_message), '');
begin
  if txt is null then
    raise exception 'Please type your reply.';
  end if;
  if length(txt) > 1000 then
    raise exception 'Reply is too long (max 1000 characters).';
  end if;

  select * into inq from inquiries where ref = p_ref;
  if not found then
    raise exception 'Inquiry not found.';
  end if;

  select * into cust from customers where customer_id = inq.customer_id and user_id = auth.uid();
  if not found then
    raise exception 'Not allowed.';
  end if;

  insert into inquiry_messages (inquiry_id, sender_id, sender_role, message)
  values (inq.inquiry_id, auth.uid(), 'Customer', txt);

  select user_id into owner_id from caterer_profiles where caterer_id = inq.caterer_id;
  if owner_id is not null then
    insert into notifications (user_id, message, type)
    values (owner_id, coalesce(cust.name, 'The customer') || ' replied on ' || inq.ref || ': ' || txt, 'inquiry');
  end if;
end $$;

grant execute on function public.reply_to_inquiry(text, text) to authenticated;

notify pgrst, 'reload schema';
