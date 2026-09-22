import { describe, expect, it } from "vitest";
import { escapeFormulaInjection } from "./formulaInjection";

describe("escapeFormulaInjection", () => {
  it.each(["=SUM(A1:A9)", "+1+1", "-2+3", "@SUM(1,2)"])(
    "prefixes a value starting with a formula-triggering character: %s",
    (value) => {
      const escaped = escapeFormulaInjection(value);
      expect(escaped.startsWith("'")).toBe(true);
      expect(escaped).toBe(`'${value}`);
    },
  );

  it("leaves ordinary text untouched", () => {
    expect(escapeFormulaInjection("Jane Tan")).toBe("Jane Tan");
    expect(escapeFormulaInjection("")).toBe("");
  });

  it("does not escape a value merely containing those characters mid-string", () => {
    expect(escapeFormulaInjection("Tan-Lee")).toBe("Tan-Lee");
    expect(escapeFormulaInjection("a@b.com")).toBe("a@b.com");
  });
});
