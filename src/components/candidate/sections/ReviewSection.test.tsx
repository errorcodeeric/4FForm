import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CandidateFormProvider } from "../FormContext";
import { CandidateForm } from "../CandidateForm";

function renderForm() {
  return render(
    <CandidateFormProvider>
      <CandidateForm />
    </CandidateFormProvider>,
  );
}

describe("ReviewSection", () => {
  it("blocks the final PDF and lists missing fields when nothing is filled in", () => {
    renderForm();
    const readiness = screen.getByTestId("final-pdf-readiness");
    expect(readiness).toHaveTextContent(/blocked until/i);
    expect(readiness).toHaveTextContent(/Full name.*is required/i);
    expect(
      screen.getByText(/draft csv\/xlsx export is always available/i),
    ).toBeInTheDocument();
  });

  it("blocks final PDF export until the declaration is accepted, dated, and signed (T12)", async () => {
    const user = userEvent.setup();
    renderForm();

    // Fill every otherwise-required field except the declaration.
    const requiredTextFields: Array<[string, string]> = [
      ["Position applied for", "Crew"],
      ["Full name; surname underlined in source instruction", "Jane Tan"],
      ["NRIC / FIN / Passport No.", "S1234567A"],
      ["Address", "1 Test Street"],
      ["Telephone - Mobile", "+65 9123 4567"],
      ["Email address", "jane@example.com"],
      ["Citizenship", "Singaporean"],
      ["Legal rights to work in Singapore", "Citizen"],
      ["Expected Salary", "3000"],
      ["Termination Notice for present job", "1 month"],
    ];
    for (const [label, value] of requiredTextFields) {
      await user.type(screen.getByLabelText(label), value);
    }
    for (const answerId of [
      "Driving licence",
      "Charged / convicted in any country",
      "Dismissed / discharged / suspended",
      "Medical condition affecting work",
      "Declared bankrupt",
      "Relatives / friends in this Company",
    ]) {
      await user.click(
        screen.getByRole("radio", { name: new RegExp(`^${answerId}: No$`) }),
      );
    }

    let readiness = screen.getByTestId("final-pdf-readiness");
    expect(readiness).toHaveTextContent(/declaration accepted.*is required/i);

    await user.click(screen.getByLabelText("Declaration accepted"));
    readiness = screen.getByTestId("final-pdf-readiness");
    expect(readiness).toHaveTextContent(/date.*is required/i);
    expect(readiness).toHaveTextContent(/signature of applicant/i);

    await user.type(screen.getByLabelText("Date"), "2026-09-22");
    await user.type(
      screen.getByLabelText(/signature of applicant/i),
      "Jane Tan",
    );

    readiness = screen.getByTestId("final-pdf-readiness");
    expect(readiness).toHaveTextContent(/ready to export/i);
  });

  it("flags a low-confidence imported field as needing confirmation", async () => {
    renderForm();
    // Directly exercise the review classification via a resume import
    // that returns a low-confidence value, using the same mocked-fetch
    // pattern as ResumeImportSection tests would.
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    global.fetch = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            full_name: { value: "Jane Tan", confidence: "low" },
          },
        }),
      }) as Response) as typeof fetch;

    try {
      const fileInput = screen.getByLabelText(
        /import from resume/i,
      ) as HTMLInputElement;
      const file = new File(["resume text"], "resume.pdf", {
        type: "application/pdf",
      });
      await user.upload(fileInput, file);

      expect(
        await screen.findByText(/needs confirmation \(imported/i),
      ).toBeInTheDocument();
      const list = screen
        .getByText(/needs confirmation \(imported/i)
        .closest("div") as HTMLElement;
      expect(within(list).getByText(/full name/i)).toBeInTheDocument();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
