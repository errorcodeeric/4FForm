import { getSectionFieldIds } from "@/lib/schema";
import { TextInputField } from "../fields/TextInputField";
import { Section } from "./Section";
import styles from "./sections.module.css";

interface FlatFieldsSectionProps {
  title: string;
  section: string;
}

/**
 * Renders every non-repeated, text-like field in a field-map section as a
 * plain input. Used for sections whose fields are all simple text values
 * (Application, Personal, Languages) — sections with yes/no or checkbox
 * fields use a dedicated component instead.
 */
export function FlatFieldsSection({ title, section }: FlatFieldsSectionProps) {
  const ids = getSectionFieldIds(section);
  return (
    <Section title={title}>
      <div className={styles.row}>
        {ids.map((id) => (
          <TextInputField key={id} id={id} />
        ))}
      </div>
    </Section>
  );
}
