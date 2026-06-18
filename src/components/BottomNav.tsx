"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Trophy, User } from "lucide-react";

const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Matches", href: "/dashboard", icon: Swords },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Profile", href: "/profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/setup" || pathname === "/admin" || pathname.startsWith("/admin/")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-red-100 safe-area-bottom lg:hidden">
      <div className="flex items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                isActive ? "text-red-600" : "text-red-300 hover:text-red-400"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "fill-red-600/10" : ""}`} />
              <span
                className={`text-[10px] font-black uppercase tracking-widest leading-tight ${
                  isActive ? "text-red-600" : "text-red-300"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
