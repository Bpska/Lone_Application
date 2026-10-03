# Saathi Finance â€” controlled loan pilot

A runnable, mobile-first loan-management application for a controlled 200â€“300 user pilot. It separates application approval, customer offer acceptance, manual bank-transfer recording, and payment confirmation. It never represents a bank transfer or payment as completed without an authorized confirmation record.

## Architecture

- `apps/web`: React 19 + TypeScript + Vite + React Router PWA. The service worker caches only static shell assets; authenticated API data is network-only.
- `apps/api`: Express 5 + TypeScript REST API. JWT authentication, Argon2 passwords, rate limits, strict Zod validation, ownership/role authorization, row locks, transactions, and idempotency keys.
- `packages/shared`: shared validation, date handling, INR/paise loan calculations using `decimal.js`.
- PostgreSQL is authoritative. Accepted offer terms and schedules, destination bank data, and audit changes are snapshotted.

Core data model: users/roles â†’ customer profiles â†’ applications â†’ two witnesses/documents/reviews â†’ offers â†’ loans â†’ instalments â†’ disbursements/payments/allocations. Settings only affect future offers. Audit events capture important actor/action/reason changes.

## Local setup

Requirements: Node.js 20+, npm 10+, Docker (or PostgreSQL 16+).

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:5173`; API health is `http://localhost:4000/health`. Seed password defaults to `PilotPass123!` and may be overridden with `SEED_PASSWORD`. Fictional accounts are `superadmin@saathi.test`, `admin@saathi.test`, `asha@saathi.test`, and `ravi@saathi.test`. Change all seed credentials outside local development.

Run verification:

```bash
npm test
npm run build
```

API documentation is in `docs/openapi.yaml`. Production deployment should build both workspaces, serve `apps/web/dist` behind HTTPS, run `node apps/api/dist/server.js`, and set the environment variables below through a secret manager.

## Configuration and security

Required production values: `DATABASE_URL`, a random 32+ character `JWT_SECRET`, `WEB_ORIGIN`, `UPLOAD_DIR`, and a 32-byte `DATA_ENCRYPTION_KEY` represented as 64 hex characters. Do not commit `.env`. Use HTTPS, encrypted database/storage volumes, regular backups, short retention, and malware scanning at the upload integration point. Uploaded files are stored outside public web assets and their API returns metadata only.

Ordinary queues omit identity details and full account numbers. Aadhaar is disabled by default. `settings.privacy`, support/grievance contacts, and future-offer defaults are admin-controlled records. Existing accepted loans are isolated from later default changes.

## Calculation rules

All amounts are integer paise. Flat interest is `principal Ã— monthly rate Ã— instalments`. Reducing balance uses the standard amortizing payment formula `P Ã— r Ã— (1+r)^n / ((1+r)^nâˆ’1)`, then recalculates interest against the current balance each period. Annual nominal rates are divided by 12; monthly rates are used directly. The final principal row absorbs rounding residuals. Due dates clamp to month end, including leap years. Fees are separate and applied to the first instalment in this pilot default.

Confirmed payments allocate oldest-due-first and may be partial or span instalments. Pending/rejected payments allocate nothing. Idempotency keys prevent duplicate transfer/payment records. Reversals are represented in the schema but require a production amendment/authorization UI before use.

## External dependencies and decisions

These are deliberately not fabricated:

- Bank transfers remain manual; a banking provider is not connected.
- Payment, SMS, email, malware scanning, and identity-verification providers require client selection and credentials.
- Password-reset delivery needs an email/SMS provider (development exposes a token only in a response header).
- Exact KYC documents, Aadhaar handling, lending disclosures/APR, agreements, guarantor consent, late fees, retention periods, and grievance wording need client/legal approval.
- Active-loan amendment and reversal APIs should be implemented only after approval roles and accounting rules are signed off.
- Google Sheets migration is intentionally separate from live operations; field mapping and source-data quality rules are needed before importing real records.

## Pilot defaults

INR, monthly instalments, reducing-balance 12% annual nominal example, nearest-paise rounding, no late fee or compounding, two witnesses who are explicitly **not** treated as guarantors, and manual admin confirmation for disbursements and repayments.
