"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Trophy, Users, ArrowRight, Zap, Target, Globe } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200"
            alt="World Cup Background"
            fill
            className="object-cover"
            priority
          />
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
                <Image src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} className="md:w-5 md:h-5" />
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

        {/* FIFA World Cup History Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 md:mt-32 space-y-16"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest">
                <Globe className="w-3 h-3" />
                Legendary History
              </div>
              <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-red-700 font-bebas leading-none uppercase">
                THE GREATEST SHOW <br />
                <span className="text-red-600 underline decoration-red-100 underline-offset-8">ON EARTH</span>
              </h2>
              <div className="space-y-4 text-red-400 font-medium leading-relaxed text-sm md:text-base">
                <p>
                  The FIFA World Cup™ is the pinnacle of international football, a tournament that unites the globe every four years. Since its inception in Uruguay in 1930, it has grown from a 13-team invitational to a global phenomenon followed by billions.
                </p>
                <p>
                  From the dominance of Brazil&apos;s &quot;Samba Football&quot; led by the legendary Pelé, to Diego Maradona&apos;s &quot;Hand of God&quot; and solo brilliance in 1986, the World Cup has been the stage for football&apos;s most iconic moments.
                </p>
                <p>
                  In 2022, we witnessed Lionel Messi fulfill his destiny in Qatar, leading Argentina to their third title in one of the greatest finals ever played. As we look toward 2026, the legacy of the beautiful game continues to inspire new generations of staff and players alike.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-red-50 shadow-lg group">
                  <Image 
                    src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=600" 
                    alt="World Cup Spirit" 
                    fill
                    className="object-cover grayscale hover:grayscale-0 transition-all duration-500 scale-110 hover:scale-100"
                  />
                </div>
                <div className="relative aspect-square rounded-3xl overflow-hidden border border-red-50 shadow-lg group">
                  <Image 
                    src="https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=600" 
                    alt="Stadium Atmosphere" 
                    fill
                    className="object-cover grayscale hover:grayscale-0 transition-all duration-500 scale-110 hover:scale-100"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="relative aspect-square rounded-3xl overflow-hidden border border-red-50 shadow-lg group">
                  <Image
                    src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=600"
                    alt="Victory Moment"
                    fill
                    className="object-cover grayscale hover:grayscale-0 transition-all duration-500 scale-110 hover:scale-100"
                  />
                </div>
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-red-50 shadow-lg group">
                  <Image
                    src="https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&q=80&w=600"
                    alt="Fan Passion"
                    fill
                    className="object-cover grayscale hover:grayscale-0 transition-all duration-500 scale-110 hover:scale-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Facts Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <FactCard title="First Host" value="Uruguay" year="1930" />
            <FactCard title="Most Titles" value="Brazil" year="5 Times" />
            <FactCard title="Current King" value="Argentina" year="2022" />
            <FactCard title="Next Battle" value="USA/CAN/MEX" year="2026" />
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function FactCard({ title, value, year }: { title: string, value: string, year: string }) {
  return (
    <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 text-center space-y-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-red-300">{title}</div>
      <div className="text-2xl font-black italic font-bebas text-red-700 leading-none">{value}</div>
      <div className="text-xs font-bold text-red-400">{year}</div>
    </div>
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
