# Seaside Media — Internal Ops Hub
## Build Spec (MVP v1)

This document is the product brief for the first version of Seaside Media's internal operations app. It describes *what* we're building and *why*. The companion file `CLAUDE.md` tells Claude Code *how* to build it (stack, conventions, guardrails). Drop both into your project root.

---

## 1. The vision (where this is headed)

A single internal web app that replaces the pile of separate tools Seaside Media currently pays for — starting with project management (Notion), and growing over time into client work, quoting, scheduling, and an in-house assistant named **PaePae**. Eventually cloned for Rock Jar.

**This is a staged build.** We are NOT building all of it at once. v1 is deliberately small so it's useful in week one, not month twelve.

---

## 2. What v1 is (and is NOT)

### In scope for v1
1. **Login** — secure email/password auth. Just the owner at first, but built so adding teammates later is trivial.
2. **Project & task board** — the Notion replacement, and the most important piece. Clients → Projects → Tasks, with a kanban board, task assignment, and due dates.
3. **Price calculator** — a flexible line-item quote builder with editable rate presets, that saves quotes against a client/project.
4. **Dashboard** — a simple landing view: active projects, upcoming due dates, recent quotes.

### Explicitly OUT of scope for v1 (do not build yet)
- PaePae / any AI features (Phase 2)
- Email, calendar, or meeting integrations (Phase 3)
- Real multi-user / team invites / client portal (Phase 4)
- Bookkeeping, video review/storage, recording (later phases)

The codebase should be *structured* so these slot in later, but none of them should be built in v1.

---

## 3. Data model (the core tables)

Keep it relational and simple. Supabase (Postgres) tables:

- **profiles** — extends Supabase auth users. `id`, `full_name`, `role`, `avatar_url`.
- **clients** — `id`, `name`, `company`, `email`, `phone`, `notes`, `created_at`.
- **projects** — `id`, `client_id` (fk), `title`, `description`, `status` (enum: `backlog`, `active`, `in_review`, `done`, `archived`), `para_category` (enum: `project`, `area`, `resource`, `archive`), `start_date`, `due_date`, `created_at`.
- **tasks** — `id`, `project_id` (fk), `title`, `description`, `status` (enum: `todo`, `in_progress`, `blocked`, `done`), `assignee_id` (fk → profiles, nullable), `priority` (enum: `low`, `medium`, `high`), `due_date`, `created_at`.
- **quotes** — `id`, `client_id` (fk), `project_id` (fk, nullable), `title`, `status` (enum: `draft`, `sent`, `accepted`, `declined`), `subtotal`, `total`, `notes`, `created_at`.
- **quote_line_items** — `id`, `quote_id` (fk), `label`, `quantity`, `unit`, `rate`, `amount`.
- **rate_presets** — `id`, `label`, `unit` (e.g. "day", "hour", "deliverable"), `default_rate`. So the calculator has reusable, editable presets instead of retyping rates.

The PARA framing (`para_category`) mirrors the owner's existing Notion PARA dashboard, so projects can be filtered/grouped the same way he already thinks.

---

## 4. Screens & flows

1. **Login** — Supabase email/password. Redirects to Dashboard on success.
2. **Dashboard** — active projects, tasks due soon, recent quotes. Quick-add buttons.
3. **Clients** — list + detail. Detail shows the client's projects and quotes.
4. **Projects** — kanban board grouped by `status` (drag to move), plus a list view and a PARA-category filter. Project detail shows its tasks.
5. **Project detail / Tasks** — tasks for the project as a checklist/board; create, assign, set due date, change status. Plus a "My Tasks" view across all projects.
6. **Price Calculator** — pick a client (optional project), add line items (pull from rate presets or enter custom), auto-compute subtotal/total, save as a quote. View and reopen saved quotes.
7. **Settings** — manage rate presets and (placeholder) team members.

Keep the UI clean and fast — an internal tool, not a marketing site. Calm, legible, keyboard-friendly.

---

## 5. Phased roadmap (the big picture)

- **Phase 1 — this MVP:** auth + clients + projects + tasks board + price calculator + dashboard. Single user.
- **Phase 2 — PaePae:** an assistant built on the Claude API, called *server-side only*, that can organize tasks, draft client messages, and summarize. Starts in "draft & suggest" mode — never sends, pays, or deletes without explicit confirmation.
- **Phase 3 — first integration:** calendar OR email (Google/Microsoft API). One at a time.
- **Phase 4 — real multi-user:** teammate invites, per-organization data isolation (RLS), and a basic client portal.
- **Phase 5+ — revisit the expensive/risky pieces:** read-only QuickBooks summary in the dashboard, possible Frame.io/NAS video review layer, then clone the whole thing for Rock Jar.

---

## 6. The non-negotiables (tie back to the owner's criteria)

- **Reliable & secure (#1):** TypeScript, Supabase Row-Level Security on every table, secrets only in server-side env vars, automatic backups via Supabase + GitHub.
- **Shareable & multi-user (#2):** browser-based web app behind a login — anyone with an account can use it from any device.
- **Easy to use (#3):** no installs (it's a URL, installable as a PWA), simple consistent UI.
- **Low maintenance (#4):** managed services (Supabase + Vercel) handle uptime, patching, and scaling. Maintenance is only needed when *adding* features.
- **PaePae built in (#5):** Phase 2, native to the app — not a bolt-on.
- **No home server (#6):** nothing runs on the owner's machine; the app lives on Vercel + Supabase, always on, maintained by them.

---

## 7. To personalize before/after the first build

- **Pricing model:** the calculator ships flexible (line items + presets). Seed `rate_presets` with the owner's real Seaside Media rates and units once the app runs.
- **Branding:** Seaside Media colors/logo can be applied once the structure works — don't block v1 on it.
