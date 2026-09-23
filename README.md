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
- `ANTHROPIC_MODEL` — e.g. `claude-sonnet-5`. HR mode sends page images (vision), so pick a
  model that supports image input.

## Deployment (Vercel)

No database or object storage to provision — this is close to the smallest possible Vercel
deployment.

1. **Push this repo to GitHub** (or your Git provider of choice) if it isn't already, then
   [import it in the Vercel dashboard](https://vercel.com/new), or from the CLI:
   ```
   npm install -g vercel   # if you don't have it
   vercel login
   vercel link             # run from the repo root; creates/links a Vercel project
   ```
2. **Set environment variables** — in the Vercel dashboard under Project Settings →
   Environment Variables (or `vercel env add ANTHROPIC_API_KEY` / `vercel env add
   ANTHROPIC_MODEL` from the CLI). Add both for the environments you'll use (Preview and
   Production). Never commit real values to `.env.local` or anywhere in the repo.
3. **Deploy a preview**:
   ```
   vercel            # deploys a preview and prints its URL
   vercel --prod     # promotes to production, once you're happy with the preview
   ```
4. **Smoke test the preview** before treating it as done (see `docs/BUILD_STATUS.md` / the
   spreadsheet's Acceptance Tests tab, test T25): load `/`, walk the candidate manual-entry
   path through a PDF/CSV/XLSX download, try one resume import, and upload a completed form in
   HR mode. Record the preview URL and results in `docs/BUILD_STATUS.md`.

Every processing route already declares `export const runtime = "nodejs"` (pdf-lib, mammoth,
and the Anthropic SDK all need Node APIs, not the Edge runtime) and `export const maxDuration
= 60` on the three routes that call the Anthropic API, matching Vercel's Hobby-plan function
duration limit — if you're on a paid plan and see AI-extraction requests time out on a large
scanned form, this is the value to raise. The source PDF is bundled as a base64-encoded ES
module (`src/assets/sourcePdfBase64.generated.ts`), not read from disk at request time, so
there's no dependency on Vercel's own file-tracing behavior for that asset.

## Project docs

- `CLAUDE.md` — durable scope, commands, non-goals, privacy rules.
- `docs/BUILD_STATUS.md` — current build step and status.
- `docs/SESSION_LOG.md` — append-only build history.
- `docs/FIELD_MAP.md` — canonical field IDs, ownership, and PDF overlay coordinates.
- `4FINGERS_POC_Spec_and_Build_Tracker.xlsx` — full spec and build tracker (source of truth).
