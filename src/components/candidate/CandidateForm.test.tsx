import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CandidateFormProvider } from "./FormContext";
import { CandidateForm } from "./CandidateForm";
import { CANDIDATE_FIELD_IDS, getFieldMeta } from "@/lib/schema";

function renderForm() {
  return render(
    <CandidateFormProvider>
      <CandidateForm />
    </CandidateFormProvider>,
  );
}

describe("CandidateForm", () => {
  it("never renders the FOR OFFICIAL USE ONLY block", () => {
    renderForm();
    expect(screen.queryByText(/official use only/i)).not.toBeInTheDocument();
    for (const id of CANDIDATE_FIELD_IDS) {
      expect(id.startsWith("official_")).toBe(false);
    }
  });

  it("renders all 9 candidate sections", () => {
    renderForm();
    for (const title of [
      "Application",
      "Personal Particulars",
      "Education",
      "Employment",
      "References",
      "Languages",
      "Other Information",
      "How did you hear about this vacancy?",
      "Declaration",
    ]) {
      expect(
        screen.getByRole("heading", { name: title }),
      ).toBeInTheDocument();
    }
  });

  it("renders exactly 3 education rows, 3 employment rows, 2 reference rows", () => {
    renderForm();
    expect(screen.getAllByText(/^Education \d$/)).toHaveLength(3);
    expect(
      screen.getAllByText(/^(Current \/ most recent|Employment \d)$/),
    ).toHaveLength(3);
    expect(screen.getAllByText(/^Reference \d$/)).toHaveLength(2);
  });

  it("renders an editable control for every always-visible text-like candidate field", () => {
    renderForm();
    const alwaysVisibleTextFields = CANDIDATE_FIELD_IDS.filter((id) => {
      const meta = getFieldMeta(id);
      return (
        meta.conditional === undefined &&
        meta.type !== "yes_no" &&
        meta.type !== "boolean" &&
        meta.type !== "signature"
      );
    });
    expect(alwaysVisibleTextFields.length).toBeGreaterThan(0);
    for (const id of alwaysVisibleTextFields) {
      const controls = screen.getAllByLabelText(getFieldMeta(id).label);
      expect(controls.length).toBeGreaterThan(0);
    }
  });

  it("edits and retains a value in a simple text field", async () => {
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByLabelText(
      getFieldMeta("full_name").label,
    ) as HTMLInputElement;
    await user.type(input, "Jane Tan");
    expect(input).toHaveValue("Jane Tan");
  });

  it("reveals a single detail field only after answering Yes, and clears it on No", async () => {
    const user = userEvent.setup();
    renderForm();
    const group = screen.getByTestId("yesno-driving_licence_answer");
    expect(
      within(group).queryByLabelText(
        getFieldMeta("driving_licence_details").label,
      ),
    ).not.toBeInTheDocument();

    await user.click(within(group).getByRole("radio", { name: /: Yes$/ }));
    const detail = within(group).getByLabelText(
      getFieldMeta("driving_licence_details").label,
    ) as HTMLInputElement;
    await user.type(detail, "Class 3");
    expect(detail).toHaveValue("Class 3");

    await user.click(within(group).getByRole("radio", { name: /: No$/ }));
    expect(
      within(group).queryByLabelText(
        getFieldMeta("driving_licence_details").label,
      ),
    ).not.toBeInTheDocument();
  });

  it("reveals both name and department when relatives/friends is answered Yes", async () => {
    const user = userEvent.setup();
    renderForm();
    const group = screen.getByTestId("yesno-company_contact_answer");
    await user.click(within(group).getByRole("radio", { name: /: Yes$/ }));
    expect(
      within(group).getByLabelText(getFieldMeta("company_contact_name").label),
    ).toBeInTheDocument();
    expect(
      within(group).getByLabelText(
        getFieldMeta("company_contact_department").label,
      ),
    ).toBeInTheDocument();
  });

  it("reveals the job portal name only when job portal is checked", async () => {
    const user = userEvent.setup();
    renderForm();
    const group = screen.getByTestId("checkbox-vacancy_source_job_portal");
    expect(
      within(group).queryByLabelText(
        getFieldMeta("vacancy_source_job_portal_name").label,
      ),
    ).not.toBeInTheDocument();

    await user.click(within(group).getByRole("checkbox"));
    expect(
      within(group).getByLabelText(
        getFieldMeta("vacancy_source_job_portal_name").label,
      ),
    ).toBeInTheDocument();
  });

  it("requires declaration acceptance before showing date and signature", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(
      screen.queryByLabelText(/signature of applicant/i),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByLabelText(getFieldMeta("declaration_accepted").label),
    );
    expect(
      screen.getByLabelText(/signature of applicant/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(getFieldMeta("declaration_date").label),
    ).toBeInTheDocument();
  });

  it("warns before leaving the page once a field has been edited", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(getFieldMeta("full_name").label), "J");

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("clears all candidate data after Reset is confirmed (T26)", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();

    const fullNameInput = screen.getByLabelText(
      getFieldMeta("full_name").label,
    ) as HTMLInputElement;
    await user.type(fullNameInput, "Jane Tan");
    expect(fullNameInput).toHaveValue("Jane Tan");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(fullNameInput).toHaveValue("");

    confirmSpy.mockRestore();
  });

  it("does not clear data if Reset is not confirmed", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderForm();

    const fullNameInput = screen.getByLabelText(
      getFieldMeta("full_name").label,
    ) as HTMLInputElement;
    await user.type(fullNameInput, "Jane Tan");
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(fullNameInput).toHaveValue("Jane Tan");

    confirmSpy.mockRestore();
  });
});
