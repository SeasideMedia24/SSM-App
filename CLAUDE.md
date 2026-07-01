# CLAUDE.md — Seaside Media Internal Ops Hub

This file is read at the start of every Claude Code session. It defines the stack, conventions, and hard rules for this project. Read `BUILD-SPEC.md` for *what* we're building; this file is *how*.

---

## Project summary

An internal web app for Seaside Media (a video production agency). v1 replaces Notion for project management and adds a price calculator. It will grow into an assistant ("PaePae") and integrations later. Built and maintained primarily by a non-engineer owner directing you — so favor clarity, standard patterns, and explained decisions over cleverness.

**Scope discipline is critical.** Build only what `BUILD-SPEC.md` lists as in-scope for v1. Do not build PaePae, integrations, multi-tenant, or billing in v1. Structure the code so they slot in later, but don't implement them.

---

## Tech stack (do not swap without asking)

- **Framework:** Next.js (App Router) with **TypeScript**.
- **Styling:** Tailwind CSS. Simple, consistent components; no heavy UI kit unless asked.
- **Backend / database / auth / storage:** **Supabase** (Postgres, Supabase Auth, Storage, Row-Level Security).
- **Hosting:** **Vercel** (auto-deploy from GitHub `main`).
- **Version control:** **GitHub**. Commit in small, logical steps with clear messages.
- **AI (Phase 2 only):** Anthropic Claude API, called **only from server-side route handlers**, never the browser.

Use latest stable versions; don't pin to outdated ones. If a library decision is non-obvious, explain the tradeoff in one or two sentences and pick a sensible default rather than stalling.

---

## Architecture conventions

- Use the Next.js **App Router** with server components by default; client components only where interactivity needs them.
- All database access and any secret-using logic goes through **server-side code** (route handlers / server actions). The browser never holds secrets.
- Keep a single typed Supabase client setup; generate and use TypeScript types from the database schema.
- Organize by feature: `app/`, `components/`, `lib/` (supabase client, helpers), `types/`. Keep files small and named for what they do.
- Database changes happen via **SQL migration files** committed to the repo (not hand-edited in the dashboard only), so the schema is reproducible.

---

## Security rules (HARD — never violate)

1. **Secrets only in environment variables**, server-side. Never commit `.env`. Never put the Supabase service-role key or any Anthropic API key in client-side code.
2. **Row-Level Security (RLS) ON for every table.** Never disable RLS to "make it work." Write explicit policies. For v1 (single user), policies allow access to authenticated users; structure them so per-organization isolation can be added in Phase 4.
3. **Validate input server-side**, not just in the UI.
4. **No destructive or irreversible action without explicit user confirmation** in the UI (deleting clients/projects/quotes, bulk changes).
5. Use the Supabase client's parameterized queries — never build raw SQL strings from user input.
6. When unsure whether something is safe, **stop and ask** rather than guessing.

---

## Working style with the owner

- The owner is capable but non-technical. **Explain plans in plain language before doing big things**, and summarize what changed after.
- Prefer **Plan Mode for anything multi-file or structural** — show the approach, get a nod, then build.
- Make **small, reviewable commits**. One feature or fix per commit.
- When you hit an ambiguous product decision (not a coding detail), ask a short question rather than inventing a requirement.
- Don't over-engineer. The simplest version that is correct and secure wins.
- Leave brief comments where a non-engineer might later need to understand or tweak something (e.g. where rates, statuses, or labels are configured).

---

## Definition of done for a feature

- Builds and runs locally with no errors, and type-checks clean.
- Works against the real Supabase schema with RLS enabled.
- Basic happy-path manually verified; obvious error states handled (empty states, failed loads).
- Committed to GitHub with a clear message.
- No secrets in the diff.

---

## Out of scope reminder (v1)

Do NOT build: PaePae/AI, email, calendar, meetings, video storage/review, recording, bookkeeping, real team invites, client portal, or payments. These are later phases in `BUILD-SPEC.md`.
