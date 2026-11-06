# Lancaster Consolidated Maintenance – Apps

Two separate apps built from the *Maintenance Application – Organized Notes* and the *Construction & Maintenance App Key Points*, styled to match the Lancaster Consolidated Maintenance website (near-black, gold, Archivo / Cormorant Garamond / Inter, animated background).

| File | Who it's for | Live preview (private until shared) |
|---|---|---|
| `customer-portal.html` | Customers | https://claude.ai/artifact/CmT9xHGcVvZzAkBMBqvR2q |
| `crew-portal.html` | Crew, Crew Lead, Finance, Admin | https://claude.ai/artifact/D4Y5B3ju1HQiMB4nTHfGNH |
| `maintenance-app.html` | First all-in-one prototype (kept for reference) | https://claude.ai/artifact/QNZrsZUS6FesQHf1pANeap |

Each file is self-contained with no build step. Open it in a browser.

## Customer Portal
- Home with a live "happening now" tracker (Requested → Accepted → Scheduled → In Progress → Completed)
- Four-step service request: category, details and urgency, preferred day and time, review
- My jobs with crew, schedule and activity timeline; cancel a request
- Estimates (accept or decline) and invoices; online payment marked "coming soon"

## Crew & Office
- **Crew:** geofenced time clock (200 m) with flagged clock-ins, job board with claim (address hidden until claimed), my jobs with status updates, notes and estimate drafts, expense submission
- **Crew Lead:** overview, all jobs with assign/schedule/status, weekly schedule board, approvals for expenses and flagged time
- **Finance:** money overview, estimates → invoices (draft, unpaid, paid, void), approvals, time and payroll with overtime
- **Admin:** everything above plus team and access (invite by email or phone, change roles, permission matrix), raw data tables (cents, UTC, CSV copy), and the launch decision list

Jump to a screen with a hash, e.g. `crew-portal.html#crewlead-schedule` or `customer-portal.html#request`.

## Current limits
- All people, jobs and amounts are fictional sample data.
- Each app saves to the viewer's own browser only. A customer's request does not yet reach the crew app; that needs a shared database.
- GPS is simulated; invites are recorded but not sent; no payments are collected.
- The key points document names Glide as the preferred platform. Decide whether this custom build or a Glide rebuild becomes the single live system.
