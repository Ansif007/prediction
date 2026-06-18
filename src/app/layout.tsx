import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "../components/AppShell";
import { ToastProvider } from "../components/Toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "MRF STAFF RECREATION CLUB FIFA WORLD CUP'26",
  description: "Match prediction contest for MRF Staff Recreation Club, Kottayam",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="antialiased font-sans">
        <ToastProvider>
          <AppShell>
            {children}
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
