You are a senior full-stack engineer and product designer. Build a working, professional loan-management web application for a controlled pilot of 200â€“300 users.

## 1. Technology and deliverables

Use:

- Frontend: React with TypeScript, Vite, React Router, and a responsive component system.
- Backend: Node.js, Express, and TypeScript.
- Database: PostgreSQL with migrations.
- PWA: installable mobile web app with an app manifest, icons, and appropriate caching.
- Validation: shared request/response schemas or equivalent strict validation.
- Testing: meaningful tests for permissions, loan calculations, approval, disbursement, and payments.
- Provide a README, `.env.example`, seed data, database setup instructions, and commands to run frontend and backend locally.

Create actual runnable code. Do not stop at mock screens or pseudocode. Work in stages, run the application and tests, fix errors, and report what is complete and what requires an external provider or client decision. Do not invent payment confirmations, identity verification results, or bank-transfer integrations.

## 2. Product context

The client currently collects loan requests through a Google Form and stores responses in Google Sheets. The existing form collects:

**Customer**

- Customer name
- Date of birth
- Fatherâ€™s or husbandâ€™s name
- Mobile number
- WhatsApp number
- Address
- PAN or another permitted identifier, subject to requirements review

**Two witnesses**

- Name
- Fatherâ€™s name
- Mobile or WhatsApp number
- Address
- Identity information only where legally appropriate and necessary

**Loan and bank information**

- Monthly income
- Loan purpose
- Requested amount
- Next-of-kin name and relationship
- Bank name
- Account holder name
- IFSC
- Account number
- Customer photo
- Permitted identity document

The existing form calls both witness sections â€œWitness 1â€ in some fields. Correct the second section to â€œWitness 2.â€

The client reviews applications and transfers approved funds **manually through their bank**. The software must record the transfer; it must never claim to send money automatically. Existing Google Sheets data may be imported through a separate, validated migration tool. PostgreSQL becomes the authoritative application database. Do not use Google Sheets for live balances or repayment calculations.

## 3. User roles

Implement at least:

- Customer: can access only their own profile, applications, documents, offers, loans, EMIs, and payments.
- Admin: can review applications, verify information, set terms, approve or reject, record transfers and payments, and view reports.
- Super admin: can manage admin accounts, configuration, permissions, and audit access.

Create the first super admin through a secure setup or seed process, never through public registration. Enforce authorization in the Express API for every operation. Hiding buttons in React is insufficient.

## 4. Customer-facing React PWA

Design primarily for phones. Use clear typography, large touch targets, simple Hindi/English-ready copy, progress indicators, readable errors, and a bottom navigation such as Home, Apply, My Loans, Payments, and Profile. Do not show an instalment as paid before an admin-confirmed or provider-verified payment exists.

Implement:

1. Welcome and product information.
2. Registration, login, logout, password reset, and session handling.
3. A short, multi-step loan application covering the existing form fields.
4. Save draft, resume later, field validation, upload progress, and final review before submission.
5. Two separate witness sections with clear explanations of their proposed roles.
6. Private document upload, with file type and size checks.
7. Application timeline: Draft â†’ Submitted â†’ Under Review â†’ More Information Needed â†’ Approved or Rejected.
8. If approved, show the full offered terms and require explicit customer acceptance before the loan proceeds.
9. After disbursement, show approved amount, actual transfer date and reference, EMI schedule, next due date, paid and outstanding amounts, and payment history.
10. A support/contact and grievance page, with contact information configurable by the admin.

Do not assume that a witness automatically becomes a legally liable guarantor. If the business requires a guarantor, create a separate consent and agreement flow subject to client/legal review. Do not silently copy the existing Google Formâ€™s statement that a witness must pay a missed EMI.

## 5. Admin interface

Make the admin panel efficient on desktop and fully usable on mobile. Use a desktop sidebar and responsive mobile navigation. Provide accessible tables that become readable cards on narrow screens.

Implement:

- Dashboard: new applications, pending reviews, awaiting disbursement, upcoming EMIs, overdue EMIs, recent payments, and totals.
- Searchable application queue with status and date filters.
- Full applicant profile and document review, including both witnesses and bank details.
- Request-correction workflow with a message visible to the applicant.
- Approval and rejection with a required recorded reason.
- Loan-offer editor with a calculation preview.
- Manual disbursement recording: transfer amount, date, bank reference/UTR, destination account snapshot, and admin identity. Approval and disbursement must remain separate.
- Payment recording and reconciliation: payment date, amount, method, reference, allocation to one or more EMIs, and confirmation status.
- Overdue management, notes, and customer contact history. Do not generate harassing or misleading collection messages.
- Loan details with complete schedule, transactions, balance, and immutable history.
- Reports and CSV export with role-based access.
- Interest defaults and other settings that affect only future offers.
- Admin account management and audit log.

Avoid unnecessary exposure of full bank account and identity numbers in lists and exports. Mask them by default.

## 6. Interest and repayment rules

The admin must be able to enter the approved principal and interest percentage when preparing an offer. The form must explicitly require:

- Rate value and whether it is annual or monthly.
- Calculation method: reducing balance or flat interest.
- Number of instalments and payment frequency.
- First due date.
- Processing fee and any other permitted charges, entered separately.
- Rounding method and currency (INR).

