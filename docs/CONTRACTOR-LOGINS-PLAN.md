# Contractors Slice B — Team Logins & Permissions (PLAN)

**Status: plan for review — no code yet.** This is the security-critical step
where the app stops being single-user, so per CLAUDE.md it gets a deliberate,
reviewed plan before anything is built. Read it top to bottom once; the
"Decisions Jeremy makes" section at the end is the part that needs your input.

---

## 1. Where we are today (and why this needs care)

- The whole app runs on **one honest rule**: *any logged-in user can see and
  change everything* (`for all to authenticated using (true)` on every table).
  That was the right v1 call — there's exactly one account: Jeremy's.
- Contractors already exist as **records** (directory, rates, project
  assignments, self-onboarding link), and the `contractors.user_id` column is
  already in place, waiting to link a contractor record to a real login.
- The moment we create a second login, that v1 rule becomes a hole: a
  contractor could read client budgets, everyone's rates, invoices — or
  delete projects. **So logins and the permission rewrite must ship together,
  in one migration. Never accounts first, permissions later.**

## 2. What a contractor should experience (proposed)

Logs in with their email → lands on **"My Work"**:

| Can see | Can do | Cannot see |
|---|---|---|
| Projects they're assigned to (title, status, dates, description) | Update status of tasks assigned to them | Any money: budgets, quotes, invoices, contracts, the calculator |
| Their own tasks + each assigned project's task list | Edit their own contact details + rates | Other people's rates or contact details |
| Deliverables/milestones on assigned projects | — | Clients' contact details, notes, inquiries |
| Their own profile, rates, assignments | — | Other projects, PaePae, Settings, dashboards |

PaePae stays **owner-only** in this slice (her tools read everything; scoping
her per-role is its own later project).

## 3. How it works technically

**Accounts.** Supabase Auth (same email/password system Jeremy uses — Supabase
sends the invite email itself, so this needs **no email integration**). Flow:
on a contractor's page the owner clicks **"Invite to log in"** → a server
action calls Supabase's admin invite (service-role, server-side only) → the
contractor gets an email, sets a password → a signup trigger links the new
auth user to their contractor record via `contractors.user_id` and stamps
`profiles.role = 'contractor'`.

**Roles.** `profiles.role` becomes meaningful: `'owner'` (Jeremy — set by
migration) and `'contractor'` (set by the invite trigger). A tiny SQL helper
`app_role()` reads the caller's role inside policies.

**The permission rewrite (the heart of it).** One migration replaces every
`using (true)` policy with role-based rules:

- **Owner: unchanged** — full access to everything, exactly as today.
- **Contractor:**
  - `contractors`: see/edit **own row only** (contact fields + rates).
  - `project_contractors`: see own assignments.
  - `projects`: `select` only where an assignment links them.
  - `tasks`: `select` on assigned projects; `update` **status only** on tasks
    assigned to them (`assignee_id`); no create/delete in B1.
  - `deliverables`, `milestones`: `select` on assigned projects.
  - **Everything else** (`clients`, `quotes`, `quote_line_items`, `invoices`,
    `contracts`, `expenses`, `budget_lines`, `rate_presets`, `pricing_*`,
    `paepae_actions`, `google_*`, `onboarding_submissions`, `inquiries`):
    **no policy → no access**. Deny-by-default is the safety net.
- The app UI also adapts (contractors get the "My Work" surface, not the
  owner sidebar) — but **RLS is the real wall; the UI is just politeness.**
  Even a bug in the UI can't leak data past the database rules.

**Phasing.**
- **B1 (one PR):** roles + invite flow + full policy rewrite + "My Work"
  read-only surface + own-task status updates. Smallest safe useful slice.
- **B2 (later):** task comments/messaging groundwork, notifications,
  per-project file/deliverable uploads — the "team member messages" part of
  the internal-messaging item builds on this.

**Test gate before merge** (with a throwaway contractor account):
1. Contractor sees *only* assigned projects; zero rows from money tables.
2. Contractor can flip own task status; cannot touch someone else's task.
3. Contractor cannot read another contractor's rates (API call, not just UI).
4. Jeremy's experience is byte-for-byte unchanged.
5. The public pages (onboarding links, shared quotes/invoices) still work.

## 4. Effort & risk

Roughly one focused session: ~1 migration (+ trigger), ~2 server actions,
~3–4 pages/components for "My Work", plus the test gate. The risk is not the
code volume — it's policy mistakes, which is why the matrix above is explicit
and the test gate is non-negotiable.

## 5. Decisions Jeremy makes before we build

1. **Scope check:** is the "can see / cannot see" table above right? Anything
   a contractor should additionally see (e.g. client *name* on a project?) or
   definitely not see?
2. **Task edits:** status-only in B1 (proposed), or also due dates/notes?
3. **Who gets invited first?** Pick one real contractor as the pilot.
4. **Timing:** build now, or after the current feature push settles?

Answer those four and B1 is ready to build in one go.
