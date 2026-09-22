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
| S08 | Structured output | Export candidate CSV and XLSX | Not Started | | | S09 |
| S09 | HR extraction | Extract completed copies of the fixed form | Not Started | | | S10 |
| S10 | HR review | Review, correct, and export extracted records | Not Started | | | S11 |
| S11 | Privacy & limits | Enforce transient processing and safe failures | Not Started | | | S12 |
| S12 | Quality | Complete automated and visual test coverage | Not Started | | | S13 |
| S13 | Deployment | Deploy the transient POC to Vercel | Not Started | | | S14 |
| S14 | Demo handoff | Prepare interview demo and final checkpoint | Not Started | | | Done |

## Notes

- Source asset `4FS_Employment Application Form.pdf` confirmed: 2 pages, 612 x 792pt each, no
  AcroForm fields (verified with pypdf, 2026-09-22).
- Neon / any database is intentionally excluded — see Scope & Decisions tab in the spreadsheet.
