# supabase/

The database schema lives here as **SQL migration files** (in `migrations/`), so
the whole database can be rebuilt from scratch and reviewed in version control.

## How to apply these to your Supabase project (SQL Editor method)

Run the files **in order** (the numeric prefix is the order):

1. Open your project at https://supabase.com → **SQL Editor** → **New query**.
2. Copy the contents of `migrations/20260701000001_schema.sql`, paste, click **Run**.
3. Repeat for each file in order:
   - `20260701000002_rls.sql` (turns on Row-Level Security + policies)
   - `20260701000003_profile_trigger.sql` (auto-creates a profile on signup)
   - `20260701000004_seed_rate_presets.sql` (placeholder calculator rates)
4. In **Authentication → Providers**, make sure **Email** is enabled.

That's it — the schema is live with RLS on every table.

## Editing the schema later

Don't hand-edit tables in the dashboard as the only record. Instead, add a **new**
migration file here (next number up) with the change, and run it the same way.
That keeps the repo as the source of truth.
