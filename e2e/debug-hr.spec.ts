import path from "node:path";
import { test, expect } from "@playwright/test";

test("debug hr", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("requestfailed", (req) => console.log("REQUEST FAILED:", req.url(), req.failure()?.errorText));
  page.on("response", (res) => {
    if (res.url().includes("hr/extract")) {
      console.log("RESPONSE:", res.url(), res.status());
    }
  });

  await page.route("**/api/hr/extract", async (route) => {
    console.log("ROUTE INTERCEPTED");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        templateMatch: true,
        candidateFields: { full_name: { value: "TAN Wei Ming", confidence: "high" } },
        officialFields: {},
      }),
    });
  });

  await page.goto("/hr");
  await expect(page.getByRole("heading", { name: "HR review" })).toBeVisible();
  const fixturePath = path.join(process.cwd(), "src", "lib", "hr", "fixtures", "synthetic-completed-form.pdf");
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await page.waitForTimeout(2000);
  console.log(await page.content());
});
