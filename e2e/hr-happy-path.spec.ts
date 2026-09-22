import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * Full HR happy path in a real browser: upload a completed-form PDF,
 * review the extracted fields, then export. No Anthropic API key is
 * available in this environment, so `/api/hr/extract` is mocked at the
 * network level (the real HTTP round trip through the browser's fetch
 * still happens — only the server's own call to Anthropic is stood in
 * for); export (`/api/hr/export/csv`) runs for real, unmocked.
 */
test("HR can upload a form, review extracted fields, and export a CSV", async ({
  page,
}) => {
  await page.route("**/api/hr/extract", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        templateMatch: true,
        candidateFields: {
          full_name: { value: "TAN Wei Ming", confidence: "high" },
          email: { value: "weiming.tan@example.com", confidence: "medium" },
        },
        officialFields: {
          official_job_title: { value: "Crew", confidence: "medium" },
        },
      }),
    });
  });

  await page.goto("/hr");
  await expect(page.getByRole("heading", { name: "HR review" })).toBeVisible();

  const fixturePath = path.join(
    __dirname,
    "..",
    "src",
    "lib",
    "hr",
    "fixtures",
    "synthetic-completed-form.pdf",
  );
  await page.locator('input[type="file"]').setInputFiles(fixturePath);

  await expect(page.getByTestId("hr-record-card")).toBeVisible();
  await expect(page.getByText("Extracted")).toBeVisible();
  await expect(page.getByText("Candidate fields")).toBeVisible();
  await expect(page.getByText("For official use only")).toBeVisible();

  const fullNameInput = page.getByLabel(
    "Full name; surname underlined in source instruction",
  );
  await expect(fullNameInput).toHaveValue("TAN Wei Ming");
  await fullNameInput.fill("TAN Wei Ming (corrected)");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export reviewed CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("hr-batch-review.csv");
});
