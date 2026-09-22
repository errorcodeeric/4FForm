import type { ReactNode } from "react";
import styles from "./sections.module.css";

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
