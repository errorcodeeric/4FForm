import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4FINGERS Employment Form POC",
  description:
    "Candidate and HR workflows for the 4FINGERS employment application form.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
