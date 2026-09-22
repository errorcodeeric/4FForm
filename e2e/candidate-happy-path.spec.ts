import { test, expect, type Page } from "@playwright/test";

/**
 * Full candidate happy path in a real browser (Chromium, not jsdom):
 * manual fill of every required field, declaration + typed signature,
 * then all three exports (PDF, CSV, XLSX). No Anthropic API key is
 * available in this environment, so this exercises the manual-entry path
 * rather than resume/LinkedIn import — but PDF overlay and CSV/XLSX
 * generation (the parts that need a real browser download to verify) run
 * for real, unmocked, against the built production server.
 *
 * Required fields render with a CSS `::after` asterisk that Chromium's
 * real accessibility tree *does* include in the computed accessible name
 * (unlike jsdom/Testing Library, which ignores it) — so exact label
 * lookups need an anchored regex tolerating an optional trailing " *".
 */
function fieldLabel(text: string): RegExp {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s\\*)?$`);
}

function fillField(page: Page, label: string, value: string) {
  return page.getByLabel(fieldLabel(label)).fill(value);
}

test("candidate can fill the form manually and download PDF, CSV, and XLSX", async ({
  page,
}) => {
  await page.goto("/candidate");
  await expect(page.getByRole("heading", { name: "Candidate application" })).toBeVisible();

  await fillField(page, "Position applied for", "Crew Team Member");
  await fillField(
    page,
    "Full name; surname underlined in source instruction",
    "TAN Wei Ming",
  );
  await fillField(page, "NRIC / FIN / Passport No.", "S1234567A");
  await fillField(page, "Address", "123 Ang Mo Kio Avenue 6, Singapore");
  await fillField(page, "Telephone - Mobile", "+65 9123 4567");
  await fillField(page, "Email address", "weiming.tan@example.com");
  await fillField(page, "Citizenship", "Singaporean");
  await fillField(
    page,
    "Legal rights to work in Singapore",
    "Citizen — no restriction",
  );

  for (const question of [
    "Driving licence",
    "Charged / convicted in any country",
    "Dismissed / discharged / suspended",
    "Medical condition affecting work",
    "Declared bankrupt",
    "Relatives / friends in this Company",
  ]) {
    await page.getByRole("radio", { name: `${question}: No` }).check();
  }

  await fillField(page, "Expected Salary", "$2,800 - $3,200");
  await fillField(page, "Termination Notice for present job", "2 weeks");

  await expect(page.getByTestId("final-pdf-readiness")).toContainText(
    "blocked until",
  );

  await page.getByLabel(fieldLabel("Declaration accepted")).check();
  await fillField(page, "Date", "22/09/2026");
  await page
    .getByLabel(/signature of applicant/i)
    .fill("Tan Wei Ming");

  await expect(page.getByTestId("final-pdf-readiness")).toContainText(
    "ready to export",
  );

  const [pdfDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download completed PDF" }).click(),
  ]);
  expect(pdfDownload.suggestedFilename()).toBe("employment-application.pdf");

  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  expect(csvDownload.suggestedFilename()).toBe("candidate-application.csv");

  const [xlsxDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download XLSX" }).click(),
  ]);
  expect(xlsxDownload.suggestedFilename()).toBe("candidate-application.xlsx");
});
