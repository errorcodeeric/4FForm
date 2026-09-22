# Field map

Code-facing copy of the spreadsheet's **Field Map** tab
(`4FINGERS_POC_Spec_and_Build_Tracker.xlsx`). That spreadsheet is the source of truth; update
this file whenever a coordinate is calibrated in S07 and note the calibration in
`docs/SESSION_LOG.md`.

One field ID drives the UI, extraction, validation, exports, and PDF overlay. Coordinates are
**top-left PDF points** on 612 x 792 point pages (both pages), approximate until calibrated in
S07 against rendered synthetic output.

## S07 calibration status

The raw coordinates below (and in `fieldMap.generated.ts`) are the spreadsheet's originals —
**the PDF overlay does not draw at these coordinates directly.** `src/lib/pdf/overlayPdf.ts`
applies a calibration on top of them, derived by rendering a complete synthetic application to
PNG and measuring actual row-border pixel positions against it:

- **Page 1**: a small additive per-section Y shift (+20pt default, +54pt for References, which
  has an extra instruction line above its table that other sections don't).
- **Page 2**: the raw coordinates' row spacing didn't match the real page at all (confirmed by
  drawing a labeled 20pt ruler directly on the source PDF and rendering it) — every
  "Other information" / "Vacancy source" / "Application" / "Declaration" field on page 2 uses an
  explicit corrected Y (and, for a few same-line fields, X) override table in `overlayPdf.ts`,
  read directly off programmatically-detected table borders rather than derived from the
  spreadsheet's numbers.

**Verified good** (rendered and visually inspected): Application, Education, Employment,
Languages, References (page 1); every row of Other information, Vacancy source, Expected
Salary/Termination Notice, and the Declaration date/signature line (page 2) all land in their
correct row.

**Known remaining imperfections** (cosmetic — values are in the correct row/box and legible,
but not pixel-centered): Personal Particulars fields (full_name, citizenship,
legal_right_to_work_sg) sit slightly high against their multi-line box labels;
`supporting_information` can crowd the question text above it; the three vacancy-source
checkbox marks can sit close to the row above. A future pass should re-run the same
border-detection method (see `docs/SESSION_LOG.md`, S07) specifically for these.

Columns: `id` | page | section | label | type | row (repeat group index) | owner |
POC required | overlay rect `x,y,w,h` | conditional | notes.

`owner: Candidate` fields are editable in Candidate mode and exported to candidate outputs.
`owner: HR` (`official_*`) fields are HR-only, extracted in S09, and must **never** be present
in a candidate payload, candidate UI, or candidate-generated PDF — enforced by schema tests
(T03).

## Personal / Application (page 1)

| id | section | label | type | required | rect (x,y,w,h) | notes |
|---|---|---|---|---|---|---|
| position_applied_for | Application | Position applied for | text | Yes | 88,86,400,13 | single line inside top box |
| full_name | Personal | Full name | text | Yes | 89,137,250,24 | surname underline not reproduced unless captured separately |
| identity_number | Personal | NRIC / FIN / Passport No. | identifier | Yes | 360,137,120,16 | sensitive; never infer from resume |
| address | Personal | Address | multiline | Yes | 89,179,250,30 | wrap to two lines |
| telephone_home | Personal | Telephone - Home | text | No | 390,179,95,13 | preserve leading + and zeros |
| telephone_mobile | Personal | Telephone - Mobile | text | Yes | 390,218,95,13 | preserve leading + and zeros |
| email | Personal | Email address | email | Yes | 89,219,250,13 | shrink font if long |
| citizenship | Personal | Citizenship | text | Yes | 89,258,250,13 | do not infer legal status from nationality |
| legal_right_to_work_sg | Personal | Legal right to work in Singapore | text | Yes | 390,255,95,24 | manual confirmation only |

## Education (page 1, rows 1-3)

Repeated group `education_{1..3}_*`. Row 1 rect y=299, row 2 y=319, row 3 y=339 (each row
height 14).

| id suffix | label | type | rect (x,y*,w,h) | notes |
|---|---|---|---|---|
| institution | School / College / University | text | 88,y,170,14 | row order preserved |
| from | From | date_or_year | 270,y,50,14 | display compactly |
| to | To | date_or_year | 331,y,50,14 | date, year, or "Present" |
| standard | Standard achieved | text | 392,y,95,14 | qualification / result |

## Employment (page 1, rows 1-3)

Repeated group `employment_{1..3}_*`, current job first. Row 1 y=408, row 2 y=428, row 3 y=448.

| id suffix | label | type | rect (x,y*,w,h) | notes |
|---|---|---|---|---|
| from | From (dd/mm/yy) | date | 86,y,34,14 | |
| to | To (dd/mm/yy) | date_or_present | 125,y,34,14 | may be "Present" for current job |
| employer | Employer | text | 165,y,86,14 | shrink if necessary |
| superior | Name of superior | text | 258,y,49,14 | often missing from resume |
| position | Position last-held | text | 313,y,48,14 | |
| last_salary | Last drawn salary | text | 367,y,40,14 | never infer |
| reason_leaving | Reason for leaving | text | 414,y,72,14 | manual confirmation |

## References (page 1, rows 1-2)

Repeated group `reference_{1..2}_*`. Row 1 y=507, row 2 y=527.

| id suffix | label | type | rect (x,y*,w,h) | notes |
|---|---|---|---|---|
| name | Name | text | 88,y,105,14 | professional ex-immediate superior preferred |
| telephone | Tel No. | text | 201,y,70,14 | preserve leading + and zeros |
| profession | Profession | text | 279,y,92,14 | could contain role/company |
| years_known | Years Known | text | 379,y,105,14 | text supports ranges |

## Languages (page 1)

| id | label | type | rect | notes |
|---|---|---|---|---|
| languages_spoken | Spoken | text_list | 89,571,190,14 | comma-separated or list |
| languages_written | Written | text_list | 300,571,185,14 | comma-separated or list |

## Other information (page 2, yes/no + conditional detail)

| answer id | detail id | label | rect (answer) | rect (detail) | conditional |
|---|---|---|---|---|---|
| driving_licence_answer | driving_licence_details | Driving licence | 340,35,35,14 | 388,48,95,13 | detail required when answer = Yes |
| criminal_charge_answer | criminal_charge_details | Charged / convicted in any country | 340,63,35,14 | 388,76,95,13 | same |
| employment_discipline_answer | employment_discipline_details | Dismissed / discharged / suspended | 340,91,35,14 | 388,104,95,13 | same |
| medical_impact_answer | medical_impact_details | Medical condition affecting work | 340,119,35,14 | 388,132,95,13 | same |
| bankruptcy_answer | bankruptcy_details | Declared bankrupt | 340,147,35,14 | 388,160,95,13 | same |
| company_contact_answer | company_contact_name + company_contact_department | Relatives / friends in this Company | 340,176,35,14 | name 395,199,90,13; department 436,215,49,13 | both required when answer = Yes |

All `*_answer` fields are type `yes_no`; draw a checkmark beside the selected choice, never
write text into the other box.

## Vacancy source (page 2)

| id | label | type | rect | conditional |
|---|---|---|---|---|
| vacancy_source_friend | Through friend / relatives | boolean | 89,296,10,10 | checkbox |
| vacancy_source_job_portal | Job portal selected | boolean | 89,311,10,10 | checkbox |
| vacancy_source_job_portal_name | Job portal name | text | 143,311,105,13 | required if job_portal = True |
| vacancy_source_other | Other selected | boolean | 89,326,10,10 | checkbox |
| vacancy_source_other_details | Other source details | text | 197,326,102,13 | required if other = True |

## Application details / Declaration (page 2)

| id | label | type | rect | notes |
|---|---|---|---|---|
| expected_salary | Expected Salary | text | 150,344,330,13 | never infer |
| termination_notice | Termination Notice for present job | text | 205,362,275,13 | manual confirmation |
| supporting_information | Other information supporting application | multiline | 235,380,245,18 | wrap / shrink |
| declaration_accepted | Declaration accepted | boolean | (not drawn) | must be true before final PDF export |
| declaration_date | Date | date | 56,487,110,14 | required when declaration_accepted = True |
| applicant_signature | Signature of applicant | signature | 250,474,225,25 | image or typed POC signature; **never** put signature bytes in CSV/XLSX (metadata only) |

## FOR OFFICIAL USE ONLY (page 2) — HR-only, never candidate-editable

| id | label | type | rect | notes |
|---|---|---|---|---|
| official_date | Date | date | 390,527,85,14 | HR review required |
| official_proceed_to_offer | Proceed to offer | yes_no | 84,546,50,14 | HR review required |
| official_employment_type | Type of employment | choice | 258,546,95,14 | HR review required |
| official_restaurant_outlet | Restaurant outlet | text | 237,565,238,14 | HR review required |
| official_other_remarks | Other Remarks | multiline | 138,584,340,18 | HR review required |
| official_commencement_date | Date of commencement | date | 165,607,110,14 | HR review required |
| official_job_title | Job Title | text | 325,607,150,14 | HR review required |
| official_base_salary_offer | Base Salary Offer | text | 145,625,135,14 | HR review required |
| official_other_salary_details | Other Salary Details | text | 375,625,102,14 | HR review required |
| official_probation_period | Probation Period | text | 143,644,335,14 | HR review required |
| official_other_offer_details | Other Offer Details | multiline | 147,662,331,18 | HR review required |

**Rule enforced by S02/S09 tests:** Candidate UI and candidate PDF generation must never read
or write `official_*` fields. They are extracted only in HR mode (S09), shown only in the HR
review grid (S10), and exported only to HR CSV/XLSX.

The spreadsheet records X/Y/W/H coordinates for every `official_*` field, but its "PDF
overlay" column is `No` for all of them — those coordinates document where the field sits on
page 2 for HR's own reference, not a draw instruction. `src/lib/schema/overlay.ts`'s
`OVERLAY_MAP` therefore only includes a rectangle when "PDF overlay" = `Yes`, which excludes
every `official_*` field and `declaration_accepted`.

## Code

`docs/FIELD_MAP.md` (this file) is the human-readable copy. The code-facing, type-checked
source of truth is `src/lib/schema/fieldMap.generated.ts` (generated from the spreadsheet's
Field Map tab), consumed by `src/lib/schema/build.ts` (Zod schemas), `overlay.ts` (PDF overlay
map), `exportKeys.ts` (CSV/XLSX header order), and `groups.ts` (repeat-group and conditional
helpers).
