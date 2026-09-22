# 4FINGERS Employment Form POC

A fixed-template, no-login web app for one 4FINGERS employment application PDF
(`4FS_Employment Application Form.pdf`, two pages).

## Two workflows

**Candidate mode** — a candidate imports a resume (PDF/DOCX) or a user-supplied
LinkedIn-derived PDF/text, then is asked only for the fields that couldn't be filled
automatically. After review, they export:

- the original two-page PDF with their values overlaid in place,
- a CSV, and
- an XLSX (with a Candidate Data sheet and a Field Dictionary sheet).

**HR mode** — HR uploads one or more *completed* copies of this same form. The app extracts
structured data (candidate fields plus the page-2 "FOR OFFICIAL USE ONLY" fields) via the
Anthropic API, requires a human review step before anything is trusted, and exports a
reviewed CSV/XLSX batch (one row per file, plus an errors sheet for failed files).

Both modes share one canonical schema (`docs/FIELD_MAP.md`) so the form UI, PDF overlay,
extraction, and exports never drift out of sync.

## Transient-data policy

This app has **no database and no object storage**. Uploaded files, extracted text, and
candidate data live only in the request/browser memory for the duration of processing:

- Nothing is written to disk or a database by the app itself.
- Processing routes send `no-store`/no-cache headers.
- Files may transit the configured Anthropic API during AI-assisted extraction — this is
  disclosed in the UI, not hidden.
- Client state (including local object URLs) clears on reset.

See the spreadsheet's **Scope & Decisions** tab for the full rationale, including why a
database, accounts, and a generic template builder are deliberately out of scope for this POC.

## Commands

```
npm install
npm run dev        # local dev server
npm run lint
npm run typecheck
npm test
npm run build       # production build
```

## Environment variables

Copy `.env.example` to `.env.local` and set:

- `ANTHROPIC_API_KEY` — server-only, never exposed to the client.
- `ANTHROPIC_MODEL`

## Project docs

- `CLAUDE.md` — durable scope, commands, non-goals, privacy rules.
- `docs/BUILD_STATUS.md` — current build step and status.
- `docs/SESSION_LOG.md` — append-only build history.
- `docs/FIELD_MAP.md` — canonical field IDs, ownership, and PDF overlay coordinates.
- `4FINGERS_POC_Spec_and_Build_Tracker.xlsx` — full spec and build tracker (source of truth).
