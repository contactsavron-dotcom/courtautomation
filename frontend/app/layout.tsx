import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CauseListPro — Daily Court Cause List Alerts",
  description:
    "Never miss a court hearing. Daily cause list alerts from Telangana courts, delivered to your email by 8 PM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body text-brand-charcoal bg-brand-bg">
        {children}
      </body>
    </html>
  );
}
