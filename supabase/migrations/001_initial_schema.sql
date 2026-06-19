-- Eval Co-pilot — initial schema + Row-Level Security
-- Run this in the Supabase SQL editor BEFORE anything else.
-- Design: Option A (paste-the-output). The builder pastes each output; the tool grades it.

create table if not exists features (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists golden_cases (
  id                  uuid primary key default gen_random_uuid(),
  feature_id          uuid not null references features(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  input               text not null,
  expected            text not null,
  is_calibration      boolean not null default false,
  calibration_verdict text check (calibration_verdict in ('pass','fail')),
  created_at          timestamptz not null default now()
);

create table if not exists rubrics (
  id          uuid primary key default gen_random_uuid(),
  feature_id  uuid not null references features(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  dimensions  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists runs (
  id                   uuid primary key default gen_random_uuid(),
  feature_id           uuid not null references features(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  rubric_id            uuid references rubrics(id),
  status               text not null default 'pending'
                         check (status in ('pending','running','complete','error')),
  total_cases          int,
  passed_cases         int,
  calibration_accuracy numeric(4,3),
  created_at           timestamptz not null default now()
);

create table if not exists grades (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references runs(id) on delete cascade,
  case_id          uuid not null references golden_cases(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  actual_output    text not null,
  verdict          text not null check (verdict in ('pass','fail')),
  dimension_scores jsonb not null default '[]'::jsonb,
  overall_reason   text,
  created_at       timestamptz not null default now(),
  unique (run_id, case_id)
);

alter table features     enable row level security;
alter table golden_cases enable row level security;
alter table rubrics      enable row level security;
alter table runs         enable row level security;
alter table grades       enable row level security;

create policy "owner_all_features" on features
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "owner_all_golden_cases" on golden_cases
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "owner_all_rubrics" on rubrics
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "owner_all_runs" on runs
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "owner_all_grades" on grades
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists idx_golden_cases_feature on golden_cases(feature_id);
create index if not exists idx_rubrics_feature      on rubrics(feature_id);
create index if not exists idx_runs_feature         on runs(feature_id);
create index if not exists idx_grades_run           on grades(run_id);
create index if not exists idx_grades_case          on grades(case_id);
