import type { Metadata } from "next";
import { DM_Sans, Bebas_Neue } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import SetupModal from "../components/SetupModal";

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
  title: "PredictPro | Match Prediction App",
  description: "Predict match results and compete with others",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${bebasNeue.variable}`}>
      <body className="antialiased font-sans">
        <Navbar />
        <SetupModal />
        <div className="pt-20 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
