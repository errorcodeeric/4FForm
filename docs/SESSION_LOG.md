# Session log

Append-only. Add an entry before ending every session, using the template below. Never edit
or delete a previous entry.

## Entry template

```
## YYYY-MM-DD HH:MM - Sxx - short title
Status: Done | Partial | Blocked
Files changed: exact paths
Commands run: command -> PASS/FAIL with short result
Acceptance evidence: test IDs, screenshots, rendered PDFs, or URLs
Decisions: what changed and why
Known issues: issue ID, impact, workaround
Uncommitted changes: yes/no and why
Next step: Sxx
Exact next action: one concrete sentence
Context needed next session: only information not already in repo docs
```

---

## 2026-09-22 - S00 - Create resumable project control files
Status: Done
Files changed: CLAUDE.md, .env.example, docs/BUILD_STATUS.md, docs/SESSION_LOG.md, docs/FIELD_MAP.md, README.md
Commands run: `pypdf` inspection of source PDF -> PASS (2 pages, 612x792pt, no AcroForm)
Acceptance evidence: Control files exist; scope states exact-PDF-only; Neon excluded; next step is S01.
Decisions: Source PDF supplied by user at repo root as `4FS_Employment Application Form.pdf`; confirmed matches spec before continuing.
Known issues: None yet.
Uncommitted changes: yes, working tree not yet committed (no prior commits beyond initial repo commit with the spreadsheet).
Next step: S01
Exact next action: Scaffold the Next.js App Router TypeScript app per the S01 prompt in the Build Tracker tab.
Context needed next session: None beyond this repo's docs.

---

## 2026-09-22 - S01 - Scaffold the Vercel-ready app
Status: Done
Files changed: package.json, tsconfig.json, next.config.ts, eslint.config.mjs, .gitignore, src/app/layout.tsx, src/app/page.tsx, src/app/page.module.css, src/app/globals.css, src/app/candidate/page.tsx, src/app/hr/page.tsx, src/assets/4FS_Employment_Application_Form.pdf, src/assets/asset.test.ts
Commands run: `npm install` -> PASS; `npm run lint` -> PASS; `npm run typecheck` -> PASS; `npm test` -> PASS (2/2); `npm run build` -> PASS (4 static routes: /, /_not-found, /candidate, /hr)
Acceptance evidence: Production build succeeds; `curl` against `next dev` confirmed `/` shows "4FINGERS Employment Form" with Candidate/HR links, `/candidate` and `/hr` render placeholder pages (200 OK).
Decisions: Scaffolded via `create-next-app` (App Router, TypeScript, ESLint, src dir, `@/*` alias) into a temp dir then copied in, since `create-next-app` rejects the repo's capitalized directory name; npm package renamed to `4fingers-poc`. Dropped `next/font/google` from layout to avoid a network dependency at build time; used a plain `LayoutProps`-free signature (`{ children: React.ReactNode }`) since the Next-generated `LayoutProps` type isn't available to a standalone `tsc --noEmit` run before `next build` has run once. Added `vitest` as the test runner (none existed) with one placeholder-scope test asserting the immutable source PDF is bundled and non-empty. Added only `zod` and `pdf-lib` as product dependencies per the step's instruction to defer extraction/export libraries. `/candidate` and `/hr` are minimal stub pages so the landing page's links resolve; full flows are built in S03 and S09/S10 respectively.
Known issues: `npm audit` reports 2 moderate advisories in transitive deps from `create-next-app`'s default template; not addressed now (out of scope for S01, revisit if it blocks deployment).
Uncommitted changes: no, will be committed at end of this step.
Next step: S02
Exact next action: Implement the canonical Zod schema, TypeScript type, and fixed PDF overlay map per `docs/FIELD_MAP.md` and the S02 prompt in the Build Tracker tab.
Context needed next session: None beyond this repo's docs.

---

## 2026-09-22 - S02 - Implement canonical schema and fixed field map
Status: Done
Files changed: src/lib/schema/{types.ts,fieldMap.generated.ts,build.ts,signature.ts,overlay.ts,exportKeys.ts,groups.ts,index.ts,schema.test.ts}, docs/FIELD_MAP.md
Commands run: `npm run typecheck` -> PASS; `npm run lint` -> PASS; `npm test` -> PASS (23/23, 2 files); `npm run build` -> PASS
Acceptance evidence: `schema.test.ts` proves (a) all 87 field IDs unique, (b) CandidateDataSchema's keys equal CANDIDATE_FIELD_IDS exactly (T02), (c) parsing a candidate payload containing an `official_*` key throws because the schema is `.strict()` (T03), (d) OfficialUseDataSchema is symmetric and rejects candidate keys, (e) every overlay rectangle fits inside 612x792pt and no `official_*` field is ever in the overlay map, (f) repeat-group and conditional-parsing helpers match the spreadsheet's row counts.
Decisions: Generated `fieldMap.generated.ts` programmatically from the spreadsheet (via a one-off Python/openpyxl script, not committed) to avoid hand-transcription errors across 87 rows; treated the generated file as the single source every other module builds from ("one canonical ID drives UI, extraction, validation, exports, and overlay"). `CandidateDataSchema`/`OfficialUseDataSchema` are built by filtering `FIELD_MAP` by `owner` rather than hand-written, so the schema can never drift from the field list. All fields are optional at this layer (permissive "in progress" shape); conditional-requirement enforcement (Yes needs details, etc.) is deferred to S06 per the step boundary. Found and fixed a bug during generation: several `official_*` rows have X/Y/W/H recorded in the spreadsheet for documentation even though their "PDF overlay" column is `No` — `OVERLAY_MAP` now only includes a rect when that column is `Yes`, confirmed by a test that no `official_*` ID is ever in the overlay map.
Known issues: None.
Uncommitted changes: no, will be committed at end of this step.
Next step: S03
Exact next action: Build the Candidate mode sectioned form UI from the canonical schema per the S03 prompt in the Build Tracker tab.
Context needed next session: None beyond this repo's docs.

