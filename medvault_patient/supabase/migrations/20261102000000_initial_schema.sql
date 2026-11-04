-- MedVault AI — Initial Database Schema
-- Migration: 20261102000000_initial_schema
-- Created: 2026-11-02
--
-- This migration creates the foundational tables for MedVault:
--   1. profiles
--   2. medical_records
--   3. report_analyses
--   4. medications
--   5. health_events
--
-- Key architecture & security principles:
--   - All primary keys are UUIDs.
--   - All patient data is strictly isolated by auth.uid().
--   - Cross-table ownership integrity enforced via composite foreign keys.
--   - AI analysis reports have an immutable write boundary (Edge Function / service_role only).
--   - All patient-owned tables enforce Row Level Security (RLS).
--   - Explicit permissions reset: all privileges revoked from anon, authenticated, and public.
--   - Explicit least-privilege grants to authenticated and administrative grants to service_role.
--
-- IMPORTANT: Review this file before executing against Supabase.
-- DO NOT execute automatically. Run via: Supabase Dashboard → SQL Editor, or `supabase db push`.


-- ============================================================================
-- 1. PROFILES
-- ============================================================================
-- Extends Supabase Auth users with MedVault-specific profile data.
-- One profile per auth user. The id column IS the auth user id.

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null,
  date_of_birth date,
  blood_group   text check (
    blood_group is null or blood_group in (
      'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
    )
  ),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table  public.profiles is 'Patient profiles linked 1:1 to auth.users.';
comment on column public.profiles.id is 'Same UUID as auth.users(id). Not auto-generated.';
comment on column public.profiles.blood_group is 'ABO/Rh blood group. Validated against standard types.';


-- ============================================================================
-- 2. MEDICAL_RECORDS
-- ============================================================================
-- Metadata for uploaded medical documents (prescriptions, lab reports, etc.).
-- Actual files are stored in private Supabase Storage, not in this table.

create table public.medical_records (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.profiles (id) on delete cascade,
  title             text not null,
  record_type       text not null check (
    record_type in (
      'lab_report', 'prescription', 'imaging', 'discharge_summary',
      'vaccination', 'insurance', 'other'
    )
  ),
  storage_path      text not null,
  original_filename text not null,
  mime_type         text not null,
  file_size         bigint not null check (file_size > 0),
  uploaded_at       timestamptz not null default now(),
  processing_status text not null default 'pending' check (
    processing_status in ('pending', 'processing', 'completed', 'failed')
  ),

  -- Composite unique constraint enabling child tables to enforce patient ownership
  constraint uq_medical_records_id_patient unique (id, patient_id)
);

comment on table  public.medical_records is 'Metadata for patient-uploaded medical documents. Files live in Supabase Storage.';
comment on column public.medical_records.storage_path is 'Path within the private Supabase Storage bucket. Never a public URL.';
comment on column public.medical_records.processing_status is 'Tracks AI analysis pipeline state for this record.';

create index idx_medical_records_patient_id on public.medical_records (patient_id);
create index idx_medical_records_record_type on public.medical_records (patient_id, record_type);
create index idx_medical_records_uploaded_at on public.medical_records (patient_id, uploaded_at desc);


-- ============================================================================
-- 3. REPORT_ANALYSES
-- ============================================================================
-- AI-generated analysis results for medical records.
-- Each analysis is tied to exactly one medical_record and verified patient owner.
-- Write access is restricted to trusted backend services (Edge Functions / service_role).

create table public.report_analyses (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.profiles (id) on delete cascade,
  medical_record_id   uuid not null,
  model_provider      text not null,
  model_name          text not null,
  structured_findings jsonb not null default '{}'::jsonb,
  summary             text,
  analysis_status     text not null default 'pending' check (
    analysis_status in ('pending', 'processing', 'completed', 'failed')
  ),
  created_at          timestamptz not null default now(),

  -- Composite foreign key guarantees medical_record belongs to the same patient
  constraint fk_report_analyses_medical_record
    foreign key (medical_record_id, patient_id)
    references public.medical_records (id, patient_id)
    on delete cascade
);

comment on table  public.report_analyses is 'AI-generated structured analysis of medical records. Writes managed by backend.';
comment on column public.report_analyses.structured_findings is 'JSONB containing parsed findings, values, flags, etc.';
comment on column public.report_analyses.model_provider is 'AI provider used (e.g. google, openai). No API keys stored here.';

create index idx_report_analyses_patient_id on public.report_analyses (patient_id);
create index idx_report_analyses_record_patient on public.report_analyses (medical_record_id, patient_id);


-- ============================================================================
-- 4. MEDICATIONS
-- ============================================================================
-- Patient medications extracted from prescriptions or manually entered.

create table public.medications (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles (id) on delete cascade,
  medication_name text not null,
  dosage          text,
  frequency       text,
  start_date      date not null default current_date,
  end_date        date,
  instructions    text,
  created_at      timestamptz not null default now(),

  constraint chk_medication_dates check (end_date is null or end_date >= start_date)
);

comment on table  public.medications is 'Patient medications with dosage and schedule.';
comment on column public.medications.frequency is 'Human-readable frequency (e.g. "twice daily", "every 8 hours").';

create index idx_medications_patient_id on public.medications (patient_id);
create index idx_medications_patient_end_date on public.medications (patient_id, end_date);
create index idx_medications_patient_dates on public.medications (patient_id, start_date, end_date);


