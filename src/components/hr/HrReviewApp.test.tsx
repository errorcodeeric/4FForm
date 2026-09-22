import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HrReviewApp } from "./HrReviewApp";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 422) {
  return { ok, status, json: async () => body, blob: async () => new Blob() } as Response;
}

describe("HrReviewApp", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps two successful records reviewable when a third file fails (T22, I17)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/hr/extract")) {
        // Determine which call this is by call count.
        const callIndex = fetchMock.mock.calls.filter((c) =>
          String(c[0]).includes("/api/hr/extract"),
        ).length;
        if (callIndex === 3) {
          return jsonResponse(
            { templateMatch: false, message: "Unrelated document." },
            false,
            422,
          );
        }
        return jsonResponse({
          templateMatch: true,
          candidateFields: {
            full_name: {
              value: `Candidate ${callIndex}`,
              confidence: "high",
            },
          },
          officialFields: {
            official_job_title: { value: "Crew", confidence: "medium" },
          },
        });
      }
      return jsonResponse({});
    });

    const user = userEvent.setup();
    render(<HrReviewApp />);

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const files = [
      new File(["a"], "good-1.pdf", { type: "application/pdf" }),
      new File(["b"], "good-2.pdf", { type: "application/pdf" }),
      new File(["c"], "bad.pdf", { type: "application/pdf" }),
    ];
    await user.upload(fileInput, files);

    const cards = await screen.findAllByTestId("hr-record-card");
    expect(cards).toHaveLength(3);

    await screen.findByText("good-1.pdf");
    await screen.findByText("good-2.pdf");
    await screen.findByText("bad.pdf");

    const badCard = cards.find((c) =>
      within(c).queryByText("bad.pdf"),
    ) as HTMLElement;
    expect(await within(badCard).findByText("Failed")).toBeInTheDocument();
    expect(within(badCard).getByText(/Unrelated document/)).toBeInTheDocument();

    const goodCards = cards.filter((c) => c !== badCard);
    for (const card of goodCards) {
      expect(await within(card).findByText("Extracted")).toBeInTheDocument();
      // Candidate and official fields are visually/structurally separated.
      expect(within(card).getByText("Candidate fields")).toBeInTheDocument();
      expect(
        within(card).getByText("For official use only"),
      ).toBeInTheDocument();
      expect(within(card).getByDisplayValue(/Candidate \d/)).toBeInTheDocument();
      expect(within(card).getByDisplayValue("Crew")).toBeInTheDocument();
    }

    // Export remains available since two records are still reviewable.
    expect(
      screen.getByRole("button", { name: /export reviewed csv/i }),
    ).not.toBeDisabled();
  });
});
