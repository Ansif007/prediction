"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Trophy, ArrowRight, Globe, Bell, Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import { Notice } from "@/types";

export default function Home() {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const q = query(collection(db, "notices"), limit(3));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notice));
        setNotices(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotices();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = () => {
    signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        const loggedInUser = result.user;
        const userRef = doc(db, "users", loggedInUser.uid);
        const userSnap = await getDoc(userRef);
        
        await setDoc(userRef, {
          uid: loggedInUser.uid,
          name: loggedInUser.displayName || "",
          email: loggedInUser.email || "",
          role: userSnap.exists() ? userSnap.data().role : "user",
          totalPoints: userSnap.exists() ? userSnap.data().totalPoints : 0,
          createdAt: userSnap.exists() ? userSnap.data().createdAt : new Date().toISOString(),
        }, { merge: true });

        showToast(`Welcome back!`, "info");
      })
      .catch((error) => {
        console.error("Login Error:", (error as { code: string }).code);
        showToast("Login Failed", "error");
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-visible bg-white text-slate-900">
      {/* Background Hero */}
      <div className="relative min-h-[95vh] flex items-center justify-center pt-10 pb-28 overflow-visible">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1600"
            alt="World Cup Stadium"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/80 via-red-900/40 to-white" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="relative z-10 max-w-5xl px-6 text-center space-y-12">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-1 px-4 md:px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs md:text-sm font-black uppercase tracking-wide md:tracking-[0.3em] text-white mb-6"
            >
              <span>MRF STAFF RECREATION CLUB</span>
              <span>KOTTAYAM</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] uppercase font-dm-sans text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] overflow-visible"
            >
              WORLD CUP <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-red-100 to-white underline decoration-red-600 decoration-8 underline-offset-8">PREDICTION CONTEST</span>
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-8"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm sm:max-w-none">
              {user ? (
                <Link
                  href="/dashboard"
                  className="group w-full sm:w-auto flex items-center justify-center gap-2 md:gap-3 px-6 md:px-10 py-4 md:py-5 bg-red-600 text-white font-bold uppercase tracking-tight md:tracking-[0.15em] rounded-2xl hover:bg-red-700 transition-all hover:scale-105 shadow-2xl shadow-red-500/40 active:scale-95 text-sm md:text-base font-bebas italic whitespace-nowrap"
                >
                  Enter the Arena
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              ) : (
                <button
                  onClick={login}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 md:gap-4 px-8 md:px-14 py-5 md:py-7 bg-white text-red-600 font-bold uppercase tracking-tight md:tracking-[0.15em] rounded-2xl hover:bg-red-50 transition-all hover:scale-105 shadow-2xl shadow-red-100 active:scale-95 text-lg md:text-2xl font-bebas italic whitespace-nowrap"
                >
                  <Image src="https://www.google.com/favicon.ico" alt="Google" width={24} height={24} className="md:w-7 md:h-7" />
                  Sign in to Play
                </button>
              )}
              
              <Link
                href="/leaderboard"
                className="w-full sm:w-auto px-6 md:px-10 py-4 md:py-5 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white font-bold uppercase tracking-tight md:tracking-[0.15em] rounded-2xl hover:bg-white/20 transition-all text-sm md:text-base font-bebas italic shadow-xl whitespace-nowrap"
              >
                Leaderboard
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Notice Section */}
      {notices.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 -mt-10 relative z-30 pb-20">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-red-100 border border-red-50">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider text-red-900 font-bebas italic">Arena Notices</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {notices.map((notice) => (
                <div key={notice.id} className="p-6 rounded-2xl bg-red-50/50 border border-red-100 hover:bg-red-50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-1 rounded bg-red-600 text-[8px] font-black uppercase tracking-widest text-white">
                      {notice.type}
                    </span>
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-red-900 mb-2 line-clamp-1">{notice.title}</h4>
                  <p className="text-xs text-red-700/70 leading-relaxed line-clamp-2">{notice.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Historical Spectacle Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 relative z-20 border-t border-red-50 bg-slate-50/30">
        <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-tight md:tracking-[0.15em] whitespace-nowrap">
              <Globe className="w-3.5 h-3.5" />
              Tournament Legacy
            </div>
            <div className="space-y-6">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-red-900 font-dm-sans leading-[1.15] overflow-visible">
                THE GREATEST SHOW <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">ON THE PLANET</span>
              </h2>
              <div className="rounded-[2.5rem] bg-white/95 p-8 border border-red-50 shadow-[0_30px_60px_-40px_rgba(220,38,38,0.35)]">
                <p className="text-red-900/80 text-sm md:text-base leading-relaxed font-medium">
                  The FIFA World Cup™ stands as the absolute apex of international football, a global battlefield that unites and ignites nations every four years. Since its historic 1930 dawn in Uruguay, it has evolved into a multi-billion consumer phenomenon.
                </p>
                <p className="mt-4 text-red-900/80 text-sm md:text-base leading-relaxed font-medium">
                  As we approach the historic 2026 expansion across USA, Canada, and Mexico, the stage is set for the largest tournament in history. Our club honors this legacy by bringing the excitement of prediction directly to you.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-[2rem] border border-red-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
                <div className="text-[10px] font-black uppercase tracking-widest text-red-300 mb-3">First Host</div>
                <div className="text-3xl md:text-4xl font-black text-red-900 font-bebas italic">URUGUAY</div>
                <div className="mt-3 text-xs md:text-sm font-bold text-red-400">1930</div>
              </div>
              <div className="rounded-[2rem] border border-red-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
                <div className="text-[10px] font-black uppercase tracking-widest text-red-300 mb-3">Most Titles</div>
                <div className="text-3xl md:text-4xl font-black text-red-900 font-bebas italic">BRAZIL</div>
                <div className="mt-3 text-xs md:text-sm font-bold text-red-400">5 TIMES</div>
              </div>
              <div className="rounded-[2rem] border border-red-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
                <div className="text-[10px] font-black uppercase tracking-widest text-red-300 mb-3">Current King</div>
                <div className="text-3xl md:text-4xl font-black text-red-900 font-bebas italic">ARGENTINA</div>
                <div className="mt-3 text-xs md:text-sm font-bold text-red-400">2022</div>
              </div>
              <div className="rounded-[2rem] border border-red-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
                <div className="text-[10px] font-black uppercase tracking-widest text-red-300 mb-3">Next Battle</div>
                <div className="text-3xl md:text-4xl font-black text-red-900 font-bebas italic">2026</div>
                <div className="mt-3 text-xs md:text-sm font-bold text-red-400">NORTH AMERICA</div>
              </div>
            </div>
          </div>

          {/* Grayscale Imagery Grid */}
          <div className="grid grid-cols-2 gap-4 md:gap-6 relative">
            <div className="space-y-4 md:space-y-6">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border-2 border-white shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=600"
                  alt="World Cup Spirit"
                  fill
                  className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
              <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-white shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=600"
                  alt="Stadium Atmosphere"
                  fill
                  className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>
            <div className="space-y-4 md:space-y-6 pt-12">
              <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-white shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=600"
                  alt="Victory Moment"
                  fill
                  className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border-2 border-white shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&q=80&w=600"
                  alt="Fan Passion"
                  fill
                  className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="relative z-20 py-12 text-center border-t border-red-50 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-2">
            
              
            <p className="text-[10px] font-black uppercase tracking-widest text-red-300">
              CREATED BY <span className="text-red-600">ANSIF</span>
            </p>
            <div className="w-12 h-0.5 bg-red-100 rounded-full mt-1" />
          </div>
        </div>
      </footer>
    </main>
  );
}
