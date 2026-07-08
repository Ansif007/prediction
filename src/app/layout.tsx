import type { Metadata } from "next";
import { DM_Sans, Bebas_Neue, Anton, Oswald, Space_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import { ToastProvider } from "../components/Toast";
import { AuthProvider } from "@/contexts/AuthContext";

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

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
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
    <html lang="en" className={`${dmSans.variable} ${bebasNeue.variable} ${anton.variable} ${oswald.variable} ${spaceMono.variable}`}>
      <body className="antialiased font-sans">
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <div className="pt-20 min-h-screen">
              {children}
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