---

## 2026-09-22 - S03 - Build complete manual form UI
Status: Done
Files changed: src/components/candidate/{FormContext.tsx,CandidateForm.tsx,CandidateForm.module.css,CandidateForm.test.tsx}, src/components/candidate/fields/{TextInputField,YesNoDetailField,CheckboxField,CheckboxDetailField,fields.module.css}, src/components/candidate/sections/{Section,FlatFieldsSection,RepeatSection,OtherInformationSection,VacancySourceSection,DeclarationSection,sections.module.css}, src/app/candidate/page.tsx, src/lib/schema/lookup.ts (+ getDependentFieldIds in groups.ts, re-exported via index.ts), vitest.config.ts, vitest.setup.ts, package.json (added @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom)
Commands run: `npm run typecheck` -> PASS; `npm run lint` -> PASS; `npm test` -> PASS (38/38, 3 files); `npm run build` -> PASS; `curl` against `next dev` on `/candidate` confirmed headings and repeat-row labels render (200 OK)
Acceptance evidence: Component tests (React Testing Library + jsdom) assert: FOR OFFICIAL USE ONLY never renders; all 9 sections (Application, Personal Particulars, Education, Employment, References, Languages, Other Information, vacancy source, Declaration) render; exactly 3 education rows, 3 employment rows, 2 reference rows; every always-visible text-like candidate field has an editable control reachable by its field-map label; typing into a field retains the value; a driving-licence Yes reveals its detail field and typing retains the value, while switching to No hides and clears it; the relatives/friends Yes reveals both name and department; the vacancy-source job-portal checkbox reveals its name field only when checked; declaration acceptance is required before the date and (typed, POC-only) signature fields appear; editing a field arms a `beforeunload` warning (T06).
Decisions: Built the UI generically from the field map rather than one hand-written component per field: `FlatFieldsSection` renders any section of purely text-like fields, `RepeatSection` renders the row groups via `getRepeatGroups`, `OtherInformationSection`/`VacancySourceSection` render every yes/no or checkbox field in their section and look up dependent detail field(s) via a new `getDependentFieldIds` helper (added to `src/lib/schema/groups.ts`) — this is what makes the relatives/friends question's two details (name + department) "just work" without hard-coding that pairing. `DeclarationSection` is hand-written (not generic) because the signature field needs custom UI. Implemented only a typed signature for the S03 milestone (not a drawn-canvas signature) — Scope & Decisions already marks e-signature compliance as deferred, and `SignatureValue` (from S02) already supports a future `kind: "drawn"` without a schema change. State lives in a React context (`CandidateFormProvider`) backed by `useState`, browser-memory only, no localStorage. Found and fixed a test-infra bug: `@testing-library/react`'s auto-cleanup between tests silently never ran because `vitest.config.ts` doesn't set `test.globals: true`, so multiple test renders accumulated in the DOM and caused "multiple elements found" errors; fixed by calling `cleanup()` explicitly in an `afterEach` in `vitest.setup.ts` rather than turning on global test APIs. Also found that `declaration_date`/`applicant_signature` are marked `pocRequired: "required"` in the spreadsheet even though they're functionally gated by `declaration_accepted` (the `T`/Conditional-logic column) — the "always visible" test filters on `meta.conditional === undefined`, not `pocRequired`, since those are two different columns answering different questions.
Known issues: None. T06 (unsaved-navigation warning) is P1 and covered for both `beforeunload` (tab close/refresh) and one in-app `Link` (via `window.confirm`); full browser-level (Playwright) verification is deferred to S12 per the build tracker.
Uncommitted changes: no, will be committed at end of this step.
Next step: S04
Exact next action: Add resume upload (PDF/DOCX) and server-side Anthropic API extraction into CandidateData per the S04 prompt in the Build Tracker tab.
Context needed next session: An ANTHROPIC_API_KEY will be needed to exercise the real extraction path end-to-end (fixture-based unit tests can run without it, per the S04 acceptance criteria).
