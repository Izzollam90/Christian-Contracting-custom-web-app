<!-- Text extracted from Maintenance_App_Organized_Notes-4.pdf (owner's notes). -->
PROJECT NOTES / ORGANIZED SUMMARY
# Maintenance Application
Development status, functional requirements, access controls and management decisions
Purpose
A mobile-focused maintenance operations application serving employees, management and
customers, with room to expand to other operations.
## 1 | Current Development Status
• Base scaffold: The initial application framework is complete.
• User registration/invitations: Users can currently be added by email during registration.
• Role-based permissions: Crew and Admin/Management roles have been added to restrict who can view information.
• Maintenance requests: Submitting requests is currently possible, but the existing workflow is primarily usable by
management and crew. Customer actions are still limited.
## 2 | Core Maintenance Workflows
• Allow customers to submit maintenance or service requests.
• Allow crew members to pick up tasks and jobs, and track the progress of every assignment.
• Support estimates and invoice creation.
• Provide clock-in and clock-out functionality with location-based access or permission requirements.
• Keep job requests and associated progress information organized so assignments can be followed from intake to
completion.
## 3 | User Roles, Access and Visibility
• Customers: A front-facing experience focused on requesting maintenance and scheduling appointments.
• Crew: An employee-facing experience for work orders, assignments and relevant job activities.
• Admin and management: Broader access across customer and crew views, with information restricted according to
role.
• Payroll, executives and digital maintenance: Access to both application views and to raw underlying table data,
including rows and columns, as described in the notes.
• Experience separation: Customer pages and employee pages should be purpose-built rather than showing everyone
the same interface.
## 4 | Reporting, Integrations and Security
• Add company-wide KPI reporting, including spending reports and other operational metrics.
• Add a phone-number option for inviting users, alongside email.
• Review secondary integrations that simplify data submission and routine workflows.
• Evaluate Google-related integration and data-structuring options, while ensuring baseline security rules are maintained.


## 5 | Architecture, Sustainability and Expansion
• Select a strong application foundation and data structure that supports future development.
• Reassess the development approach: the current data-design and implementation effort is larger than initially expected.
• Design for scalability and long-term usefulness, with financial sustainability in mind.
• Consider whether the application could also be used for the "Herkeyhouse" operation. The notes also reference "Herkey
Maintenance" and "Christian Contracting" as possible business contexts.
• Decide whether ongoing technical management will stay with the original developer or whether the project should be
easy for someone else to take over.
## 6 | Decisions and Questions for Management
• What additional features or changes are needed for the crew and management?
• Which application features should be treated as the highest priority?
• Is a public website needed, and should it integrate with the application? Should website development begin now?
• When should the next progress review or application check-in take place?
• Who should own ongoing maintenance, support and administration of the application?
• What technology or application foundation should be used for long-term development?
## 7 | Design and Usability Questions for Testing
Once the initial working version can be tested, confirm:
• Preferred colors and overall visual style.
• How the crew interface should look and behave compared with the customer interface.
• Which controls, information and actions should be available to crew members versus executives.
• Which features will make customer appointment scheduling as simple as possible.
Scope note: This document reorganizes the original notes. "Current" features are based on the author's stated status, not on a new technical
audit. Open questions are intentionally left unresolved.