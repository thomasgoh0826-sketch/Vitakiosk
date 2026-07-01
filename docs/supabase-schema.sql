create extension if not exists "pgcrypto";

create table if not exists public.site_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  business_type text,
  message text,
  source text not null default 'vitakiosk_asia_site',
  status text not null default 'new'
);

create table if not exists public.site_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference_code text unique not null,
  product_type text not null check (
    product_type in (
      'vitaflow_erp',
      'vitakiosk_local',
      'vitakiosk_partner_campaign',
      'ai_lesson',
      'ai_website'
    )
  ),
  customer_name text not null,
  company_name text,
  email text,
  phone text,
  country text,
  location text,
  selected_plan text,
  estimated_users_locations text,
  message text,
  status text not null default 'inquiry_submitted',
  manual_payment_status text not null default 'not_required' check (
    manual_payment_status in (
      'not_required',
      'manual_payment_pending',
      'manual_payment_received',
      'manual_review'
    )
  ),
  admin_note text
);

create table if not exists public.site_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference_code text unique not null,
  booking_type text not null check (
    booking_type in ('book_demo', 'ai_lesson', 'consultation')
  ),
  name text not null,
  email text,
  phone text,
  topic text,
  preferred_date date,
  preferred_time text,
  participant_count integer,
  mode text check (mode is null or mode in ('online', 'in_person')),
  notes text,
  status text not null default 'requested',
  manual_payment_status text not null default 'not_required' check (
    manual_payment_status in (
      'not_required',
      'manual_payment_pending',
      'manual_payment_received',
      'manual_review'
    )
  )
);

create table if not exists public.site_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference_code text unique not null,
  business_name text not null,
  industry text,
  contact_name text,
  email text,
  phone text,
  current_website text,
  selected_package text,
  domain_status text,
  needs_copywriting boolean not null default false,
  needs_ai_chatbot boolean not null default false,
  needs_booking_form boolean not null default false,
  needs_payment boolean not null default false,
  preferred_timeline text,
  budget_range text,
  notes text,
  status text not null default 'inquiry',
  manual_payment_status text not null default 'not_required' check (
    manual_payment_status in (
      'not_required',
      'manual_payment_pending',
      'manual_payment_received',
      'manual_review'
    )
  )
);

create table if not exists public.manual_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reference_code text not null,
  related_type text not null check (related_type in ('order', 'booking', 'project')),
  amount numeric,
  currency text not null default 'MYR',
  payment_method text check (
    payment_method is null or payment_method in (
      'bank_transfer',
      'duitnow',
      'tng',
      'cash',
      'other'
    )
  ),
  payment_status text not null default 'pending_manual_review' check (
    payment_status in (
      'pending_manual_review',
      'manual_payment_pending',
      'manual_payment_received',
      'manual_review',
      'cancelled'
    )
  ),
  payment_proof_url text,
  admin_note text
);

alter table public.site_leads enable row level security;
alter table public.site_orders enable row level security;
alter table public.site_bookings enable row level security;
alter table public.site_projects enable row level security;
alter table public.manual_payments enable row level security;

drop policy if exists "site_leads_anon_insert" on public.site_leads;
drop policy if exists "site_orders_anon_insert" on public.site_orders;
drop policy if exists "site_bookings_anon_insert" on public.site_bookings;
drop policy if exists "site_projects_anon_insert" on public.site_projects;

create policy "site_leads_anon_insert"
  on public.site_leads
  for insert
  to anon
  with check (true);

create policy "site_orders_anon_insert"
  on public.site_orders
  for insert
  to anon
  with check (true);

create policy "site_bookings_anon_insert"
  on public.site_bookings
  for insert
  to anon
  with check (true);

create policy "site_projects_anon_insert"
  on public.site_projects
  for insert
  to anon
  with check (true);

grant insert on public.site_leads to anon;
grant insert on public.site_orders to anon;
grant insert on public.site_bookings to anon;
grant insert on public.site_projects to anon;
