create extension if not exists pgcrypto;

create type backup_job_status as enum ('queued','running','paused','complete','partial','failed','cancelled');
create type backup_item_state as enum ('queued','hashing','uploading','verified','failed','cancelled');
create type restore_job_status as enum ('queued','running','complete','partial','failed','cancelled');

create table public.users (
  id uuid primary key default gen_random_uuid(), email text not null, name text, avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index users_email_lower_idx on public.users (lower(email));

create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider = 'google'), provider_subject text not null, provider_email text not null,
  access_token_ciphertext text, refresh_token_ciphertext text not null, token_expires_at timestamptz,
  scopes text[] not null default '{}', root_folder_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(provider, provider_subject)
);
create index connected_accounts_user_idx on public.connected_accounts(user_id);

create table public.devices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  friendly_name text not null, device_type text not null, platform text not null, fingerprint text not null,
  capabilities text[] not null default '{}', last_connected_at timestamptz not null default now(), last_successful_backup_at timestamptz,
  created_at timestamptz not null default now(), unique(user_id, fingerprint)
);

create table public.auth_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade, token_hash text not null unique,
  expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index auth_sessions_expiry_idx on public.auth_sessions(expires_at);

create table public.backup_jobs (
  id uuid primary key, user_id uuid not null references public.users(id) on delete cascade, device_id uuid not null references public.devices(id) on delete cascade,
  kind text not null check (kind in ('manual','incremental','full','scheduled','selected')), status backup_job_status not null default 'queued',
  selected_categories text[] not null default '{}', total_files bigint not null default 0, total_bytes bigint not null default 0,
  uploaded_files bigint not null default 0, uploaded_bytes bigint not null default 0, skipped_files bigint not null default 0, failed_files bigint not null default 0,
  error_summary jsonb not null default '{}'::jsonb, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index backup_jobs_user_created_idx on public.backup_jobs(user_id, created_at desc);

create table public.backup_items (
  id uuid primary key default gen_random_uuid(), backup_job_id uuid not null references public.backup_jobs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, device_id uuid not null references public.devices(id) on delete cascade,
  client_item_id uuid not null, category text not null, original_filename text not null, original_relative_path text not null default '',
  size_bytes bigint not null check (size_bytes >= 0), mime_type text not null, last_modified_ms bigint not null,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'), drive_file_id text not null,
  state backup_item_state not null, encryption_metadata jsonb, restore_compatibility text not null default 'browser',
  verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(backup_job_id, client_item_id)
);
create index backup_items_user_category_idx on public.backup_items(user_id, category, verified_at desc);
create index backup_items_checksum_idx on public.backup_items(user_id, checksum_sha256) where state = 'verified';
create unique index backup_items_user_drive_idx on public.backup_items(user_id, drive_file_id, backup_job_id);

create table public.backup_manifests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  backup_job_id uuid not null references public.backup_jobs(id) on delete cascade, schema_version integer not null,
  drive_file_id text, checksum_sha256 text, state text not null, created_at timestamptz not null default now(), unique(backup_job_id)
);
create table public.backup_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade, backup_job_id uuid not null references public.backup_jobs(id),
  label text, item_count bigint not null default 0, size_bytes bigint not null default 0, created_at timestamptz not null default now(), unique(backup_job_id)
);
create table public.restore_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  device_id uuid references public.devices(id), snapshot_id uuid references public.backup_snapshots(id), status restore_job_status not null default 'queued',
  conflict_strategy text check (conflict_strategy in ('skip','rename','keep-both','replace')), created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.restore_items (
  id uuid primary key default gen_random_uuid(), restore_job_id uuid not null references public.restore_jobs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, backup_item_id uuid not null references public.backup_items(id),
  state text not null, verified boolean not null default false, error text, created_at timestamptz not null default now()
);
create table public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade, schedule text not null default 'manual' check (schedule in ('manual','daily','weekly')),
  wifi_only boolean not null default true, charging_only boolean not null default false, battery_threshold integer not null default 30 check (battery_threshold between 0 and 100),
  selected_categories text[] not null default '{}', encryption_enabled boolean not null default false, retention_policy jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table public.sync_checkpoints (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade, scope text not null, cursor jsonb not null, updated_at timestamptz not null default now(), unique(user_id, device_id, scope)
);
create table public.security_events (
  id bigint generated always as identity primary key, user_id uuid references public.users(id) on delete set null,
  event_type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.devices enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.backup_jobs enable row level security;
alter table public.backup_items enable row level security;
alter table public.backup_manifests enable row level security;
alter table public.backup_snapshots enable row level security;
alter table public.restore_jobs enable row level security;
alter table public.restore_items enable row level security;
alter table public.user_settings enable row level security;
alter table public.sync_checkpoints enable row level security;
alter table public.security_events enable row level security;

-- Deliberately no anon/authenticated policies: browser clients cannot query private metadata.
-- The server uses the service role and scopes every query by the user_id from an opaque session.
revoke all on all tables in schema public from anon, authenticated;

create or replace function public.finalize_backup(
  p_backup_id uuid, p_user_id uuid, p_manifest_drive_id text, p_manifest_checksum text, p_item_count bigint, p_size_bytes bigint
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from backup_jobs where id = p_backup_id and user_id = p_user_id) then
    raise exception 'backup not found';
  end if;
  insert into backup_manifests(user_id, backup_job_id, schema_version, drive_file_id, checksum_sha256, state)
  values (p_user_id, p_backup_id, 1, p_manifest_drive_id, p_manifest_checksum, 'verified')
  on conflict (backup_job_id) do update set drive_file_id = excluded.drive_file_id, checksum_sha256 = excluded.checksum_sha256, state = 'verified';
  insert into backup_snapshots(user_id, device_id, backup_job_id, item_count, size_bytes)
  select p_user_id, device_id, id, p_item_count, p_size_bytes from backup_jobs where id = p_backup_id
  on conflict do nothing;
  update backup_jobs set status = 'complete', total_files = p_item_count, total_bytes = p_size_bytes,
    uploaded_files = p_item_count, uploaded_bytes = p_size_bytes, completed_at = now(), updated_at = now()
  where id = p_backup_id and user_id = p_user_id;
  update devices set last_successful_backup_at = now(), last_connected_at = now()
  where id = (select device_id from backup_jobs where id = p_backup_id);
end;
$$;
revoke all on function public.finalize_backup(uuid,uuid,text,text,bigint,bigint) from public, anon, authenticated;
grant execute on function public.finalize_backup(uuid,uuid,text,text,bigint,bigint) to service_role;
