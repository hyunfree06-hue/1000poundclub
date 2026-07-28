import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import StatusBanner from "@/components/StatusBanner";

export const metadata: Metadata = {
  title: "1000 LB CLUB",
  description:
    "Verify your Big 3 total — squat, bench, deadlift — earn your tier, and flex it on every post.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <StatusBanner />
        <main className="mx-auto max-w-[960px] px-3 py-4">{children}</main>
        <footer className="mx-auto max-w-[960px] border-t border-hairline px-3 py-4 text-xs text-muted">
          1000 LB CLUB — verify your total, claim your tier.
        </footer>
      </body>
    </html>
  );
}
