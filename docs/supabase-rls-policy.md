# Supabase RLS Policy

All public intake tables must have row level security enabled.

Public website permissions:

- anonymous users may insert into `site_leads`
- anonymous users may insert into `site_orders`
- anonymous users may insert into `site_bookings`
- anonymous users may insert into `site_projects`
- anonymous users must not select all records
- anonymous users must not update records
- anonymous users must not delete records

`manual_payments` has RLS enabled but no anonymous insert policy. Payment status
is managed later through the backend/admin flow only.

The public website should submit forms to the backend `/api/site/*` endpoints.
The backend validates and sanitizes input before inserting into Supabase.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code, screenshots, docs,
logs, or GitHub. If direct frontend insert is intentionally enabled later, only
the anon key may be used, and the insert-only RLS policies must be reviewed.
