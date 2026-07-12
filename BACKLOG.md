# BACKLOG — Seaside Media Ops Hub

Running, prioritized list of revisions so we can pick up where we left off.
Newest direction from the owner drives priority. Check items off as they ship.

---

## 🔨 Current batch — ✅ shipped (2026-07-09)

All done except PaePae invoices (blocked on the Invoices feature — see Next up):
Inquiries archived dropdown · remove Timeline (both tabs) · deliverables overview
inline status + per-project dropdowns · contracts whole-row clickable · calculator
quick-add client · calculator per-section Reset · PaePae greeting copy · PaePae can
draft contracts. (Details under "Recently shipped".)

---

## 🔨 Current batch (owner, 2026-07-11)

1. ✅ **Calculator: whole-calculator Reset button** — in the Totals card (new-quote mode), two-step confirm, clears the saved draft too.
2. ✅ **Calculator: saved quotes rework** — top dropdown removed; the list shows the 5 newest with a Notion-style "Past quotes" toggle for the rest.
3. **PaePae integrations (Phase 3 — blocked on the owner's accounts)**: email sending, QuickBooks invoicing, Google Calendar meeting BOOKING (read-only viewing shipped — see item 6; booking needs a write scope + confirm gate). Owner to-dos, in order: (a) Google Cloud OAuth credentials → unlocks calendar view NOW and later booking + Gmail sending on the same connection; (b) run migration 20260711000001; (c) QuickBooks developer account when we get there. All the credential-free groundwork is done (see "PaePae full visibility" under Recently shipped).
4. ✅ **PaePae autonomy** — task/project/client/quote/contract create+update now execute immediately with receipt cards (logged to the dashboard action log). Confirmation reserved for invoicing today + email/calendar/onboarding-link sends when they arrive (`CONFIRM_ACTIONS` in lib/paepae/actions.ts).
5. ✅ **PaePae tasks without a project** — create_task takes optional project/client; update_task can attach/detach later.
6. ✅ **Dashboard calendar** — shipped 2026-07-11 in two passes: (a) month grid of tasks/projects/milestones/deliverables; (b) full rebuild — Apple-style month view, Week + Day views with an all-day strip and 12 AM–11:59 PM time grid, source tabs (Seaside Media / Personal / Everything), and read-only Google Calendar sync (OAuth connect in Settings, per-calendar include toggles, migration 20260711000001). Owner still to do: Google Cloud credentials + run the migration. Event BOOKING stays in item 3.
7. ✅ **Menu: Inquiries under People + notification badges** — red count pills (new inquiries on Inquiries/People, overdue tasks on My Tasks); PaePae updates and team messages join once messaging exists.
8. **Internal messaging (clients + team chat in-app)** — depends on real multi-user logins (Contractors Slice B / client accounts). Plan it together with that security work.

---

## 🗺️ Next up

- **Contractors — Slice B (security-critical, needs its own plan)**: contractor
  **logins** + role-based RLS so a contractor sees only their own assignments and
  rate. (Self-service profile onboarding via link is already done — this is just
  the accounts + permission model.) The `contractors.user_id` column is in place.
  This is the real multi-user surface — plan and review it deliberately.
- **Contractors — nice-to-haves**: show a project's assigned team on the project
  page; roll assignment costs into the project budget.
- **App-wide niceties**: CMD-Z undo, a back button, remember-my-view state.
- **Invoices polish** (later): a printable/sendable invoice layout (like the shareable
  quote link), and editing an invoice's line items after generation.

---

## 🧵 Loose ends (smaller, from earlier lists)

- Projects → Contracts: a **"Create new"** contract button.
- **Edit a project's description** (the one created from the inquiry).
- Create an **inquiry directly from the quote screen** (client quick-add is in the current batch).
- My Tasks: attach to "other board related items" beyond project/client.
- Re-create the **Jared Stanton** client (owner is doing this manually; the merge with Paige Moore is not auto-repaired).

---

## ✅ Recently shipped

- PaePae full visibility + expanded hands (2026-07-11): new read tools (team/contractors, invoices, deliverables, milestones, inquiries); briefing now includes overdue invoices + new-inquiry count; new AUTO actions — create/update deliverables & milestones, assign a team member to a project, update contracts, and RECORD quote/invoice statuses (only when the owner says the event happened; timestamps kept in step). Confirm gate still on invoicing only.

- Contractors: full/half/hourly rates + self-onboarding link (no login). (Migration 20260709000003.)
- Contractors/Team (Slice A): directory (internal/external/employees), rates, and project assignments. (Migration 20260709000002.)
- PaePae: can create invoices from a quote (gated), via the shared invoice helper.
- Invoices: generate from a quote, /invoices list + detail, draft→sent→paid, overdue flag, dashboard "Overdue invoices" box. (Migration 20260709000001 applied.)
- Inquiries: archived section is a collapsible dropdown.
- Projects: removed the Timeline view (global tab + per-project tab); milestone data untouched.
- Deliverables overview: per-project dropdowns + inline status editing.
- Contracts: whole row is clickable → opens the contract.
- Calculator: quick-add a client from the quote screen + per-section Reset buttons.
- PaePae: greeting is "Heyyy, I'm PaePae!"; can now draft contracts (gated); tells the owner invoices are a later phase.
- PaePae: propose→confirm→execute write gate + hardening + grounded "briefing" tool.
- Onboarding: an invite can never overwrite an existing client.
- Dashboard: PaePae action log ("last 5 days") + clickable metric drill-ins.
- Inquiries: one-click archive + archival view.
- Projects: per-project sections + filter for Timeline & Deliverables.
- My Tasks: create tasks attached to a project, a client, or nothing.
- Budgets: cost derived from the linked quote, margin shown separately.
- Quick wins: save empty quotes, PaePae pinned bottom-left, foldable Done, inquiry chart axis.
