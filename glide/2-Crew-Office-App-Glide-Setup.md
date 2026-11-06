# Herkey Maintenance: Crew & Office App (Glide)

The staff app for **Crew, Crew Lead, Finance and Admin**. It uses the **same data file** as the Customer app, so customer requests land on the Job board, and every claim, schedule change and status update shows up on the customer's tracker.

> Glide's menus change from time to time. If a label below doesn't match what you see, look for the closest equivalent.

---

## 1. Connect the data

Create this app from the **same** Google Sheet / OneDrive file you used for the Customer app (`Herkey-Maintenance-Glide-Data.xlsx`). Don't make a copy.

## 2. Users, sign-in and roles

| Setting | Value |
|---|---|
| User profiles table | **Staff** |
| Sign-in | Restrict to emails in the Staff table. Customers can't get in. |
| Roles | Turn on roles using the `Role` column: Crew, CrewLead, Finance, Admin |
| First step | Change the Admin row's `Email` (owner@example.com) to **your** email |

Only Admin should be able to edit the `Role` column. Make it read-only or hidden for everyone else so nobody can promote themselves.

## 3. Privacy

| Table | Protection |
|---|---|
| TimeEntries | Row owner `UserEmail`, so crew see only their own time. Crew Lead, Finance and Admin need everyone's, so add those roles as row owners too if your Glide plan supports role-based row owners. Otherwise show these screens only to those roles and treat it as a known gap |
| Expenses | Same approach, with `SubmittedByEmail` |
| Staff `HourlyRateCents` | Show only to Finance and Admin |
| Jobs: customer name and exact address | Show on the job screen only when `CrewEmail` = signed-in user, or the role is CrewLead/Admin. Before claiming, crew see the Category, Priority, PreferredDate and the street name only |

## 4. Computed columns to add