Implement server-side calculation functions with documented formulas. Show a preview of each EMIâ€™s due date, principal, interest, fees, total due, total interest, and total payable. Handle month-end dates, leap years, rounding residuals, partial payments, and duplicate requests predictably.

Store a snapshot of the accepted terms and generated schedule. Changing admin defaults must not silently alter existing loans. Any modification to an active loan requires an explicit amendment workflow, reason, actor, timestamp, and revised schedule. Do not invent late fees or compound interest unless configured and reviewed. Display the total cost clearly before customer acceptance. Keep the distinction between the entered rate and any required APR disclosure.

## 7. Core workflow and state integrity

Implement valid state transitions. At minimum:

- Application: draft, submitted, under_review, information_requested, approved, rejected, withdrawn.
- Offer: prepared, presented, accepted, declined, expired.
- Loan: awaiting_disbursement, active, completed, cancelled, with overdue derived from unpaid due amounts.
- Disbursement: pending, confirmed, reversed where applicable.
- Payment: pending_verification, confirmed, rejected or reversed.

Only authorized admins can approve, confirm disbursement, or confirm payments. Reject impossible transitions, such as disbursing a rejected application. Use PostgreSQL transactions for approval, schedule creation, payment allocation, and balance updates. Add idempotency protection for repeated button clicks or retried API requests. Record every important change in an audit trail with actor, time, old value, new value, and reason.

A loan becomes active only after a real manual transfer has been recorded and confirmed. An EMI becomes paid only after its payment is confirmed. Derive outstanding balances from reliable ledger/payment records rather than editable display fields.

## 8. Database design

Create normalized PostgreSQL tables with keys, constraints, indexes, timestamps, and migrations. Include appropriate entities for users, roles, customer profiles, applications, witnesses, bank accounts, documents, application reviews, offers, loans, schedule instalments, disbursements, payments, payment allocations, admin notes, settings, and audit events.

Use generated internal IDs. Never use PAN or Aadhaar as a primary key or public customer ID. Preserve historical snapshots of accepted loan terms and disbursement destination details. Use decimal-safe monetary calculations rather than JavaScript floating-point arithmetic for money.

## 9. Security and privacy

This application processes personal, financial, identity, and third-party witness data. Implement:

- Secure authentication and password handling.
- Server-enforced role and ownership checks.
- HTTPS-ready deployment configuration.
- Input validation and safe error messages.
- Rate limiting for login and sensitive endpoints.
- Restricted CORS, secure session/token handling, and CSRF protection where applicable.
- Private document storage; never serve uploads as public static files.
- File validation and malware-scanning integration point.
- Masked identity and bank details in ordinary views.
- Encryption and secret management appropriate for deployment.
- Minimal collection, consent records, retention/deletion settings, and access logs.
- Separate development and production configuration.
- No private keys, database passwords, or sensitive customer data committed to Git or exposed in React.

Treat Aadhaar collection and storage as a specific requirements decision. Do not automatically require a full Aadhaar number or unmasked Aadhaar image just because the old Google Form requested them. Provide a configurable, privacy-conscious document flow and mark the final KYC process for client/legal review.

## 10. API and frontend quality

Design documented REST endpoints with consistent pagination, filters, response shapes, and error codes. Include an OpenAPI specification or equivalent API documentation. Prevent the customer API from returning other customersâ€™ data. Use loading, empty, validation, and failure states throughout the UI.

The PWA may cache static assets and safe informational pages. Do not cache sensitive account, document, or loan data in an uncontrolled offline store. A submission must show success only after the server confirms it and returns an application ID.

## 11. Seed data and acceptance tests

Create clearly fictional seed accounts and sample applications. Test at least these cases:

- Customer A cannot access Customer Bâ€™s application or files.
- A customer cannot call admin approval or payment-confirmation endpoints.
- The admin cannot disburse before a valid accepted offer.
- Two admins cannot accidentally approve or pay the same item twice.
- Flat and reducing-balance calculations match independently calculated expected examples.
- Partial, early, late, duplicate, rejected, and reversed payments produce correct balances.
- A changed default rate does not change existing accepted loans.
- A failed bank transfer does not activate the loan.
- The customer sees the correct next due date and outstanding amount.
- The mobile application works at common phone widths, and the admin panel works on phone, tablet, and desktop.

## 12. Implementation order

First inspect the repository and existing code. Then:

1. Write a concise architecture and data model.
2. Implement database migrations and seed data.
3. Implement authentication, authorization, and tests.
4. Implement applications and private uploads.
5. Implement admin review and loan-offer calculations.
6. Implement acceptance and manual disbursement recording.
7. Implement EMI schedules, payments, ledger, and reports.
8. Finish responsive UI and PWA behavior.
9. Run tests, build both apps, and fix failures.
10. Provide exact setup, migration, and deployment steps.

If business rules are unspecified, choose a clearly documented pilot default that can be configured later. Before implementing legally significant agreements, actual KYC collection, or live lending disclosures, identify the exact missing decision rather than inventing legal text. Deliver the complete working pilot and clearly label any feature that depends on a payment, SMS, email, identity-verification, or banking provider.
