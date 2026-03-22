import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrendLens — Free Trend Intelligence",
  description:
    "Spot rising trends before they go mainstream. Free, AI-powered trend analysis using public data from Google, Reddit, and Hacker News.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg antialiased">{children}</body>
    </html>
  );
}
