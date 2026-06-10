import type { Metadata } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import SetupModal from "../components/SetupModal";
import { ToastProvider } from "../components/Toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas-neue",
});

export const metadata: Metadata = {
  title: "MRF SRC FIFA WORLD CUP'26",
  description: "Match prediction contest for MRF SRC, Kottayam",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bebasNeue.variable}`}>
      <body className="antialiased font-sans">
        <ToastProvider>
          <Navbar />
          <SetupModal />
          <div className="pt-20 min-h-screen">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
