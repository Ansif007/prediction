"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, ArrowRight, Zap, Target, Globe, Bell, Calendar, Play, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import { Notice } from "@/types";
import { FootballIcon as Football } from "@/components/FootballIcon";

export default function Home() {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showTrailer, setShowTrailer] = useState(false);

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
        showToast(`Welcome, ${loggedInUser.displayName?.split(' ')[0]}!`, "info");
      })
      .catch((error) => {
        console.error("Login Error:", (error as { code: string }).code);
        showToast("Login Failed", "error");
      });
  };

  if (loading) return null;

  return (
    <main className="relative min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-80px)] overflow-hidden bg-white">
      {/* Hero Section with Image Background */}
      <div className="relative min-h-[95vh] flex items-center justify-center text-white pt-10 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200"
            alt="World Cup 2026 Stadium"
            fill
            className="object-cover scale-110 md:scale-100"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/80 via-red-900/40 to-white" />
          
          {/* Animated Background Elements */}
          <motion.div 
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-red-600/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              rotate: -360,
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -left-20 w-96 h-96 bg-red-400/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-5xl px-6 text-center space-y-8 md:space-y-12">
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-9xl font-black italic tracking-[0.1em] leading-[0.85] md:leading-none font-bebas uppercase drop-shadow-2xl"
            >
              MRF STAFF <br />
              RECREATION CLUB <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-red-200 to-white underline decoration-red-600 decoration-8 underline-offset-8">KOTTAYAM</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-xl md:text-3xl font-black italic uppercase tracking-[0.2em] text-white font-bebas">
                The Greatest Show on Earth
              </span>
              <div className="w-24 h-1 bg-red-600 rounded-full" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Trailer Trigger */}
            <button 
              onClick={() => setShowTrailer(true)}
              className="flex items-center gap-4 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/30 rounded-[2rem] hover:bg-white/20 transition-all group active:scale-95"
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-600 shadow-xl group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 fill-red-600" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-red-100">Watch the Trailer</div>
                <div className="text-sm font-bold uppercase tracking-wider">FIFA World Cup 2026</div>
              </div>
            </button>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm mx-auto sm:max-w-none">
              {user ? (
                <Link
                  href="/dashboard"
                  className="group w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-red-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 transition-all hover:scale-105 shadow-2xl shadow-red-500/40 active:scale-95 text-base font-bebas italic"
                >
                  Enter the Arena
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <button
                  onClick={login}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-white text-red-600 font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-50 transition-all hover:scale-105 shadow-2xl shadow-red-100 active:scale-95 text-base font-bebas italic"
                >
                  <Image src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} />
                  Sign in to Play
                </button>
              )}
              
              <Link
                href="/leaderboard"
                className="w-full sm:w-auto px-10 py-5 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/20 transition-all text-base font-bebas italic"
              >
                Leaderboard
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {showTrailer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10 backdrop-blur-xl"
            onClick={() => setShowTrailer(false)}
          >
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
              onClick={() => setShowTrailer(false)}
            >
              <X className="w-10 h-10" />
            </button>
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative w-full max-w-5xl aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/P_fB70-H13I?autoplay=1" 
                title="FIFA World Cup 26 Trailer" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notice Board Section */}
      {notices.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-30">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-red-100 rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-red-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                <Bell className="w-5 h-5 text-white animate-ring" />
              </div>
              <div>
                <h3 className="text-xl font-black italic tracking-tighter text-red-700 font-bebas leading-none uppercase">Arena Announcements</h3>
                <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Latest updates from the club</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {notices.map((notice, idx) => (
                <motion.div 
                  key={notice.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-5 rounded-3xl border-2 transition-all hover:scale-[1.02] ${
                    notice.type === 'alert' ? 'bg-red-50/50 border-red-100' :
                    notice.type === 'update' ? 'bg-blue-50/50 border-blue-100' :
                    'bg-green-50/50 border-green-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      notice.type === 'alert' ? 'bg-red-600 text-white' :
                      notice.type === 'update' ? 'bg-blue-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {notice.type}
                    </span>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-red-300 uppercase">
                      <Calendar className="w-3 h-3" />
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <h4 className="font-black italic text-red-700 uppercase tracking-tighter font-bebas text-lg leading-tight mb-2 line-clamp-1">
                    {notice.title}
                  </h4>
                  <p className="text-xs font-bold text-red-400 leading-relaxed line-clamp-2">
                    {notice.content}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* FIFA World Cup History Section */}
      <div className="max-w-7xl mx-auto px-6 relative z-20 pb-16 md:pb-20 pt-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-16"
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
      {/* Footer Branding */}
      <footer className="relative z-20 py-12 text-center border-t border-red-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100 mb-2">
              <Football className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-300">
              CREATED BY <span className="text-red-600">ANSIF</span>
            </p>
            <div className="w-12 h-0.5 bg-red-100 rounded-full mt-1" />
          </div>
        </div>
      </footer>
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
