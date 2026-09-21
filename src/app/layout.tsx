import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soundcheck — log the shows you've been to",
  description:
    "Rate, review, and remember the concerts you've been to. Track your top four, share photos and videos, and follow other music fans.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-sm text-[var(--muted)]">
          Soundcheck — built for people who keep the ticket stubs.
        </footer>
      </body>
    </html>
  );
}
