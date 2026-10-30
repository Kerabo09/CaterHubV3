-- CaterHub base schema (built from the ER diagram).
-- Run FIRST in Supabase -> SQL Editor, then caterhub_patch.sql, then caterhub_patch2.sql.
-- Passwords are NOT stored in public.users: Supabase Auth keeps only a hash in auth.users (NFR-009).

-- ============ TYPES ============
create type inquiry_status as enum
  ('Pending','Replied','Available','Unavailable','Confirmed Outside System','Cancelled');

-- ============ TABLES ============
create table roles (
  role_id     bigint generated always as identity primary key,
  role_name   text not null unique,
  description text
);
insert into roles (role_name, description) values
  ('Customer',      'Browses caterers and sends inquiries'),
  ('Caterer Owner', 'Manages a caterer profile, packages and inquiries'),
  ('Admin',         'Platform administrator');

create table users (                      -- one row per auth.users row
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null,
  phone      text,
  role_id    bigint not null references roles(role_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customers (
  customer_id bigint generated always as identity primary key,
  user_id     uuid not null unique references users(user_id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table caterer_profiles (
  caterer_id     bigint generated always as identity primary key,
  user_id        uuid not null unique references users(user_id) on delete cascade,  -- users 1:1 owns
  business_name  text not null,
  description    text,
  contact_number text,
  email          text,
  logo           text,
  note           text,
  min_guests     int,
  max_guests     int,
  out_of_town    boolean not null default false,
  event_types    text[] not null default '{}',
  status         text not null default 'Draft' check (status in ('Draft','Published')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (min_guests is null or max_guests is null or min_guests <= max_guests)
);

create table service_areas (
  area_id          bigint generated always as identity primary key,
  caterer_id       bigint not null references caterer_profiles(caterer_id) on delete cascade,
  area_name        text not null,
  location_details text,
  created_at       timestamptz not null default now(),
  unique (caterer_id, area_name)
);

create table catering_packages (
  package_id      bigint generated always as identity primary key,
  caterer_id      bigint not null references caterer_profiles(caterer_id) on delete cascade,
  name            text not null,
  description     text,
  price           numeric(10,2) not null check (price > 0),     -- per head
  min_guests      int not null default 1 check (min_guests >= 1),
  max_guests      int not null default 1 check (max_guests >= 1),
  inclusions      text[] not null default '{}',
  tables_chairs   text not null default 'Optional' check (tables_chairs in ('Optional','Included')),
  is_customizable boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (min_guests <= max_guests)
);

create table package_menu_items (
  menu_item_id bigint generated always as identity primary key,
  package_id   bigint not null references catering_packages(package_id) on delete cascade,
  category     text not null default 'Main dish',
  item_name    text not null,
  description  text,
  quantity     int,
  created_at   timestamptz not null default now()
);

create table package_photos (
  photo_id   bigint generated always as identity primary key,
  package_id bigint not null references catering_packages(package_id) on delete cascade,
  image_url  text not null,
  caption    text,
  created_at timestamptz not null default now()
);

create sequence inquiry_ref_seq start 1;
create table inquiries (
  inquiry_id    bigint generated always as identity primary key,
  ref           text not null unique default 'INQ-' || lpad(nextval('inquiry_ref_seq')::text, 6, '0'),
  customer_id   bigint not null references customers(customer_id) on delete cascade,
  caterer_id    bigint not null references caterer_profiles(caterer_id) on delete cascade,
  package_id    bigint references catering_packages(package_id) on delete set null,  -- null = custom inquiry
  event_date    date not null,
  event_type    text,
  location      text,
  guests        int not null check (guests >= 1),
  contact_phone text,
  budget        text,
  message       text,
  status        inquiry_status not null default 'Pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table inquiry_status_history (
  status_history_id bigint generated always as identity primary key,
  inquiry_id        bigint not null references inquiries(inquiry_id) on delete cascade,
  previous_status   inquiry_status,
  status            inquiry_status not null,
  message           text,
  changed_by        uuid references users(user_id) on delete set null,
  created_at        timestamptz not null default now()
);

create table caterer_availability (       -- owner's calendar marks (used by the Inquiries calendar)
  caterer_id bigint not null references caterer_profiles(caterer_id) on delete cascade,
  day        date not null,
  status     text not null check (status in ('Unavailable','Reserved')),
  primary key (caterer_id, day)
);

create table notifications (
  notification_id bigint generated always as identity primary key,
  user_id         uuid not null references users(user_id) on delete cascade,
  message         text not null,
  type            text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create table activity_logs (
  log_id     bigint generated always as identity primary key,
  user_id    uuid references users(user_id) on delete set null,
  action     text not null,
  details    text,
  created_at timestamptz not null default now()
);

-- ============ INDEXES (foreign keys + common filters) ============
create index on users(role_id);
create index on service_areas(caterer_id);
create index on catering_packages(caterer_id);
create index on package_menu_items(package_id);
create index on package_photos(package_id);
create index on inquiries(customer_id);
create index on inquiries(caterer_id, status);
create index on inquiries(package_id);
create index on inquiries(event_date);
create index on inquiry_status_history(inquiry_id);
create index on notifications(user_id, is_read);
create index on activity_logs(user_id);
create index on caterer_profiles(status);

-- ============ HELPER FUNCTIONS (used by RLS and by caterhub_patch.sql) ============
create function my_caterer_id() returns bigint language sql stable security definer set search_path = public as
$$ select caterer_id from caterer_profiles where user_id = auth.uid() limit 1 $$;

create function my_role() returns text language sql stable security definer set search_path = public as
$$ select r.role_name from users u join roles r on r.role_id = u.role_id where u.user_id = auth.uid() $$;

-- ============ TRIGGERS ============
-- keep updated_at fresh
create function touch_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;
create trigger touch_users     before update on users             for each row execute function touch_updated_at();
create trigger touch_customers before update on customers         for each row execute function touch_updated_at();
create trigger touch_profiles  before update on caterer_profiles  for each row execute function touch_updated_at();
create trigger touch_packages  before update on catering_packages for each row execute function touch_updated_at();
create trigger touch_inquiries before update on inquiries         for each row execute function touch_updated_at();

-- on sign-up: create the users row (+ customers row for customers) from the signUp() metadata
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare rn text; rid bigint; nm text; ph text;
begin
  rn := case new.raw_user_meta_data->>'role' when 'Caterer Owner' then 'Caterer Owner' else 'Customer' end; -- Admin can never be self-assigned
  select role_id into rid from roles where role_name = rn;
  nm := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  ph := nullif(trim(new.raw_user_meta_data->>'phone'), '');
  insert into users (user_id, name, email, phone, role_id) values (new.id, nm, new.email, ph, rid);
  if rn = 'Customer' then
    insert into customers (user_id, name, email, phone) values (new.id, nm, new.email, ph);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- activity log (Activity Logs table in the diagram)
create function log_activity() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'inquiries' then
    if tg_op = 'INSERT' then
      insert into activity_logs (user_id, action, details) values (auth.uid(), 'inquiry_created', new.ref);
    elsif new.status is distinct from old.status then
      insert into activity_logs (user_id, action, details) values (auth.uid(), 'inquiry_status_changed', new.ref || ': ' || old.status || ' -> ' || new.status);
    end if;
  elsif tg_table_name = 'catering_packages' and tg_op = 'INSERT' then
    insert into activity_logs (user_id, action, details) values (auth.uid(), 'package_created', new.name);
  elsif tg_table_name = 'caterer_profiles' then
    if tg_op = 'INSERT' or new.status is distinct from old.status then
      insert into activity_logs (user_id, action, details) values (auth.uid(), 'profile_' || lower(new.status), new.business_name);
    end if;
  end if;
  return new;
end $$;
create trigger log_inquiries after insert or update on inquiries         for each row execute function log_activity();
create trigger log_packages  after insert            on catering_packages for each row execute function log_activity();
create trigger log_profiles  after insert or update on caterer_profiles  for each row execute function log_activity();

-- ============ ROW LEVEL SECURITY ============
alter table roles                  enable row level security;
alter table users                  enable row level security;
alter table customers              enable row level security;
alter table caterer_profiles       enable row level security;
alter table service_areas          enable row level security;
alter table catering_packages      enable row level security;
alter table package_menu_items     enable row level security;
alter table package_photos         enable row level security;
alter table inquiries              enable row level security;
alter table inquiry_status_history enable row level security;
alter table caterer_availability   enable row level security;
alter table notifications          enable row level security;
alter table activity_logs          enable row level security;

-- roles: readable by everyone (the app joins users -> roles)
create policy roles_read on roles for select using (true);

-- users / customers: you see yourself (caterhub_patch.sql adds owner access to their inquiry customers)
create policy users_self_read     on users     for select using (user_id = auth.uid() or my_role() = 'Admin');
create policy customers_self_read on customers for select using (user_id = auth.uid());
create policy customers_self_upd  on customers for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- caterer profiles: the public sees Published ones; owners see/edit only their own
create policy profiles_read   on caterer_profiles for select using (status = 'Published' or user_id = auth.uid());
create policy profiles_insert on caterer_profiles for insert with check (user_id = auth.uid() and my_role() = 'Caterer Owner');
create policy profiles_update on caterer_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_delete on caterer_profiles for delete using (user_id = auth.uid());

create policy areas_read  on service_areas for select
  using (caterer_id = my_caterer_id() or caterer_id in (select caterer_id from caterer_profiles where status = 'Published'));
create policy areas_write on service_areas for all
  using (caterer_id = my_caterer_id()) with check (caterer_id = my_caterer_id());

-- packages: public sees active packages of Published caterers; owners manage their own
create policy packages_read on catering_packages for select
  using (caterer_id = my_caterer_id()
      or (is_active and caterer_id in (select caterer_id from caterer_profiles where status = 'Published')));
create policy packages_write on catering_packages for all
  using (caterer_id = my_caterer_id()) with check (caterer_id = my_caterer_id());

-- menu items / photos follow the visibility of their package
create policy menu_read  on package_menu_items for select using (package_id in (select package_id from catering_packages));
create policy menu_write on package_menu_items for all
  using (package_id in (select package_id from catering_packages where caterer_id = my_caterer_id()))
  with check (package_id in (select package_id from catering_packages where caterer_id = my_caterer_id()));
create policy photos_read  on package_photos for select using (package_id in (select package_id from catering_packages));
create policy photos_write on package_photos for all
  using (package_id in (select package_id from catering_packages where caterer_id = my_caterer_id()))
  with check (package_id in (select package_id from catering_packages where caterer_id = my_caterer_id()));

-- inquiries: customers create + read their own; owners read theirs; status changes only via set_inquiry_status()
create policy inq_customer_read on inquiries for select
  using (customer_id in (select customer_id from customers where user_id = auth.uid()));
create policy inq_owner_read on inquiries for select using (caterer_id = my_caterer_id());
create policy inq_customer_insert on inquiries for insert with check (
  status = 'Pending'
  and customer_id in (select customer_id from customers where user_id = auth.uid())
  and caterer_id in (select caterer_id from caterer_profiles where status = 'Published')
  and (package_id is null or package_id in (select package_id from catering_packages where caterer_id = inquiries.caterer_id))
);

-- status history: visible to whoever can see the inquiry; written only by triggers / set_inquiry_status()
create policy history_read on inquiry_status_history for select using (inquiry_id in (select inquiry_id from inquiries));

-- owner calendar marks
create policy avail_owner on caterer_availability for all
  using (caterer_id = my_caterer_id()) with check (caterer_id = my_caterer_id());

-- notifications: own only; clients may only flip is_read
create policy notif_read on notifications for select using (user_id = auth.uid());
create policy notif_upd  on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on notifications from anon, authenticated;
grant  update (is_read) on notifications to authenticated;

-- activity logs: admins only
create policy logs_admin on activity_logs for select using (my_role() = 'Admin');