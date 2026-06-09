"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowLeft, Target, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Match {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: Timestamp | Date | string;
  status: string;
  result: string | null;
  totalGoalsResult?: string;
}

function getTeamFlag(teamName: string) {
  const codes: Record<string, string> = {
    "argentina": "ar", "brazil": "br", "france": "fr", "germany": "de", "spain": "es",
    "england": "gb-eng", "portugal": "pt", "netherlands": "nl", "belgium": "be", "croatia": "hr",
    "morocco": "ma", "japan": "jp", "south korea": "kr", "korea": "kr", "usa": "us", "united states": "us",
    "mexico": "mx", "saudi arabia": "sa", "australia": "au", "senegal": "sn", "poland": "pl",
    "switzerland": "ch", "denmark": "dk", "tunisia": "tn", "canada": "ca", "wales": "gb-wls",
    "qatar": "qa", "ecuador": "ec", "iran": "ir", "ghana": "gh", "cameroon": "cm", "serbia": "rs",
    "costa rica": "cr", "uruguay": "uy", "italy": "it", "india": "in"
  };
  const code = codes[teamName.toLowerCase()];
  return code ? `https://flagcdn.com/w160/${code}.png` : `https://api.dicebear.com/7.x/identicon/svg?seed=${teamName}&backgroundColor=fef2f2`;
}

export default function PredictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [match, setMatch] = useState<Match | null>(null);
  const [winnerPrediction, setWinnerPrediction] = useState("");
  const [goalsPrediction, setGoalsPrediction] = useState("");
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
        setMatch({ id: docSnap.id, ...data } as Match);
        const kickoff = data.kickoffTime instanceof Timestamp 
          ? data.kickoffTime.toDate() 
          : new Date(data.kickoffTime);
        const lockTime = new Date(kickoff.getTime() - 10 * 60 * 1000);
        setIsLocked(new Date() >= lockTime);
      }
    };

    const checkStatus = async () => {
      const user = auth.currentUser;
      if (user) {
        // Check Admin
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");

        // Check Prediction
        const predRef = doc(db, "predictions", `${user.uid}_${id}`);
        const predSnap = await getDoc(predRef);
        if (predSnap.exists()) {
          const data = predSnap.data();
          setWinnerPrediction(data.winnerPrediction || data.prediction);
          setGoalsPrediction(data.goalsPrediction || "");
          setSubmitted(true);
        }
      }
    };

    loadMatch();
    checkStatus();
  }, [id]);

  const handleSubmit = async () => {
    if (isLocked || isAdmin) return;
    if (!winnerPrediction || !goalsPrediction) return;
    const user = auth.currentUser;
    if (!user) return;
    
    setSubmitting(true);
    try {
      const predictionId = `${user.uid}_${id}`;
      await setDoc(doc(db, "predictions", predictionId), {
        matchId: id,
        uid: user.uid,
        winnerPrediction,
        goalsPrediction,
        prediction: winnerPrediction, // Compatibility
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
              You chose <span className="text-red-600">{winnerPrediction}</span> & <span className="text-red-600">{goalsPrediction} Goals</span>
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
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-red-700 font-bebas uppercase leading-none flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-3">
                  <img src={getTeamFlag(match.teamA)} alt={match.teamA} className="w-10 h-6 md:w-16 md:h-10 object-cover rounded shadow-sm" />
                  {match.teamA}
                </div>
                <span className="text-red-600 italic">VS</span>
                <div className="flex items-center gap-3">
                  {match.teamB}
                  <img src={getTeamFlag(match.teamB)} alt={match.teamB} className="w-10 h-6 md:w-16 md:h-10 object-cover rounded shadow-sm" />
                </div>
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
                {match.status === 'completed' && match.totalGoalsResult && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-100 text-[10px] font-black uppercase tracking-widest">
                    <Trophy className="w-3.5 h-3.5" />
                    Total Goals: {match.totalGoalsResult}
                  </div>
                )}
              </div>
            </header>

            <div className="grid gap-6 md:gap-8 mb-8 md:mb-12">
              {/* Winner Prediction */}
              <section className="bg-white p-6 md:p-8 rounded-[2rem] border border-red-50 card-shadow">
                <h2 className="text-xl font-black italic tracking-tighter text-red-700 font-bebas mb-6 uppercase flex items-center gap-3">
                  <Target className="w-5 h-5 text-red-600" />
                  Who Wins? <span className="text-xs text-red-400 normal-case font-bold ml-auto">(2 Points)</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[match.teamA, "DRAW", match.teamB].map((option) => (
                    <button
                      key={option}
                      disabled={isLocked || isAdmin}
                      onClick={() => setWinnerPrediction(option)}
                      className={`p-6 rounded-2xl font-black italic text-xl uppercase tracking-tighter font-bebas transition-all border-2 ${
                        winnerPrediction === option
                          ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-200"
                          : "bg-red-50 text-red-700 border-transparent hover:border-red-200"
                      } ${(isLocked || isAdmin) ? "cursor-not-allowed opacity-80" : "active:scale-95"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>

              {/* Goals Prediction */}
              <section className="bg-white p-6 md:p-8 rounded-[2rem] border border-red-50 card-shadow">
                <h2 className="text-xl font-black italic tracking-tighter text-red-700 font-bebas mb-6 uppercase flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-red-600" />
                  Total Goals? <span className="text-xs text-red-400 normal-case font-bold ml-auto">(1 Point)</span>
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {["0", "1", "2", "3", "4+"].map((option) => (
                    <button
                      key={option}
                      disabled={isLocked || isAdmin}
                      onClick={() => setGoalsPrediction(option)}
                      className={`py-4 rounded-xl font-black italic text-lg uppercase tracking-tighter font-bebas transition-all border-2 ${
                        goalsPrediction === option
                          ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-200"
                          : "bg-red-50 text-red-700 border-transparent hover:border-red-200"
                      } ${(isLocked || isAdmin) ? "cursor-not-allowed opacity-80" : "active:scale-95"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-red-100 md:relative md:p-0 md:bg-transparent md:border-0">
              {isAdmin ? (
                <div className="w-full py-4 md:py-6 bg-red-50 text-red-600 font-black uppercase tracking-widest text-center rounded-xl md:rounded-3xl border-2 border-dashed border-red-200">
                  Admins Cannot Participate
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isLocked || !winnerPrediction || !goalsPrediction || submitting}
                  className={`w-full py-4 md:py-6 rounded-xl md:rounded-3xl font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-base md:text-lg transition-all shadow-2xl active:scale-[0.98] ${
                    isLocked || !winnerPrediction || !goalsPrediction || submitting
                      ? "bg-red-50 text-red-200 cursor-not-allowed shadow-none border border-red-100"
                      : "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
                  }`}
                >
                  {submitting ? "Locking in..." : isLocked ? "Battle Started" : "Lock Predictions"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

