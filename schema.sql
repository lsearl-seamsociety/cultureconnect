-- Run in Supabase: SQL Editor > New query > paste > Run.
create table profiles(id uuid primary key references auth.users on delete cascade, display_name text not null default 'New member', bio text default '', country text, languages text[] default '{}', avatar_url text, privacy text not null default 'public' check (privacy in ('public','members','private')), created_at timestamptz default now());
create table posts(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, title text not null check (char_length(title) between 3 and 80), body text not null check (char_length(body) between 10 and 600), context text default '', country text not null, category text not null, kind text not null default 'personal' check (kind in ('personal','community','reference')), image_url text, created_at timestamptz default now());
create table comments(id uuid primary key default gen_random_uuid(), post_id uuid not null references posts(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade, body text not null check (char_length(body) between 1 and 300), created_at timestamptz default now());
create table likes(post_id uuid references posts(id) on delete cascade, user_id uuid references profiles(id) on delete cascade, primary key(post_id,user_id));
create table saves(post_id uuid references posts(id) on delete cascade, user_id uuid references profiles(id) on delete cascade, primary key(post_id,user_id));
create table reports(id uuid primary key default gen_random_uuid(), post_id uuid references posts(id) on delete cascade, reporter_id uuid not null references profiles(id), reason text not null, created_at timestamptz default now());
create table blocks(blocker_id uuid references profiles(id) on delete cascade, blocked_id uuid references profiles(id) on delete cascade, primary key(blocker_id,blocked_id));
create table events(id uuid primary key default gen_random_uuid(), name text not null, country text not null, category text not null, starts_on date not null, ends_on date not null, description text, official_url text, is_sample boolean not null default true);
alter table profiles enable row level security; alter table posts enable row level security; alter table comments enable row level security; alter table likes enable row level security; alter table saves enable row level security; alter table reports enable row level security; alter table blocks enable row level security; alter table events enable row level security;
create policy "profiles read" on profiles for select using (privacy='public' or auth.uid()=id or (privacy='members' and auth.uid() is not null));
create policy "profiles update own" on profiles for update using (auth.uid()=id);
create policy "posts read" on posts for select using (true);
create policy "posts insert own" on posts for insert with check (auth.uid()=user_id);
create policy "posts update own" on posts for update using (auth.uid()=user_id);
create policy "posts delete own" on posts for delete using (auth.uid()=user_id);
create policy "comments read" on comments for select using (true);
create policy "comments insert own" on comments for insert with check (auth.uid()=user_id);
create policy "comments delete own" on comments for delete using (auth.uid()=user_id);
create policy "likes read" on likes for select using (true);
create policy "likes own" on likes for insert with check (auth.uid()=user_id);
create policy "unlike own" on likes for delete using (auth.uid()=user_id);
create policy "saves own read" on saves for select using (auth.uid()=user_id);
create policy "saves own" on saves for insert with check (auth.uid()=user_id);
create policy "unsave own" on saves for delete using (auth.uid()=user_id);
create policy "report insert" on reports for insert with check (auth.uid()=reporter_id);
create policy "blocks own read" on blocks for select using (auth.uid()=blocker_id);
create policy "blocks own" on blocks for insert with check (auth.uid()=blocker_id);
create policy "unblock own" on blocks for delete using (auth.uid()=blocker_id);
create policy "events read" on events for select using (true);
-- Reports are readable only in the Supabase dashboard (moderators). Add a moderator role later.
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id,display_name) values (new.id, split_part(new.email,'@',1)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
insert into storage.buckets(id,name,public) values ('images','images',true) on conflict do nothing;
create policy "images public read" on storage.objects for select using (bucket_id='images');
create policy "images upload own folder" on storage.objects for insert with check (bucket_id='images' and auth.uid()::text=(storage.foldername(name))[1]);
insert into events(name,country,category,starts_on,ends_on,description) values
('Diwali','India','Religious','2026-11-08','2026-11-12','Festival of lights; customs vary by region and community. SAMPLE DATE.'),
('Día de los Muertos','Mexico','Cultural festival','2026-11-01','2026-11-02','Families remember loved ones with altars. SAMPLE DATE.'),
('Lunar New Year','China','Cultural festival','2027-02-06','2027-02-12','Celebrated across East and Southeast Asia. SAMPLE DATE.'),
('Carnival','Brazil','Cultural festival','2027-02-05','2027-02-10','Parades and street parties that differ by city. SAMPLE DATE.'),
('Eid al-Fitr','Egypt','Religious','2027-03-09','2027-03-11','Marks the end of Ramadan; depends on moon sighting. SAMPLE DATE.'),
('Songkran','Thailand','National','2027-04-13','2027-04-15','Traditional new year with water blessings. SAMPLE DATE.');
