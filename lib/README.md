# lib/

Shared, non-UI code: the Supabase client setup, helper functions, and validation
schemas. Anything that touches secrets or the database lives here (server-side),
never in a browser component.

Coming in Phase 1: `supabase/` clients (server + browser) and shared helpers.
