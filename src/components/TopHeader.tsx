"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Image from "next/image";

export default function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && pathname !== "/setup" && pathname !== "/" && !pathname.startsWith("/admin")) {
        setIsVisible(true);
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");
      } else if (user && pathname === "/") {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    });
    return () => unsubscribe();
  }, [pathname]);

  if (!isVisible) return null;

  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-red-50">
      <div className="flex items-center justify-between h-12 px-4 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-7 h-7">
            <Image src="/football.png" alt="MRF STAFF RECREATION CLUB" fill className="object-contain" />
          </div>
          <span className="text-[10px] sm:text-xs font-black tracking-tight text-red-700 font-sans leading-none whitespace-nowrap">
            MRF <span className="text-red-600">STAFF RECREATION CLUB</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {[
            { label: "Home", href: "/" },
            { label: "Matches", href: "/dashboard" },
            { label: "Leaderboard", href: "/leaderboard" },
            { label: "Profile", href: "/profile" },
          ].map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                  isActive
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-red-400 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500"
              title="Admin Panel"
            >
              <ShieldCheck className="w-4 h-4" />
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
