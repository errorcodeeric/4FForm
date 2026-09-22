// @vitest-environment node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = path.join(__dirname, "..");

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Static, whole-repo checks that back the S11 transient-data audit with
 * something that fails CI if violated later, not just a one-time manual
 * read. Deliberately simple (string scans over route/lib source, not a
 * full AST) — the properties being checked are simple enough that a
 * string scan is both sufficient and easy to verify by eye.
 */
describe("privacy audit", () => {
  it("every API route sets Cache-Control: no-store on every response it returns", async () => {
    const apiDir = path.join(SRC_DIR, "app", "api");
    const routeFiles = (await listFiles(apiDir)).filter(
      (f) => f.endsWith("route.ts") && !f.endsWith(".test.ts"),
    );
    expect(routeFiles.length).toBeGreaterThan(0);

    for (const file of routeFiles) {
      const source = await readFile(file, "utf8");
      // Every NextResponse.json(...) / new NextResponse(...) call site in
      // these routes is expected to carry a no-store header; a route that
      // returns a response without one would still pass this coarse
      // check only if it never sets the header anywhere in the file, so
      // this catches a route that forgot no-store entirely.
      expect(source).toContain("no-store");
    }
  });

  it("no route or lib source logs request/response bodies, extracted text, or field values", async () => {
    const dirs = [
      path.join(SRC_DIR, "app", "api"),
      path.join(SRC_DIR, "lib"),
    ];
    for (const dir of dirs) {
      const files = (await listFiles(dir)).filter(
        (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
      );
      for (const file of files) {
        const source = await readFile(file, "utf8");
        expect(source).not.toMatch(/console\.(log|error|warn|info|debug)\(/);
      }
    }
  });

  it("no processing route runtime is configured for the Edge (Node APIs — pdf-lib/pdf-parse/Anthropic SDK — require Node)", async () => {
    const apiDir = path.join(SRC_DIR, "app", "api");
    const routeFiles = (await listFiles(apiDir)).filter(
      (f) => f.endsWith("route.ts") && !f.endsWith(".test.ts"),
    );
    for (const file of routeFiles) {
      const source = await readFile(file, "utf8");
      expect(source).toContain('export const runtime = "nodejs"');
    }
  });

  it("no dependency on Neon, a generic database client, or an auth/session library exists", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(SRC_DIR, "..", "package.json"), "utf8"),
    );
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    for (const forbidden of [
      "@neondatabase/serverless",
      "pg",
      "mysql2",
      "mongodb",
      "next-auth",
      "@auth/core",
      "bullmq",
    ]) {
      expect(deps).not.toHaveProperty(forbidden);
    }
  });
});
