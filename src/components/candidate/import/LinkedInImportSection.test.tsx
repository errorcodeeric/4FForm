import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CandidateFormProvider } from "../FormContext";
import { CandidateForm } from "../CandidateForm";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("LinkedInImportSection", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a review diff before applying pasted profile text, and never calls a LinkedIn URL (T10)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      jsonResponse({
        fields: {
          full_name: { value: "Alex Synthetic", confidence: "high" },
        },
      }),
    );

    const user = userEvent.setup();
    render(
      <CandidateFormProvider>
        <CandidateForm />
      </CandidateFormProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Paste profile text" }),
    );
    await user.type(
      screen.getByLabelText(/paste the text of your linkedin profile/i),
      "Alex Synthetic — Software Engineer",
    );
    await user.click(
      screen.getByRole("button", { name: "Review imported fields" }),
    );

    // Diff review appears; the field is NOT yet applied to the form.
    expect(
      await screen.findByText(/review what would change/i),
    ).toBeInTheDocument();
    const fullNameInput = screen.getByLabelText(
      "Full name; surname underlined in source instruction",
    ) as HTMLInputElement;
    expect(fullNameInput).toHaveValue("");

    // Every fetch call must be same-origin (no LinkedIn network integration).
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toMatch(/linkedin\.com/i);
    }
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/import/linkedin",
      expect.objectContaining({ method: "POST" }),
    );

    await user.click(
      screen.getByRole("button", { name: "Apply selected fields" }),
    );
    expect(fullNameInput).toHaveValue("Alex Synthetic");
  });

  it("defaults conflicting fields to unchecked and requires explicit approval to overwrite (replacement protection)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      jsonResponse({
        fields: {
          full_name: { value: "From LinkedIn", confidence: "high" },
        },
      }),
    );

    const user = userEvent.setup();
    render(
      <CandidateFormProvider>
        <CandidateForm />
      </CandidateFormProvider>,
    );

    const fullNameInput = screen.getByLabelText(
      "Full name; surname underlined in source instruction",
    ) as HTMLInputElement;
    await user.type(fullNameInput, "Existing Value");

    await user.click(
      screen.getByRole("button", { name: "Paste profile text" }),
    );
    await user.type(
      screen.getByLabelText(/paste the text of your linkedin profile/i),
      "profile text",
    );
    await user.click(
      screen.getByRole("button", { name: "Review imported fields" }),
    );

    const checkbox = await screen.findByLabelText(
      /apply full name; surname underlined in source instruction/i,
    );
    expect(checkbox).not.toBeChecked();

    await user.click(
      screen.getByRole("button", { name: "Apply selected fields" }),
    );
    // Unchecked field was not applied — existing value is preserved.
    expect(fullNameInput).toHaveValue("Existing Value");
  });
});
