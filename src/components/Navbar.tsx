"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { LayoutDashboard, Trophy, LogOut, User as UserIcon, Home, CircleDot as Football, Menu, X, ShieldCheck } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "./Toast";

export default function Navbar() {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    showToast("Signed out successfully", "info");
    setIsMenuOpen(false);
  };

  const navItems = [
    { name: "Home", href: "/", icon: Home },
  ];

  if (user) {
    // Both Admins and Users can see Arena and Leaderboard
    navItems.push(
      { name: "Arena", href: "/dashboard", icon: LayoutDashboard },
      { name: "Leaderboard", href: "/leaderboard", icon: Trophy }
    );
    
    // Only Users see Profile
    if (!isAdmin) {
      navItems.push({ name: "Profile", href: "/profile", icon: UserIcon });
    }
  }

  if (isAdmin) {
    navItems.push({ name: "Admin", href: "/admin", icon: ShieldCheck });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-red-100 px-4 md:px-6 py-2 md:py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsMenuOpen(false)}>
          <div className="w-9 h-9 md:w-11 md:h-11 bg-red-600 rounded-xl flex items-center justify-center group-hover:rotate-[360deg] transition-all duration-700 shadow-lg shadow-red-200">
            <Football className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base md:text-xl font-black tracking-[0.05em] text-red-600 leading-[0.9] uppercase font-bebas">
              MRF STAFF <br />
              <span className="text-red-800">RECREATION CLUB</span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em] transition-all px-4 py-2 rounded-lg ${
                  isActive 
                    ? "bg-red-600 text-white shadow-md shadow-red-200" 
                    : "text-red-500 hover:text-red-700 hover:bg-red-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 pl-2 pr-4 py-1 rounded-full bg-red-50 border border-red-100">
                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center">
                  {isAdmin ? <ShieldCheck className="w-4 h-4 text-white" /> : <UserIcon className="w-4 h-4 text-white" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-red-700 leading-none">
                    {user.displayName?.split(" ")[0]}
                  </span>
                  {isAdmin && <span className="text-[7px] font-black uppercase text-red-400 leading-none mt-0.5">Admin</span>}
                </div>
              </div>
              <Link
                href="/profile"
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Your Profile"
              >
                <UserIcon className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors border border-transparent hover:border-red-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/"
              className="hidden md:block px-6 py-2.5 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
            >
              Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-xl bg-red-50 border border-red-100 text-red-600 md:hidden"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-red-100 p-4 md:hidden shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-2xl text-base font-black italic uppercase tracking-tighter font-bebas ${
                    isActive 
                      ? "bg-red-600 text-white" 
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
            
            {user ? (
              <div className="mt-4 pt-4 border-t border-red-100 flex flex-col gap-4">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black italic uppercase tracking-tighter text-red-800 font-bebas leading-none">
                      {user.displayName}
                    </span>
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      Member
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-3 w-full py-4 bg-red-50 text-red-600 font-black italic uppercase tracking-tighter font-bebas rounded-2xl border border-red-100"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="mt-4 w-full py-4 bg-red-600 text-white text-center font-black italic uppercase tracking-tighter font-bebas rounded-2xl shadow-lg shadow-red-200"
              >
                Sign In to Start
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
