import {
  getDependentFieldIds,
  getFieldMeta,
  getSectionFieldIds,
} from "@/lib/schema";
import { YesNoDetailField } from "../fields/YesNoDetailField";
import { Section } from "./Section";
import styles from "./sections.module.css";

/**
 * Every Yes/No + conditional-detail question in the "Other information"
 * section (driving licence, criminal record, discipline, medical, bankruptcy,
 * relatives/friends in the company). Answer fields and their dependent
 * detail field(s) are both derived from the field map, so the relatives
 * question's two details (name + department) are picked up automatically.
 */
export function OtherInformationSection() {
  const ids = getSectionFieldIds("Other information");
  const answerIds = ids.filter((id) => getFieldMeta(id).type === "yes_no");

  return (
    <Section title="Other Information">
      <div className={styles.repeatList}>
        {answerIds.map((answerId) => (
          <YesNoDetailField
            key={answerId}
            answerId={answerId}
            detailIds={getDependentFieldIds(answerId)}
          />
        ))}
      </div>
    </Section>
  );
}