-- ============================================================================
-- 5. HEALTH_EVENTS
-- ============================================================================
-- Timeline of health events: diagnoses, procedures, symptoms, etc.
-- Optionally linked to a source medical record belonging to the same patient.

create table public.health_events (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.profiles (id) on delete cascade,
  event_type       text not null check (
    event_type in (
      'diagnosis', 'procedure', 'symptom', 'vaccination',
      'lab_result', 'appointment', 'other'
    )
  ),
  title            text not null,
  description      text,
  event_date       date not null default current_date,
  source_record_id uuid,
  created_at       timestamptz not null default now(),

  -- Composite foreign key guarantees source_record belongs to the same patient.
  -- PostgreSQL 15+ ON DELETE SET NULL (source_record_id) clears only the source reference,
  -- preserving patient_id and the health event row if the medical record is deleted.
  constraint fk_health_events_source_record
    foreign key (source_record_id, patient_id)
    references public.medical_records (id, patient_id)
    on delete set null (source_record_id)
);

comment on table  public.health_events is 'Patient health timeline: diagnoses, procedures, symptoms, etc.';
comment on column public.health_events.source_record_id is 'Optional link to the medical record this event was extracted from.';

create index idx_health_events_patient_id on public.health_events (patient_id);
create index idx_health_events_timeline on public.health_events (patient_id, event_date desc);
create index idx_health_events_type on public.health_events (patient_id, event_type);
create index idx_health_events_source_record on public.health_events (source_record_id, patient_id);


-- ============================================================================
-- 6. UPDATED_AT TRIGGER
-- ============================================================================
-- Automatically updates updated_at column on row modification for profiles.
-- Runs with invoker privileges (SECURITY DEFINER removed as unnecessary).
-- search_path is safely pinned to empty to prevent search path hijacking.

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.handle_updated_at() is
  'Sets updated_at to now() before UPDATE. Runs with caller privileges and empty search_path.';

create trigger on_profiles_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();


-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Every patient-owned table has RLS enabled.
-- Patients can only access rows matching their authenticated user ID (auth.uid()).

-- --- profiles ---
alter table public.profiles enable row level security;

create policy "Patients can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Patients can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Patients can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- --- medical_records ---
alter table public.medical_records enable row level security;

create policy "Patients can view their own medical records"
  on public.medical_records for select
  to authenticated
  using (patient_id = auth.uid());

create policy "Patients can insert their own medical records"
  on public.medical_records for insert
  to authenticated
  with check (patient_id = auth.uid());

create policy "Patients can update their own medical records"
  on public.medical_records for update
  to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "Patients can delete their own medical records"
  on public.medical_records for delete
  to authenticated
  using (patient_id = auth.uid());

-- --- report_analyses ---
-- Read-only for authenticated patients.
-- No INSERT, UPDATE, or DELETE policies for authenticated clients.
-- Trusted backend services (Edge Functions) using service_role bypass RLS to write analyses.
alter table public.report_analyses enable row level security;

create policy "Patients can view their own report analyses"
  on public.report_analyses for select
  to authenticated
  using (patient_id = auth.uid());

-- --- medications ---
alter table public.medications enable row level security;

create policy "Patients can view their own medications"
  on public.medications for select
  to authenticated
  using (patient_id = auth.uid());

create policy "Patients can insert their own medications"
  on public.medications for insert
  to authenticated
  with check (patient_id = auth.uid());

create policy "Patients can update their own medications"
  on public.medications for update
  to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "Patients can delete their own medications"
  on public.medications for delete
  to authenticated
  using (patient_id = auth.uid());

-- --- health_events ---
alter table public.health_events enable row level security;

create policy "Patients can view their own health events"
  on public.health_events for select
  to authenticated
  using (patient_id = auth.uid());

create policy "Patients can insert their own health events"
  on public.health_events for insert
  to authenticated
  with check (patient_id = auth.uid());

create policy "Patients can update their own health events"
  on public.health_events for update
  to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "Patients can delete their own health events"
  on public.health_events for delete
  to authenticated
  using (patient_id = auth.uid());


-- ============================================================================
-- 8. DATABASE PRIVILEGES (Defense-in-Depth & Permissions Hardening)
-- ============================================================================
-- Step 1: Explicitly reset/revoke ALL privileges on all five tables from
--         anon, authenticated, and public roles to eliminate unintended defaults.

revoke all on table public.profiles from anon, authenticated, public;
revoke all on table public.medical_records from anon, authenticated, public;
revoke all on table public.report_analyses from anon, authenticated, public;
revoke all on table public.medications from anon, authenticated, public;
revoke all on table public.health_events from anon, authenticated, public;

-- Step 2: Grant least-privilege permissions to the authenticated role.
-- Note: Row Level Security (RLS) further filters all row operations by auth.uid().
-- Authenticated users NEVER receive DELETE on profiles or write access to report_analyses.

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.medical_records to authenticated;
grant select on table public.report_analyses to authenticated;
grant select, insert, update, delete on table public.medications to authenticated;
grant select, insert, update, delete on table public.health_events to authenticated;

-- Step 3: Grant administrative backend privileges to the service_role.
-- Trusted backend environments (e.g. Supabase Edge Functions) running with
-- the service_role key can execute full CRUD and bypass RLS to create AI report analyses.

grant all on table public.profiles to service_role;
grant all on table public.medical_records to service_role;
grant all on table public.report_analyses to service_role;
grant all on table public.medications to service_role;
grant all on table public.health_events to service_role;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
