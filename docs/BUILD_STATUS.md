# Build status

Current state by step. Update at the end of every step. Statuses: `Not Started`, `In Progress`,
`Blocked`, `Done`. Only mark `Done` when acceptance criteria have evidence (command output,
test results) recorded here or in the linked session log entry.

| Step | Phase | Build step | Status | Evidence | Blocker | Next step |
|------|-------|------------|--------|----------|---------|-----------|
| S00 | Foundation | Create resumable project control files | Done | CLAUDE.md, docs/, README.md, .env.example created | None | S01 |
| S01 | Foundation | Scaffold the Vercel-ready app | Done | `npm install/lint/typecheck/test/build` all exit 0; `/`, `/candidate`, `/hr` render (200) | None | S02 |
| S02 | Data model | Implement canonical schema and fixed field map | Done | 23/23 tests pass; typecheck/lint/build pass | None | S03 |
| S03 | Candidate | Build complete manual form UI | Done | 38/38 tests pass (incl. 10 component tests); typecheck/lint/build pass | None | S04 |
| S04 | Candidate import | Extract resume into structured candidate data | Done | 58/58 tests pass; typecheck/lint/build pass | Real ANTHROPIC_API_KEY not yet available in this environment — fixture/mocked tests only | S05 |
| S05 | Candidate import | Add LinkedIn-derived import without scraping | Done | 65/65 tests pass; typecheck/lint/build pass | Same as S04: real ANTHROPIC_API_KEY not yet available | S06 |
| S06 | Candidate review | Prompt for missing and conditional fields | Done | 87/87 tests pass; typecheck/lint/build pass | None | S07 |
| S07 | PDF output | Overlay candidate data on the original PDF | Done | 107/107 tests pass; typecheck/lint/build pass; verified in production build via curl | Coordinate calibration is good but not pixel-perfect for a few fields — see docs/FIELD_MAP.md | S08 |
| S08 | Structured output | Export candidate CSV and XLSX | Done | 133/133 tests pass; typecheck/lint/build pass; verified in production build via curl | None | S09 |
| S09 | HR extraction | Extract completed copies of the fixed form | Done | 149/149 tests pass; typecheck/lint/build pass | Same as S04/S05: real ANTHROPIC_API_KEY not yet available | S10 |
| S10 | HR review | Review, correct, and export extracted records | Done | 159/159 tests pass; typecheck/lint/build pass; `/hr` verified rendering in dev | None | S11 |
| S11 | Privacy & limits | Enforce transient processing and safe failures | Done | 175/175 tests pass; typecheck/lint/build pass; verified no-store headers + signature rejection against production build via curl | None | S12 |
| S12 | Quality | Complete automated and visual test coverage | Done | 175 vitest tests + 2 Playwright E2E tests pass; typecheck/lint/build pass; Acceptance Tests tab updated (24 Pass, 2 Not Run — see notes) | None | S13 |
| S13 | Deployment | Deploy the transient POC to Vercel | Blocked | App is deploy-ready (see below); actual deploy needs the user's own Vercel account + ANTHROPIC_API_KEY, which this environment doesn't have | Awaiting user to run `vercel`/deploy via dashboard per README.md § Deployment | S14 |
| S14 | Demo handoff | Prepare interview demo and final checkpoint | Done | DEMO.md written; full P0 suite re-run clean (176/176 vitest + 2/2 Playwright); typecheck/lint/build pass | S13's actual deployment still pending the user — see S13 row | Done |

## Notes

- Source asset `4FS_Employment Application Form.pdf` confirmed: 2 pages, 612 x 792pt each, no
  AcroForm fields (verified with pypdf, 2026-09-22).
- Neon / any database is intentionally excluded — see Scope & Decisions tab in the spreadsheet.
- **Acceptance Tests tab (spreadsheet)** updated 2026-09-23: 24/26 tests Pass, 2 Not Run
  (T21 — needs a real scanned/handwritten sample plus a live `ANTHROPIC_API_KEY`, neither
  available in this build environment; T25 — Vercel smoke test, blocked on S13's actual
  deployment). The spreadsheet's own COUNTA/COUNTIFS summary formulas on the Overview tab were
  not re-cached (no LibreOffice available in this environment to recalculate) — they will
  compute correctly the next time the file is opened in Excel/Google Sheets, since the
  formulas themselves are unchanged, only their inputs.
- A genuine, previously-undiscovered bug was found and fixed while writing S12's Playwright
  browser tests: `HrReviewApp`'s multi-file upload handler captured a `FileList` reference,
  then cleared the input's `value` (to allow re-selecting the same filename later) — clearing
  a file input's `value` in Chromium also empties any `FileList` object already obtained from
  it, silently discarding every selected file. Fixed by converting to a plain array
  (`Array.from`) before clearing. This affected real users, not just the test — see
  SESSION_LOG.md S12 for the debugging trail.
- **S13**: the user chose to deploy this themselves (has the Vercel account and the real
  `ANTHROPIC_API_KEY`, neither available in this build environment). The app itself is fully
  deploy-ready — `npm run build` passes, every processing route declares `runtime = "nodejs"`
  and `maxDuration = 60`, and the source PDF is now bundled as a base64 ES module instead of a
  runtime file read (removes a previously-flagged risk around Vercel's file-tracing behavior;
  see SESSION_LOG.md S13). Deployment instructions are in `README.md` § Deployment. T25 (the
  Vercel smoke test) and T21 (real scanned-form extraction, needs a live API key) remain
  genuinely Not Run in the Acceptance Tests tab until the user deploys and smoke-tests.
