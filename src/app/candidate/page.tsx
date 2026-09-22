import { CandidateFormProvider } from "@/components/candidate/FormContext";
import { CandidateForm } from "@/components/candidate/CandidateForm";

export default function CandidatePage() {
  return (
    <CandidateFormProvider>
      <CandidateForm />
    </CandidateFormProvider>
  );
}
