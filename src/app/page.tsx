"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../lib/firebase";
import { motion } from "framer-motion";
import { Trophy, Users, ArrowRight, Zap, Target } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: loggedInUser.uid,
            name: loggedInUser.displayName || "",
            email: loggedInUser.email || "",
            role: "user",
            totalPoints: 0,
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch((error) => {
        console.error("Login Error:", (error as { code: string }).code);
      });
  };

  if (loading) return null;

  return (
    <main className="relative min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-80px)] overflow-hidden">
      {/* Hero Section with Image Background */}
      <div className="relative min-h-[90vh] md:h-[85vh] flex items-center justify-center text-white pt-10 pb-20 md:py-0">
        <div className="absolute inset-0 bg-worldcup">
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/70 via-red-900/50 to-white" />
        </div>

        <div className="relative z-10 max-w-5xl px-6 text-center space-y-6 md:space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]"
          >
            <Zap className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-yellow-400" />
            Official Internal Contest
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-8xl font-black italic tracking-tighter leading-[0.9] md:leading-none font-bebas"
          >
            MRF STAFF RECREATION <br />
            <span className="text-white underline decoration-red-600 decoration-4 md:decoration-8 underline-offset-4 md:underline-offset-8">CLUB KOTTAYAM</span> <br />
            PREDICTION CHALLENGE
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-base md:text-xl font-bold text-white/90 max-w-2xl mx-auto drop-shadow-lg px-4"
          >
            Predict results, earn points, and compete with your colleagues. 
            The beautiful game meets office glory.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-4 md:pt-6 w-full max-w-sm mx-auto sm:max-w-none"
          >
            {user ? (
              <Link
                href="/dashboard"
                className="group w-full sm:w-auto flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all hover:scale-105 shadow-2xl shadow-red-500/40 active:scale-95 text-sm md:text-base"
              >
                Go to Arena
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <button
                onClick={login}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-white text-red-600 font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all hover:scale-105 shadow-2xl shadow-red-100 active:scale-95 text-sm md:text-base"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 md:w-5 md:h-5" />
                Sign in with Google
              </button>
            )}
            
            <Link
              href="/leaderboard"
              className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white/20 transition-all text-sm md:text-base"
            >
              Leaderboard
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Stats/Features Section */}
      <div className="max-w-7xl mx-auto px-6 -mt-10 md:-mt-20 relative z-20 pb-16 md:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          <FeatureCard 
            icon={<Target className="w-6 h-6 md:w-8 md:h-8 text-red-600" />}
            title="Predict Matches"
            desc="Submit your scores before kickoff. Every goal counts towards your rank."
            color="bg-red-50"
          />
          <FeatureCard 
            icon={<Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />}
            title="Win Prizes"
            desc="Top 3 predictors win exclusive company rewards and the bragging rights."
            color="bg-yellow-50"
          />
          <FeatureCard 
            icon={<Users className="w-6 h-6 md:w-8 md:h-8 text-red-400" />}
            title="Office Rivalry"
            desc="See how you stack up against your team and the whole department."
            color="bg-red-50"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white border border-red-100 card-shadow text-left group transition-all`}
    >
      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl ${color} flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-red-700 mb-2 md:mb-3 font-bebas">{title}</h3>
      <p className="text-sm md:text-base text-red-400 font-medium leading-relaxed">{desc}</p>
    </motion.div>
  );
}