| Table | Column | Type | How |
|---|---|---|---|
| Jobs | `Customer` | Relation | `CustomerID` → Customers.`CustomerID` (then Lookups for Name, Phone) |
| Jobs | `Crew` | Relation | `CrewEmail` → Staff.`Email` (Lookup `Name`) |
| Jobs | `Status Info`, `Step`, `Is Open` | Relation/Lookup | Same as in the Customer app (JobStatuses) |
| Jobs | `Priority Sort` | Lookup | Relation `Priority` → Priorities.`SortOrder` |
| Jobs | `Is Unclaimed` | If-Then-Else | if `CrewEmail` is empty and `Status` = Requested → true |
| Jobs | `Is Mine` | If-Then-Else | if `CrewEmail` = signed-in user's email → true |
| Estimates / Invoices | `Lines`, `Total Cents`, `Total` | Relation + Rollup + Math | Same as in the Customer app |
| Expenses | `Amount` | Math | `AmountCents / 100` |
| TimeEntries | `Hours` | Math | `(ClockOut - ClockIn)` in hours (use Glide's date-difference math) |
| Staff | `Hours This Week` | Rollup | Relation to TimeEntries (by `UserEmail`), sum `Hours`, filtered to the last 7 days and Review ≠ Rejected |
| Staff | `Gross Pay` | Math | Regular hours × rate, plus overtime past `OvertimeAfterHours` (from Settings) × rate × 1.5, then ÷ 100 |

## 5. Tabs by role

Use **visibility conditions** on each tab: *Role is …*.

| Tab | Crew | Crew Lead | Finance | Admin |
|---|:-:|:-:|:-:|:-:|
| Today (clock + my next jobs) | ✓ | ✓ | | |
| Job board | ✓ | ✓ | | ✓ |
| My jobs | ✓ | ✓ | | |
| Jobs (all) | | ✓ | | ✓ |
| Schedule (calendar) | | ✓ | | ✓ |
| Approvals | | ✓ | ✓ | ✓ |
| Estimates & invoices | | | ✓ | ✓ |
| Time & payroll | | limited | ✓ | ✓ |
| Expenses (submit) | ✓ | ✓ | | |
| Overview (KPIs) | | ✓ | ✓ | ✓ |
| Team & access | | | | ✓ |
| Data (raw tables) | | | | ✓ |

### Today
- Clock card. **Clock in** adds a TimeEntries row (`UserEmail`, `ClockIn` = now, `CustomerID` = the job's customer, `Review` = Open). **Clock out** sets `ClockOut` = now on the user's open entry (filter: UserEmail = me and ClockOut is empty).
- Location check: Glide's support for reading phone location varies by plan and component. If you can't capture it, have crew pick the job they're at and record `LocationCheck` = "Not checked". The key points treat location as supporting evidence only, not proof.
- Collection: Jobs where `Is Mine` and `Is Open`, sorted by PreferredDate.

### Job board
- Collection: Jobs where `Is Unclaimed`, sorted by `Priority Sort` then CreatedAt.
- **Claim** button: Set column values `CrewEmail` = me, `CrewUserID` = my UserID, `CrewName` = my Name, `Status` = Accepted, `AcceptedAt` = now, then add an ActivityLog row "Claimed by {Name}" (VisibleToCustomer = true, CustomerEmail = the job's CustomerEmail).
- Preventing double claims: show the button only while `CrewEmail` is empty. Two people tapping at the same moment can still collide. If that matters, run the claim through a Glide workflow that checks `CrewEmail` again before writing.

### My jobs / job detail
Buttons, each writing `Status` and adding an ActivityLog row:
- **Start work** → In Progress
- **Put on hold** → On Hold
- **Mark complete** → Completed, `CompletedAt` = now

Also on the job screen:
- **Add note**: an ActivityLog row (VisibleToCustomer is a toggle, so crew can keep internal notes private).
- **Log expense**: a form adding to Expenses (SubmittedByEmail = me, JobID, Status = Submitted).
- **Draft estimate**: a form adding to Estimates (Status = Draft, CustomerEmail from the job), then EstimateLines rows.

### Jobs (all) and Schedule (Crew Lead, Admin)
- Jobs: a collection with a Status filter. The detail screen has choice fields for crew (sets CrewEmail/CrewName), Status, PreferredDate and TimeSlot.
- Schedule: a **Calendar** collection on Jobs using `PreferredDate`, filtered to Scheduled and In Progress.

### Approvals (Crew Lead, Finance, Admin)
- Expenses where Status = Submitted: **Approve** / **Reject** (set Status and `ReviewedByEmail` = me).
- TimeEntries where Review = Needs Review: **Approve** / **Reject**.

### Estimates & invoices (Finance, Admin)
- Estimate Draft → **Send** (Status = Sent, SentAt = now). The customer sees it in their Billing tab.
- Accepted estimate → **Create invoice**: add an Invoices row (Status = Draft, EstimateID, JobID, CustomerEmail), then copy the lines into InvoiceLines.
- Invoice: **Send** (Unpaid), **Mark paid** (PaidAt, PaymentMethod), **Void**.

### Overview (KPIs), as defined in the key points
- **Open jobs:** count of Jobs where `Is Open`.
- **Completed this month:** Jobs where CompletedAt is in this month (company timezone in Settings).
- **Approved spending:** sum of Expenses `Amount` where Status = Approved, in the period.
- **Outstanding invoices:** sum of Invoices `Total` where Status = Unpaid.

### Team & access (Admin)
- A Staff collection with an **Invite** form (adds a Staff row with Role). Glide sends the sign-in, so you don't need a separate invitation system.
- Phone invites: Glide sign-in is email-based. "Phone invite" can mean texting someone the app link manually until SMS is decided.

### Data (Admin)
- One **Table**-style collection per table (Jobs, Expenses, TimeEntries, Invoices…). That covers the "raw rows and columns" request from the notes.

## 6. Look and feel
- Dark theme, gold accent `#C49A50`, background `#0B0C0E`.
- Keep the Today tab first for crew. Their most frequent actions (Clock in, Claim, Mark complete) should be one tap from opening the app.

## 7. Test with five accounts
Following the key points' completion checks:
1. Sign in as **Crew** (marcus.lee@example.com): you see only your own time entries, and the job board hides exact addresses.
2. Claim J-1047. The customer app should show it as Accepted, with Marcus as the crew.
3. Sign in as **Crew Lead** (renee.carter@example.com): approve X-510 and the flagged time entry for Eli.
4. Sign in as **Finance** (pat.kim@example.com): send EST-2052, then mark INV-3018 paid. The Overview totals should change.
5. Sign in as **Admin** (your email): change a role, then confirm the person's tabs change.
6. Replace or delete the sample rows before going live.
