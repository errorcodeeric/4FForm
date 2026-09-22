import { getRepeatGroups } from "@/lib/schema";
import { TextInputField } from "../fields/TextInputField";
import { Section } from "./Section";
import styles from "./sections.module.css";

interface RepeatSectionProps {
  title: string;
  section: string;
  rowLabel: (row: number) => string;
}

/**
 * Renders the fixed-count repeated rows (3 education, 3 employment, 2
 * references) directly from the field map's row grouping, so the exact
 * row count and field order always match docs/FIELD_MAP.md.
 */
export function RepeatSection({ title, section, rowLabel }: RepeatSectionProps) {
  const groups = getRepeatGroups(section);
  return (
    <Section title={title}>
      <div className={styles.repeatList}>
        {groups.map((group) => (
          <div key={group.row} className={styles.repeatRow}>
            <div className={styles.repeatTitle}>{rowLabel(group.row)}</div>
            <div className={styles.row}>
              {group.fields.map((field) => (
                <TextInputField key={field.id} id={field.id} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
