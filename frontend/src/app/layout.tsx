import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyncBoard | Real-Time Collaborative Task Board",
  description: "A high-performance, real-time shared task board. Changes sync instantly across all devices without page refresh.",
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
