-- Create app_versions table to store details of the latest app versions.
create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  version_code integer not null,
  version_name text not null,
  min_version_code integer not null,
  update_url text not null default 'https://play.google.com/store/apps/details?id=com.chhaperia.app',
  force_update boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.app_versions enable row level security;

-- Drop policy if exists and create new read access policy
drop policy if exists "Allow public read access to app_versions" on public.app_versions;
create policy "Allow public read access to app_versions"
  on public.app_versions
  for select
  to public
  using (true);

-- Insert initial version code entry
insert into public.app_versions (version_code, version_name, min_version_code, update_url)
values (22, '1.21', 22, 'https://play.google.com/store/apps/details?id=com.chhaperia.app');
