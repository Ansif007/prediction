"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowLeft, Target, Timer, CheckCircle2, AlertCircle, Star } from "lucide-react";
import Link from "next/link";

interface Match {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: any;
  status: string;
  result: string | null;
  playerOfTheMatch?: string;
}

export default function PredictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [match, setMatch] = useState<Match | null>(null);
  const [prediction, setPrediction] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadMatch = async () => {
      const docRef = doc(db, "matches", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMatch(data);
        const kickoff = data.kickoffTime instanceof Timestamp 
          ? data.kickoffTime.toDate() 
          : new Date(data.kickoffTime);
        const lockTime = new Date(kickoff.getTime() - 10 * 60 * 1000);
        setIsLocked(new Date() >= lockTime);
      }
    };

    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");
      }
    };

    loadMatch();
    checkAdmin();
  }, [id]);

  const handleSubmit = async () => {
    if (isLocked) return;
    if (!prediction) return;
    const user = auth.currentUser;
    if (!user) return;
    
    setSubmitting(true);
    try {
      const predictionId = `${user.uid}_${id}`;
      await setDoc(doc(db, "predictions", predictionId), {
        matchId: id,
        uid: user.uid,
        prediction,
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12 pb-24 md:pb-12">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-red-300 hover:text-red-600 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-6 md:mb-8 transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Arena
      </Link>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 md:py-20 px-6 md:px-8 rounded-[2rem] md:rounded-[3rem] bg-white border border-red-100 card-shadow"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl shadow-red-200">
              <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-red-700 font-bebas mb-3 md:mb-4">
              PREDICTION <span className="text-red-600">LOCKED</span>
            </h2>
            <p className="text-xs md:text-sm text-red-400 font-bold uppercase tracking-widest mb-8 md:mb-12">
              You chose <span className="text-red-600">{prediction}</span> to win!
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-8 md:px-10 py-3.5 md:py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-red-700 transition-all active:scale-95 text-sm shadow-xl shadow-red-200"
            >
              Return to Matches
            </Link>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <header className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] md:text-xs font-black uppercase tracking-widest">
                <Target className="w-3 h-3" />
                Battle Prediction
              </div>
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-red-700 font-bebas uppercase leading-none">
                {match.teamA} <span className="text-red-600 italic">VS</span> {match.teamB}
              </h1>
              {/* Status Badge */}
              <div className="flex flex-col items-center gap-2">
                <div className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${
                  match.status === 'completed' ? 'bg-red-50 text-red-600 border-red-100' : 
                  match.status === 'live' ? 'bg-red-600 text-white border-red-600 animate-pulse' :
                  'bg-white text-red-300 border-red-50'
                }`}>
                  {match.status}
                </div>
                {match.status === 'completed' && match.playerOfTheMatch && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-50 text-yellow-700 border border-yellow-100 text-[10px] font-black uppercase tracking-widest">
                    <Star className="w-3.5 h-3.5 fill-yellow-500" />
                    Player of the Match: {match.playerOfTheMatch}
                  </div>
                )}
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-8 md:mb-12">
              <PredictionOption 
                team={match.teamA} 
                active={prediction === match.teamA}
                onClick={() => !isLocked && setPrediction(match.teamA)}
                disabled={isLocked}
                color="red"
              />
              <PredictionOption 
                team="DRAW" 
                active={prediction === "DRAW"}
                onClick={() => !isLocked && setPrediction("DRAW")}
                disabled={isLocked}
                color="draw"
              />
              <PredictionOption 
                team={match.teamB} 
                active={prediction === match.teamB}
                onClick={() => !isLocked && setPrediction(match.teamB)}
                disabled={isLocked}
                color="teamB"
              />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-red-100 md:relative md:p-0 md:bg-transparent md:border-0">
              {isAdmin ? (
                <div className="w-full py-4 md:py-6 bg-red-50 text-red-600 font-black uppercase tracking-widest text-center rounded-xl md:rounded-3xl border-2 border-dashed border-red-200">
                  Admins Cannot Participate
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isLocked || !prediction || submitting}
                  className={`w-full py-4 md:py-6 rounded-xl md:rounded-3xl font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-base md:text-lg transition-all shadow-2xl active:scale-[0.98] ${
                    isLocked || !prediction || submitting
                      ? "bg-red-50 text-red-200 cursor-not-allowed shadow-none border border-red-100"
                      : "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
                  }`}
                >
                  {submitting ? "Locking in..." : isLocked ? "Battle Started" : "Lock Prediction"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function PredictionOption({ team, active, onClick, disabled, color }: { team: string, active: boolean, onClick: () => void, disabled: boolean, color: string }) {
  const colorClasses = {
    red: "hover:border-red-500 bg-red-50/30",
    draw: "hover:border-red-400 bg-red-50/20",
    teamB: "hover:border-red-500 bg-red-50/30"
  }[color as 'red' | 'draw' | 'teamB'];

  const activeClasses = {
    red: "border-red-600 bg-red-600 text-white shadow-xl shadow-red-200",
    draw: "border-red-800 bg-red-800 text-white shadow-xl shadow-red-200",
    teamB: "border-red-600 bg-red-600 text-white shadow-xl shadow-red-200"
  }[color as 'red' | 'draw' | 'teamB'];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border-2 transition-all flex flex-row md:flex-col items-center justify-center md:justify-center gap-4 ${
        active 
          ? activeClasses 
          : `border-red-50 bg-white text-red-700 ${!disabled && colorClasses}`
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} w-full`}
    >
      <div className={`w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-2xl flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-red-50'}`}>
        <img 
          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${team}&backgroundColor=${active ? 'ffffff' : 'fef2f2'}`} 
          alt={team} 
          className="w-6 h-6 md:w-10 md:h-10"
        />
      </div>
      <span className="text-xl md:text-2xl font-black italic uppercase tracking-tighter font-bebas truncate">
        {team}
      </span>
      {active && <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 animate-bounce md:mt-2 shrink-0" />}
    </button>
  );
}