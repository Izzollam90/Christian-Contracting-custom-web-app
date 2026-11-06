<!-- Text extracted from Construction_Maintenance_App_Key_Points-4.docx (owner's requirements, Nov 5 2026). -->
Construction and Maintenance App Requirements
Herkey Maintenance  |  Project summary  |  November 5 2026
Build a mobile-friendly operations app that connects customer maintenance requests with crew work, scheduling, estimates, invoicing, time tracking, and management reporting. Customers and staff need separate experiences, with access limited to the records and actions relevant to their roles.
Purpose and business scope
The working company name is Herkey Maintenance. Christian Contracting remains a possible legal or brand name. The design should leave room for future HerkeyHouse expansion without assuming that it belongs in the first release.
Core outcomes
Give customers one place to request service, follow progress, review estimates, and view invoices.
Give crew a practical mobile workspace to claim or receive jobs, update progress, and record time and expenses.
Give management visibility into assignments, spending, outstanding invoices, and company performance.
Keep records organized, remove duplicate data, and make the app maintainable by another person over time.
Platform direction
Glide is the preferred platform. The latest handoff recommends a native Glide rebuild using Glide Tables, sign-in, roles, and record ownership. Keep one production source of truth. The earlier custom app and its database should not operate as a second live system alongside Glide.
Scope boundaries
Core workflows belong in the first release. Photo uploads, direct payment collection, automated messages, Google connections, and broader business expansion need their own configuration and decisions. A separate public marketing website is still an open question.

Users and access
Use one user profile record per person and an administrator-controlled role. Earlier planning used Admin, Crew, and Customer; the latest handoff expands responsibilities into five roles.
Role
Intended responsibilities
Customer
Submit requests; view own jobs and progress; review own estimates and invoices.
Crew
View assigned work and permitted available jobs; claim work; update progress; record time and expenses; prepare estimates and invoices within approved permissions.
CrewLead
Coordinate operational work, crew assignment, scheduling, and permitted approvals.
Finance
Review permitted expenses, invoices, time reports, and financial reporting. Payroll and approval authority require final rules.
Admin
Manage users, role access, configuration, operations, reports, and raw business tables.
Access rules
Customers must only access their own records. Crew access should follow assignment and approved operational needs.
Restrict raw table administration to Admin. Give management and payroll staff the specific reporting access they require.
Protect private records at the data level. Screen visibility and filters alone must not serve as access control.
Users must not promote their own roles. Earlier planning proposed Customer as the default for new users, with staff roles assigned by Admin.
Job pickup and privacy
Crew should be able to claim unassigned work. The implementation must define which request details are visible before assignment and prevent two people from claiming the same job. Private customer details should follow the approved access policy.
Invitations and sign in
Support onboarding by email and explore phone invitations. Decide whether phone support means sending an actual SMS, phone-based sign-in, or manual sharing of access instructions. The existing prototype records invitations but does not deliver them.

Service workflows
Customer request and scheduling
A customer submits a maintenance request with the service address, contact information, and work description. Management reviews it, assigns or releases it for crew pickup, and schedules the work. Customer appointment selection remains to be defined.
Job progression
Latest proposed sequence: Requested → Accepted → Scheduled → In Progress → Completed. Include On Hold and Canceled with controlled permissions. Claiming a job sets its assigned crew member and changes it to Accepted. Record important actions in a job activity timeline.
Earlier designs included Pending Approval, Approved, Invoiced, and Closed. Decide whether job completion requires approval; track estimate and invoice states separately so one job status does not duplicate several business processes.
Estimates and invoices
Crew or authorized staff create a draft estimate linked to the job. A selected delivery channel sends it for customer acceptance or rejection.
An accepted estimate can support invoice creation. Invoices move through draft, sent or unpaid, paid, or void states.
Define line items, numbering, tax handling, approval authority, payment terms, and customer document format before launch.
Payment collection is a desired extension. Stripe appeared in earlier planning, but the provider is not finalized. Partial payments require a defined balance model.
Time and expenses
Crew clock in and out, optionally against a job. Explore location-based verification, record the check result, and support approval. Set the company timezone, geofence, breaks, rounding, overtime, corrections, and payroll export rules. Phone location is a supporting check, not definitive proof of attendance.
Crew submit job-related expenses for review. An authorized Admin, CrewLead, or Finance user approves or rejects them. Spending reports should include approved expenses only.
Notes and photos
Earlier scope included job notes, before and after photos, and work history. Keep the activity timeline in the core design; the latest first-release plan defers a dedicated media workflow until upload, visibility, and retention rules are settled.

Screens reporting and data
Main app areas
The planned workspace includes Overview, Jobs and requests, Schedule, Time clock, Estimates and invoices, Reports, Team and access, Data table, and Integrations. Each role sees a relevant subset. Mobile navigation should put frequent tasks within easy reach.
Management measures
Measure
Definition or requirement
Open jobs
Jobs that are neither completed nor canceled.
Completed jobs
Jobs completed during the selected month in the company timezone; use a completion timestamp.
Approved spending
Approved expenses during the selected reporting period.
Outstanding invoices
Unpaid balances. Until partial payments are modeled, use the applicable full unpaid invoice totals.
Other operating metrics
Earlier scope requested broader company KPIs. Final measures, targets, and reporting periods need business agreement.
Core data structure
Table
Purpose
Organizations
Company identity, timezone, and shared configuration.
Users
Sign-in identity, role, organization, and optional customer link.
Customers
Reusable customer and contact records.
Jobs
Requests, service addresses, assignments, schedules, and status.
Estimates
Job-linked proposals and acceptance state.
Invoices
Job-linked charges, terms, and invoice state.
Expenses
Submitted costs and approval state.
TimeEntries
Clock-in and clock-out records and review.
ActivityLog
Job actions, status changes, and timeline history.
Link tables with stable IDs and relations instead of repeatedly copying customer or crew details. Store money in integer cents and timestamps in UTC, then display currency and company-local time. Keep one canonical time table and one expense source; avoid duplicate user, cost, and invitation tables.

Launch decisions and delivery scope
Decisions still needed
Company name, legal entity, visual identity and colors, and whether a public website is needed.
Authenticated customer portal versus public request intake; sign-in method and invitation delivery.
Scheduling rules, job pickup visibility, completion approvals, and staff approval limits.
Company timezone, location boundary, payroll policies, and who reviews corrections.
Estimate and invoice format, taxes, numbering, payment provider, and accounting connection.
Specific Google needs: Calendar, Drive, Sheets, Gmail, or another service. These remain candidates rather than connected features.
Photo visibility, privacy terms, record retention, backups, recovery, and user offboarding.
Long-term owner, administrator handover, maintenance responsibilities, timeline, and check-in cadence.
Whether HerkeyHouse will be a business unit in the same app or a separate product.
First release and later additions
First release: user access, customer requests, job assignment and status, scheduling, estimates and invoice records, approved expenses, time records, activity history, and management reporting. Launch depends on the business rules and access checks above.
Later additions: dedicated job media, automated SMS and email, online payments, accounting or Google connections, more advanced payroll support, and multi-business expansion. Move any of these into the first release only when its workflow and owner are defined.
Completion checks
Test the full request-to-completion workflow with separate Customer, Crew, CrewLead, Finance, and Admin accounts.
Verify each account can access only permitted records, including attempts to view another customer or crew member’s private data.
Reconcile reports with underlying jobs, expenses, invoices, and time entries; test approvals, cancellations, and corrections.
Verify actual message delivery and payment handling if included. A draft record or pending invitation is not a delivered message or collected payment.
Pilot with real users, resolve issues, and hand over setup and operating instructions before broad rollout.
Project source
Primary reference: AI Project Handoff, October 28 2026, including its summary of Notes for the application.txt. Earlier project discussions inform the notes on photos, approval stages, and role defaults. Existing prototype capabilities described in that handoff are historical and require verification before being treated as launch-ready.