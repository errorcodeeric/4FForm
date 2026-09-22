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
