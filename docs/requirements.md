# Herkey Maintenance: Consolidated Requirements

Merged from the owner's two source documents (in `docs/source/`) and the owner's later instructions in chat. Where the sources conflict, the **latest** wins, and the conflict is noted.

**Sources, oldest first**
1. `docs/source/organized-notes.md`: Maintenance Application – Organized Notes
2. `docs/source/key-points.md`: Construction & Maintenance App Key Points (Nov 5 2026). **Primary.**
3. Owner instructions in chat (Nov 6 2026). **Override both where stated.**

---

## 1. Business
- Company name: **Herkey Maintenance**. "Christian Contracting" may become the legal or brand name; keep the name in one config value.
- HerkeyHouse may become a second business unit later. Don't build for it now, but don't hard-code a single business in a way that blocks it.
- Region: Lancaster, PA area (sample addresses). Company timezone: `America/New_York`.

## 2. Two apps, plus web versions (owner, Nov 6)
| App | Who | Must have |
|---|---|---|
| **Customer app** | Customers | Request service, pick a preferred time, follow progress, review estimates (accept/decline), view invoices, cancel a request |
| **Crew & Office app** | Crew, Crew Lead, Finance, Admin | Job board + claim, my jobs + status updates, time clock, expenses, scheduling, approvals, estimates → invoices, KPIs, team and roles, raw data tables |

- **Sign-in with Google and with Apple** in both apps (owner, Nov 6). Email magic link is a nice-to-have fallback.
- **A website version of each app** as a backup to the Glide apps (owner, Nov 6). It must be installable to a phone home screen (PWA) and work on Android and iPhone.
- The two apps must share **one** source of truth. A customer request appears on the crew job board, and crew updates appear on the customer's tracker.
- Visual direction: dark near-black with gold accent and an animated background. The approved look is in `prototype/customer-portal.html` and `prototype/crew-portal.html` (open them in a browser).

> **Conflict to resolve (D1 in HANDOFF.md).** The key points prefer Glide and say the custom app must not run as a second live system. The owner now wants a website backup of each app. Both must use the same data, or the "backup" will drift. See HANDOFF.md §3.

## 3. Roles and access (key points §Users and access)
| Role | Can do |
|---|---|
| Customer | Submit requests; view **own** jobs, progress, estimates, invoices |
| Crew | View assigned jobs and claimable jobs; claim; update progress; record time and expenses; draft estimates |
| CrewLead | Everything Crew can, plus assign and schedule crew and approve expenses and flagged time |
| Finance | Expenses, invoices, time reports, financial reports; approve expenses |
| Admin | Users, roles, configuration, reports, raw tables |

Rules:
- One profile per person. The role is set by Admin; **nobody can change their own role**. New sign-ups default to **Customer**.
- Protect data **at the database level**. Hiding things in the UI is not access control.
- Customers see only their own records. Crew see jobs assigned to them plus the open job board.
- Before a job is claimed, crew see category, priority, preferred date and the **street name only**. The customer's name, phone and exact address appear after claim.
- Two people must not be able to claim the same job. The claim must be atomic.
- Raw tables are Admin only.

## 4. Job flow
`Requested → Accepted → Scheduled → In Progress → Completed`, plus `On Hold` and `Canceled` with controlled permissions.
- Claiming sets the crew member and moves the job to **Accepted**.
- Every important action writes to an **activity log**. Each entry is flagged visible or not visible to the customer.
- Estimate and invoice states are tracked **separately** from job status.
- Completion approval: not required for now (open question).

## 5. Estimates and invoices
- Estimate: `Draft → Sent → Accepted | Rejected`. Crew or authorized staff create it; the customer accepts or rejects it.
- Invoice: `Draft → Unpaid → Paid | Void`. It can be created from an accepted estimate (copy the lines).
- Line items: description, quantity, unit price. **Money is stored as integer cents.**
- Numbering, tax, payment terms, document format and the payment provider (Stripe was mentioned) are **open**. Leave room for them; don't build payments yet.

## 6. Time and expenses
- Clock in and out, optionally against a job. Record a location check result (distance to the job site and within/outside a geofence of 200 m by default). Location is **supporting evidence, not proof**.
- Clock-ins outside the geofence are allowed but flagged **Needs Review**. CrewLead, Finance or Admin approves or rejects them.
- Expenses: crew submit, then CrewLead, Finance or Admin approves or rejects. **Spending reports count approved expenses only.**
- Overtime: 1.5× after 40 h/week. Breaks, rounding, corrections and payroll export are **not final**.

## 7. Reports (key points §Management measures)
- **Open jobs**: not Completed and not Canceled.
- **Completed this month**: uses `completed_at` in the company timezone.
- **Approved spending**: approved expenses in the period.
- **Outstanding invoices**: total of Unpaid invoices (no partial payments yet).

## 8. Data rules
- Stable IDs and relations; no copying customer or crew details across tables, except an email kept for Glide row-owner security.
- Store timestamps in UTC; display them in company time.
- One time table, one expense table. No duplicate user, cost or invite tables.

## 9. Not in the first release
Job photos and media, automated SMS and email, online payments, accounting and Google connections, advanced payroll, multi-business. Build none of these unless the owner moves them in.

## 10. Done means (key points §Completion checks)
- The full request-to-completion flow passes with separate Customer, Crew, CrewLead, Finance and Admin accounts.
- Each account is blocked from other people's private data, **tested by trying**.
- Reports reconcile with the underlying rows.
- No "sent" message or "collected" payment is claimed unless it really happened.
