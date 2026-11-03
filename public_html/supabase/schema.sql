-- SMART VISION — شغّل هذا الملف كاملاً في Supabase → SQL Editor
create table if not exists admin_emails(email text primary key, notify boolean not null default true, created_at timestamptz default now());
create table if not exists profiles(id uuid primary key references auth.users on delete cascade, email text, full_name text,
  role text not null default 'pending' check (role in ('admin','staff','pending')), created_at timestamptz default now());
create table if not exists requests(id uuid primary key default gen_random_uuid(), kind text not null default 'contact',
  name text not null check (char_length(name) between 2 and 120), email text check (char_length(email)<=160), phone text check (char_length(phone)<=40),
  subject text check (char_length(subject)<=160), message text check (char_length(message)<=4000),
  status text not null default 'new' check (status in ('new','in_progress','done')), notified_at timestamptz, created_at timestamptz default now());
create table if not exists news(id uuid primary key default gen_random_uuid(), title text not null, category text, body text, image_url text,
  published boolean not null default true, created_at timestamptz default now());
create table if not exists projects(id uuid primary key default gen_random_uuid(), title text not null,
  category text not null default 'Architecture', description text, image_url text, published boolean not null default true, created_at timestamptz default now());

create or replace function is_admin() returns boolean language sql security definer stable set search_path=public
 as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create or replace function is_staff() returns boolean language sql security definer stable set search_path=public
 as $$ select exists(select 1 from profiles where id=auth.uid() and role in ('admin','staff')) $$;

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,email,role) values(new.id,new.email,
    case when exists(select 1 from admin_emails a where lower(a.email)=lower(new.email)) then 'admin' else 'pending' end);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

alter table admin_emails enable row level security; alter table profiles enable row level security;
alter table requests enable row level security; alter table news enable row level security; alter table projects enable row level security;

create policy "admin_emails admin" on admin_emails for all using (is_admin()) with check (is_admin());
create policy "profiles self" on profiles for select using (id=auth.uid() or is_admin());
create policy "profiles admin update" on profiles for update using (is_admin()) with check (is_admin());
create policy "requests public insert" on requests for insert to anon, authenticated with check (status='new' and notified_at is null);
create policy "requests staff read" on requests for select using (is_staff());
create policy "requests staff update" on requests for update using (is_staff()) with check (is_staff());
create policy "requests admin delete" on requests for delete using (is_admin());
create policy "news read" on news for select using (published or is_admin());
create policy "news admin" on news for all using (is_admin()) with check (is_admin());
create policy "projects read" on projects for select using (published or is_admin());
create policy "projects admin" on projects for all using (is_admin()) with check (is_admin());

insert into storage.buckets(id,name,public) values('media','media',true) on conflict do nothing;
create policy "media read" on storage.objects for select using (bucket_id='media');
create policy "media admin write" on storage.objects for insert with check (bucket_id='media' and is_admin());
create policy "media admin delete" on storage.objects for delete using (bucket_id='media' and is_admin());

-- إيميلات الأدمن (تُستقبل عليها الطلبات ويصبح أصحابها مدراء تلقائياً عند إنشاء حساباتهم). عدّلها بإيميلاتكم:
insert into admin_emails(email) values ('admin1@smartvisiongcs.com'),('admin2@smartvisiongcs.com'),('info@smartvisiongcs.com') on conflict do nothing;
