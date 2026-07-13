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
3. **PaePae integrations (Phase 3)** — ✅ shipped 2026-07-12: email sending (Gmail) and meeting booking (Google Calendar + Meet link, invites emailed to attendees), both behind Confirm cards, riding the owner's connected Google account. Owner one-timer: Settings → Google Calendar → **Update permissions** (grants gmail.send + calendar.events). ⏳ Remaining: **QuickBooks invoicing** — parked until the owner sets up an Intuit developer account.
4. ✅ **PaePae autonomy** — task/project/client/quote/contract create+update now execute immediately with receipt cards (logged to the dashboard action log). Confirmation reserved for invoicing today + email/calendar/onboarding-link sends when they arrive (`CONFIRM_ACTIONS` in lib/paepae/actions.ts).
5. ✅ **PaePae tasks without a project** — create_task takes optional project/client; update_task can attach/detach later.
6. ✅ **Dashboard calendar** — shipped 2026-07-11 in two passes: (a) month grid of tasks/projects/milestones/deliverables; (b) full rebuild — Apple-style month view, Week + Day views with an all-day strip and 12 AM–11:59 PM time grid, source tabs (Seaside Media / Personal / Everything), and read-only Google Calendar sync (OAuth connect in Settings, per-calendar include toggles, migration 20260711000001). Owner still to do: Google Cloud credentials + run the migration. Event BOOKING stays in item 3.
7. ✅ **Menu: Inquiries under People + notification badges** — red count pills (new inquiries on Inquiries/People, overdue tasks on My Tasks); PaePae updates and team messages join once messaging exists.
8. **Internal messaging (clients + team chat in-app)** — depends on real multi-user logins. The prerequisite plan is now written: **docs/CONTRACTOR-LOGINS-PLAN.md** (Contractors Slice B). Owner answers its 4 questions → we build B1 → messaging follows on top.

---

## 🗺️ Next up

- **Contractors — Slice B1: 🔨 BUILT 2026-07-12, pending activation** — owner
  answered the plan's questions (visibility as proposed; task edits = status +
  worker note). Shipped: migration 20260712000001 (roles, full RLS rewrite,
  column-guard triggers, invite linking, tasks.worker_note), "Invite to log in"
  on contractor pages, /auth/confirm + /welcome, the (work) My Work + My
  Profile surface, owner task-assignee picker, owner-only guards on PaePae +
  Google routes, and `scripts/security-gate.mjs`. **To activate: owner runs the
  migration → Claude runs the gate → gate must pass → first pilot invite.**
  (Also add `http://localhost:3000/**` under Supabase Auth → URL Configuration
  → Redirect URLs so invite emails land on /welcome.) Slice B2 (messaging
  groundwork, notifications) follows once B1 is live.
- **Contractors — nice-to-haves**: show a project's assigned team on the project
  page; roll assignment costs into the project budget.
- **App-wide niceties**: ✅ CMD-Z undo v1 (2026-07-12: board drags + task/
  deliverable/milestone status flips, with an undo toast; deletes excluded on
  purpose). Still open: a back button, remember-my-view state, undo on more
  action types.
- **Invoices polish**: ✅ printable/sendable layout (2026-07-12: /invoice/<token>
  private share link + print-to-PDF, migration 20260711000002 — run when
  convenient; the button explains itself until then). Still open: editing an
  invoice's line items after generation.

---

## 🧵 Loose ends (smaller, from earlier lists)

- ✅ Projects → Contracts: "New contract" button on the global page (project picker + name/amount/signed date). (2026-07-12)
- ✅ Edit a project's description — already existed via Edit project; verified and ticked. 
- Create an **inquiry directly from the quote screen** (client quick-add is in the current batch).
- My Tasks: attach to "other board related items" beyond project/client.
- Re-create the **Jared Stanton** client (owner is doing this manually; the merge with Paige Moore is not auto-repaired).

---

## ✅ Recently shipped

- Invoices: printable client-facing document at a private share link (/invoice/<token>), print/save-PDF, share control with create/copy/replace/revoke. (2026-07-12, migration 20260711000002 pending on the owner.)
- CMD-Z undo v1: app-wide ⌘Z + undo toast for board drags and task/deliverable/milestone status changes. (2026-07-12)
- Contracts: "New contract" straight from the global Contracts page. (2026-07-12)
- Contractors Slice B: full security plan written — docs/CONTRACTOR-LOGINS-PLAN.md. (2026-07-12)

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
