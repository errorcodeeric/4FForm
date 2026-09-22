import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>4FINGERS Employment Form</h1>
      <p className={styles.subtitle}>
        Files and candidate data are processed transiently and are not
        stored by this app.
      </p>
      <div className={styles.choices}>
        <Link href="/candidate" className={styles.card}>
          <h2>Candidate</h2>
          <p>
            Import a resume or LinkedIn-derived file, fill in what&apos;s
            missing, and export your completed application.
          </p>
        </Link>
        <Link href="/hr" className={styles.card}>
          <h2>HR</h2>
          <p>
            Upload completed application forms, review the extracted data,
            and export a reviewed batch.
          </p>
        </Link>
      </div>
    </main>
  );
}
