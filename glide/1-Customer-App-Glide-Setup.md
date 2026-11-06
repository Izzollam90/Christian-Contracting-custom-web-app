# Herkey Maintenance: Customer App (Glide)

The customer-facing app. Customers request service, follow each job, and review estimates and invoices. It shares one data source with the **Crew & Office** app, so a request made here shows up on the crew's job board.

> Glide's menus change from time to time. If a label below doesn't match what you see, look for the closest equivalent.

---

## 1. Connect the shared data (do this once, for both apps)

Both apps must point at **the same** data, or requests won't reach the crew.

1. Upload `Herkey-Maintenance-Glide-Data.xlsx` to **Google Drive** (then open it and choose *File → Save as Google Sheets*) or to **OneDrive**.
2. In Glide, create a new app from that file. This is the Customer app.
3. Later, create the Crew & Office app from **the same file**.

Want Glide Tables instead of a spreadsheet? Each CSV in `data/` imports into one Glide Table. Confirm your Glide plan lets two apps share those tables (Big Tables) before choosing this route.

## 2. Users and sign-in

| Setting | Value |
|---|---|
| User profiles table | **Customers** (Email column, Name column, Photo optional) |
| Sign-in | Email sign-in. Either *restrict to emails in Customers* (invite-only), or allow new sign-ups so new customers add themselves |
| Roles | Not needed in this app |

## 3. Privacy (row owners)

Turn on **Row owner** for these columns. Each customer then only receives their own rows on their device, which is the "data-level" protection the key points ask for.

| Table | Row owner column |
|---|---|
| Customers | `Email` |
| Jobs | `CustomerEmail` |
| Estimates | `CustomerEmail` |
| EstimateLines | `CustomerEmail` |
| Invoices | `CustomerEmail` |
| InvoiceLines | `CustomerEmail` |
| ActivityLog | `CustomerEmail` |

Don't add Staff, Expenses, TimeEntries or Settings to this app.

## 4. Computed columns to add

| Table | Column | Type | How |
|---|---|---|---|
| Jobs | `Status Info` | Relation | `Status` → JobStatuses.`Status` |
| Jobs | `Step` | Lookup | Status Info → `StepOrder` |
| Jobs | `Progress` | Math | `(Step - 1) / 4` (use for a progress bar; clamp On Hold/Canceled with If-Then-Else) |
| Jobs | `Customer Label` | Lookup | Status Info → `CustomerLabel` |
| Jobs | `Is Open` | Lookup | Status Info → `IsOpen` |
| Jobs | `Crew Name` | Relation + Lookup | `CrewEmail` → Staff.`Email`, then `Name`. *Staff isn't in this app.* Instead, add a plain `CrewName` column to Jobs that the staff app fills in when it assigns or claims a job |
| Jobs | `Timeline` | Relation (multiple) | `JobID` → ActivityLog.`JobID`, where `VisibleToCustomer` is true |
| Jobs | `Estimates` / `Invoices` | Relation (multiple) | `JobID` → Estimates/Invoices.`JobID` |
| Estimates | `Lines` | Relation (multiple) | `EstimateID` → EstimateLines.`EstimateID` |
| Estimates | `Total Cents` | Rollup | Lines → sum of `LineTotalCents` |
| Estimates | `Total` | Math | `Total Cents / 100` (format as currency) |
| Invoices | `Lines`, `Total Cents`, `Total` | Same as Estimates | via InvoiceLines |
| Customers | `My Open Jobs` | Relation (multiple) | `Email` → Jobs.`CustomerEmail`, filtered to `Is Open` |
| Customers | `Balance Due` | Rollup | Relation to Invoices where `Status` = Unpaid → sum `Total` |

## 5. Screens (tabs)

**Tab 1: Home**
- Title / hero: "Herkey Maintenance", subtitle "Welcome back, {Name}".
- Big Numbers: *Active jobs* (count of My Open Jobs), *Estimates to review* (count where Status = Sent), *Balance due*.
- Collection (cards) of **Jobs** filtered `Is Open` = true, sorted by `Step` descending, showing Title, Customer Label and a progress bar on `Progress`.
- Button **Request service** → goes to the Request form.

**Tab 2: Request service** (a form that adds a row to **Jobs**)

| Form field | Writes to |
|---|---|
| Choice: Service (from ServiceCategories) | `Category` |
| Text: Short title | `Title` |
| Text (long): What's going on? | `Description` |
| Text: Service address (default from Customers.Street/City/Zip) | `ServiceAddress` |
| Choice: How soon? (Priorities) | `Priority` |
| Date: Preferred day | `PreferredDate` |
| Choice: Time (TimeSlots) | `TimeSlot` |
| Hidden: signed-in user's email | `CustomerEmail` |
| Hidden: signed-in user's CustomerID | `CustomerID` |
| Hidden: "Requested" | `Status` |
| Hidden: current date/time | `CreatedAt` |
| Hidden: unique ID | `JobID` (use Glide's row ID or a Template like `J-{RowID}`) |

On submit, also **add a row to ActivityLog**: JobID, CustomerEmail, At = now, ByEmail = user, Action = "Request submitted", VisibleToCustomer = true. Show the notification "Request received. We'll confirm your time."

**Tab 3: My jobs**
- Collection of Jobs with a choice filter: Active (`Is Open`) / Past.
- **Job detail screen:** Title, progress bar, `Customer Label`, Crew name, PreferredDate + TimeSlot, ServiceAddress, Description; a **Timeline** collection (Action + At); related Estimates and Invoices.
- Button **Cancel request** (visible when Status is Requested, Accepted or Scheduled): Set column values `Status` = Canceled, plus add an ActivityLog row "Customer canceled".

**Tab 4: Billing**
- Estimates collection (Status ≠ Draft). Detail shows Lines and Total.
  - **Accept** (visible when Status = Sent): set `Status` = Accepted and `RespondedAt` = now, add an ActivityLog row, and if the job's Status is Requested, set it to Accepted.
  - **Decline**: set `Status` = Rejected, `RespondedAt` = now, plus an ActivityLog row.
- Invoices collection (Status ≠ Draft) with Lines, Total, DueDate and Status. Online payment can be a later step.

## 6. Look and feel

- Theme: **dark**. Accent color gold `#C49A50`, background near-black `#0C0D0F`.
- App icon: an "HM" monogram on gold.
- Glide can't run the animated background from the prototype. Use a dark hero image (for example a slow-pour or brushed-gold photo) on the Home tab to get closest to it.

## 7. Test before inviting customers

1. Sign in as `dana.whitfield@example.com`. You should see only Dana's 4 jobs (J-1041, J-1042, J-1046, J-1038).
2. Sign in as `robert.ames@example.com`. None of Dana's jobs should appear anywhere.
3. Submit a request, then open the **Crew & Office** app. The request should be on the Job board.
4. Delete the sample rows, or replace the example.com emails, before real customers sign in.
