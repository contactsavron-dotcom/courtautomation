import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CauseListPro — Daily Court Cause List Alerts",
  description:
    "Never miss a court hearing. Daily cause list alerts from 5 Hyderabad courts, delivered to your email by 8 PM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
