import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../components/Navbar";
import SetupModal from "../components/SetupModal";

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
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Navbar />
        <SetupModal />
        <div className="pt-20 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}