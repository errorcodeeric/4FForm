# CLAUDE.md

Durable instructions for this repository. Read this, `docs/BUILD_STATUS.md`,
`docs/SESSION_LOG.md`, `docs/FIELD_MAP.md`, and `git status` before doing any work.

## POC scope

4FINGERS Employment Form POC: a fixed-template, no-login web app for **one** employment
application PDF (`4FS_Employment Application Form.pdf`, 2 pages, 612 x 792pt, not fillable).

- **Candidate mode**: import a resume (PDF/DOCX) or user-supplied LinkedIn-derived PDF/text,
  ask only for missing/uncertain fields, export CSV, XLSX, and the original two-page PDF with
  values overlaid.
- **HR mode**: accept completed copies of this same form, extract structured data via the
  Anthropic API, require a human review step, export CSV/XLSX.
- Files and candidate data are processed **transiently** — request/browser memory only, never
  persisted by the app.

Full spec: `4FINGERS_POC_Spec_and_Build_Tracker.xlsx` (Overview, Build Tracker, Field Map,
Acceptance Tests, Handoff Log, Scope & Decisions tabs). That spreadsheet is the source of
truth for requirements; these docs are the code-facing, resumable working copy.

## Build order

Steps S00-S14 in `docs/BUILD_STATUS.md`, one at a time, in order. Each step's exact prompt is
in the spreadsheet's Build Tracker tab. Do not start a later step before the current one's
acceptance criteria are met and documented.

## Commands

- `npm install`
- `npm run dev` — local dev server
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build` — production build

## Non-goals (do not add)

- Accounts, authentication, or login
- Any database or object storage (Neon is deliberately excluded — no persistence requirement)
- A generic/multi-template PDF form builder
- LinkedIn scraping, browser automation, or unofficial LinkedIn APIs
- HRMS integrations, webhooks, queues, or background jobs
- Analytics
- Claims of perfect handwriting/OCR accuracy
- Edited-PDF generation from HR mode

## Privacy rules

- No app-level persistence of uploaded files, extracted text, or candidate data.
- No PII in logs or error monitoring.
- `no-store` / no-cache headers on processing routes.
- Files may transit the configured Anthropic API during extraction — this must be disclosed
  in the UI, not hidden.
- Client state clears fully on reset.

## Data model / field map

Canonical schema and PDF overlay coordinates: `docs/FIELD_MAP.md` (code-facing copy of the
spreadsheet's Field Map tab). One field ID drives UI, extraction, validation, exports, and
PDF overlay. Official-use-only fields (`official_*`) are HR-only and must never appear in
candidate payloads or candidate-generated PDFs.

## Environment variables

See `.env.example`: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`. Server-only, never exposed to the
client. No other environment variables are needed (no database, no auth provider).
