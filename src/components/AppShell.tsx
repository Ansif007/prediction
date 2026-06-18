"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import TopHeader from "./TopHeader";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthed(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isSetupOrAdmin = pathname === "/setup" || pathname === "/admin" || pathname.startsWith("/admin/");

  if (loading) {
    return <div className="min-h-screen bg-white" />;
  }

  if (isSetupOrAdmin || !authed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white">
      <TopHeader />
      <main className="pb-20 lg:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
