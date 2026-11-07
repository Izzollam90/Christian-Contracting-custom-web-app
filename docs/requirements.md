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

- **Sign-in: Google and passkey only** in both apps (owner, Nov 6, later message, **replaces** the earlier Google + Apple request). Remove Apple, Facebook, X, email+password and magic link. New accounts are created with Google; after the first sign-in the app offers "Add a passkey" (Face ID / fingerprint / phone screen lock), and from then on either method works.
- **Two-factor authentication** (owner, Nov 6). See §11.
- **Web app first** (owner, Nov 6). The installable websites are the product for now. App-store (Play Store / App Store) builds come later, as a separate project. The websites must install to a phone home screen (PWA) on Android and iPhone.
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

## 11. Two-factor authentication (owner, Nov 6; amended same day: SMS allowed, passkeys/email-OTP excluded; sign-in is Google + email/password only — supersedes the earlier "Google and passkey only" note in HANDOFF)
Goal: nobody can move money or change who has access with just a stolen sign-in.

- **Method:** authenticator-app codes (TOTP) **or SMS text** (Supabase Auth MFA phone factor), via Supabase Auth MFA. **No passkeys, no email-OTP.** Allow at least two factors per person so a lost phone isn't a lockout.
- **Sign-in methods:** Google OAuth and email+password only. (Apple, Facebook, X, magic link and passkeys are removed on the product branch.)
- **Who must use it:**
  | Role | 2FA |
  |---|---|
  | Admin, Finance | **Required to use the app at all.** After sign-in, they can't open any screen until they set up 2FA, then enter a code on each new session |
  | CrewLead, Crew | Optional, but **required at the moment of a money or approval action** (step-up) |
  | Customer | Optional, but **required at the moment of a money action** (step-up) |
- **Money and access actions that require a verified 2FA session (`aal2`)**:
  - Customer: accepting an estimate; any future online payment; changing their email or service address.
  - Staff: sending an invoice, marking it paid, voiding it; creating an invoice from an estimate; approving or rejecting expenses; approving flagged time; changing roles, hourly rates or active status; payroll export; editing settings.
- **Enforce it in the database, not just the screens.** The RPCs and policies for the actions above must check `auth.jwt() ->> 'aal' = 'aal2'` and refuse otherwise. The UI then asks for the code ("Enter the 6-digit code from your authenticator app") and retries.
- **Recovery:** an Admin can remove a person's 2FA factors (server-side, logged) after verifying who they are in person or by phone. Removing an Admin's own factors needs a second Admin, or the owner using the Supabase dashboard.
- **Tests:** add RLS/RPC checks proving each action above fails with an `aal1` session and succeeds with `aal2`.

## 10. Done means (key points §Completion checks)
- The full request-to-completion flow passes with separate Customer, Crew, CrewLead, Finance and Admin accounts.
- Each account is blocked from other people's private data, **tested by trying**.
- Reports reconcile with the underlying rows.
- No "sent" message or "collected" payment is claimed unless it really happened.
