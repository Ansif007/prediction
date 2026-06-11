"use client";

import { useEffect, useState, use } from "react";
import { 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp, 
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Users, 
  Calendar, 
  ArrowLeft, 
  Target, 
  Zap, 
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlayCircle,
  Download,
  Copy
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Match } from "@/types";
import { getTeamFlag } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { useMobileBackToHome } from "@/hooks/useMobileBackToHome";

export default function PredictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  useMobileBackToHome();
  const router = useRouter();
  const { showToast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [goals, setGoals] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showSuccess, setShowAddSuccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMatch = async () => {
      const docRef = doc(db, "matches", id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setMatch({ id: docSnap.id, ...data } as Match);
        const kickoff = data.kickoffTime instanceof Timestamp 
          ? data.kickoffTime.toDate() 
          : new Date(data.kickoffTime);
        
        // Lock 1 minute before kickoff
        const lockTime = new Date(kickoff.getTime() - 1 * 60000);
        setIsLocked(new Date() > lockTime || data.status === 'completed' || data.status === 'live');

        if (user) {
          const predRef = doc(db, "predictions", `${user.uid}_${id}`);
          const predSnap = await getDoc(predRef);
          if (predSnap.exists()) {
            const predData = predSnap.data();
            setPrediction(predData.winnerPrediction);
            setGoals(predData.goalsPrediction);
            if (predData.pointsAwarded) {
              setPointsEarned(predData.pointsEarned);
            }
          }
        }
      }
      setLoading(false);
    };

    if (id) fetchMatch();
  }, [id, user]);

  const handleSubmit = async () => {
    if (!user || !prediction || !goals || isLocked || isAdmin) return;

    setSubmitting(true);
    try {
      await setDoc(doc(db, "predictions", `${user.uid}_${id}`), {
        uid: user.uid,
        matchId: id,
        winnerPrediction: prediction,
        goalsPrediction: goals,
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      showToast("Battle Prediction Locked!", "success");
      setShowAddSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (error) {
      console.error("Error saving prediction:", error);
      showToast("Deployment Failed. Try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );

  if (!match) return <div className="text-center py-20">Match not found</div>;

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 md:py-12">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-red-300 hover:text-red-600 font-black uppercase tracking-widest text-[10px] mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Arena
      </Link>

      <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] border border-red-50 card-shadow overflow-hidden">
        {/* Match Header */}
        <div className="bg-red-50/30 px-6 py-12 md:py-16 text-center border-b border-red-50">
          {match.status === 'completed' ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-red-50 relative overflow-hidden">
                 <Image 
                   src="/football.png" 
                   alt="Football"
                   fill
                   className="object-contain p-4"
                 />
               </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-[0.2em] text-red-700 font-bebas leading-none">
                  Battle Results
                </h1>
                <p className="text-[10px] font-bold text-red-300 uppercase tracking-[0.3em]">
                  {match.teamA} vs {match.teamB}
                </p>
              </div>

              <div className="w-full max-w-xl bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-red-100 overflow-hidden shadow-2xl shadow-red-200/50">
                <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-1 text-center md:text-left">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300">Winner</span>
                    <div className="text-3xl font-black italic uppercase tracking-wider text-red-700 font-bebas">
                      {match.result || "DRAW"}
                    </div>
                  </div>
                  <div className="space-y-1 text-center md:text-left">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300">Total Goals</span>
                    <div className="text-3xl font-black italic uppercase tracking-wider text-red-700 font-bebas">
                      {match.totalGoalsResult}
                    </div>
                  </div>
                  {pointsEarned !== null && (
                    <div className="col-span-full pt-8 border-t border-red-100 flex flex-col items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600">Your Prediction Performance</span>
                      <div className="text-5xl font-black italic text-green-600 font-bebas">
                        +{pointsEarned} <span className="text-xl">PTS</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-red-50/50 px-8 py-4 flex items-center justify-center gap-6 border-t border-red-50">
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors">
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${
                  match.status === 'live' ? 'bg-red-600 text-white border-red-600 animate-pulse' :
                  'bg-white text-red-300 border-red-50'
                }`}>
                  {match.status}
                </div>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black italic tracking-[0.1em] text-red-700 font-bebas uppercase leading-[1.1] flex flex-wrap items-center justify-center gap-4 overflow-visible">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-6 md:w-16 md:h-10 overflow-hidden rounded shadow-sm">
                    <Image src={getTeamFlag(match.teamA)} alt={match.teamA} fill className="object-cover" />
                  </div>
                  {match.teamA}
                </div>
                <span className="text-red-600 italic">VS</span>
                <div className="flex items-center gap-3">
                  {match.teamB}
                  <div className="relative w-10 h-6 md:w-16 md:h-10 overflow-hidden rounded shadow-sm">
                    <Image src={getTeamFlag(match.teamB)} alt={match.teamB} fill className="object-cover" />
                  </div>
                </div>
              </h1>
            </div>
          )}
        </div>

        <div className="p-6 md:p-12 space-y-12">
          {/* Winner Prediction */}
          <section>
            <h2 className="text-xl font-black italic tracking-[0.1em] text-red-700 font-bebas mb-6 uppercase flex items-center gap-3">
              <Target className="w-5 h-5 text-red-600" />
              PREDICT THE OUTCOME OF THE MATCH <span className="text-xs text-red-400 normal-case font-bold ml-auto tracking-normal">(2 Points)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[match.teamA, "DRAW", match.teamB].map((option) => (
                <button
                  key={option}
                  disabled={isLocked || isAdmin}
                  onClick={() => setPrediction(option)}
                  className={`p-6 rounded-[2rem] border-2 transition-all text-center relative group ${
                    prediction === option
                      ? "bg-red-600 border-red-600 text-white shadow-xl shadow-red-200 scale-105"
                      : "bg-white border-red-50 text-red-700 hover:border-red-200"
                  } ${isLocked || isAdmin ? 'cursor-default' : 'hover:scale-[1.02]'}`}
                >
                  {prediction === option && isLocked && (
                    <div className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full p-1 shadow-md z-10">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  <div className={`text-lg font-black italic uppercase tracking-tighter font-bebas ${
                    prediction === option ? "text-white" : "text-red-700"
                  }`}>
                    {option}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Goals Prediction */}
          <section>
            <h2 className="text-xl font-black italic tracking-[0.1em] text-red-700 font-bebas mb-6 uppercase flex items-center gap-3">
              <Trophy className="w-5 h-5 text-red-600" />
              HOW MANY GOALS WOULD BE SCORED IN TOTAL ? <span className="text-xs text-red-400 normal-case font-bold ml-auto tracking-normal">(1 Point)</span>
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
              {["0", "1", "2", "3", "4+"].map((num) => (
                <button
                  key={num}
                  disabled={isLocked || isAdmin}
                  onClick={() => setGoals(num)}
                  className={`py-4 md:py-6 rounded-2xl md:rounded-[1.5rem] border-2 transition-all relative group ${
                    goals === num
                      ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100 scale-105"
                      : "bg-white border-red-50 text-red-700 hover:border-red-200"
                  } ${isLocked || isAdmin ? 'cursor-default' : 'hover:scale-[1.02]'}`}
                >
                  {goals === num && isLocked && (
                    <div className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full p-0.5 shadow-md z-10">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-xl md:text-2xl font-black font-bebas">{num}</div>
                  <div className={`text-[8px] font-bold uppercase tracking-widest ${
                    goals === num ? "text-red-100" : "text-red-300"
                  }`}>Goals</div>
                </button>
              ))}
            </div>
          </section>

          {/* Submit Button */}
          {!isLocked && !isAdmin && (
            <div className="pt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting || !prediction || !goals}
                className={`w-full py-5 rounded-[1.5rem] md:rounded-2xl font-black uppercase tracking-[0.2em] transition-all active:scale-95 text-sm md:text-base shadow-2xl ${
                  submitting || !prediction || !goals
                    ? "bg-red-50 text-red-200 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
                }`}
              >
                {submitting ? "Deploying..." : prediction ? "Update Prediction" : "Lock in Prediction"}
              </button>
            </div>
          )}

          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-green-600 font-black uppercase tracking-widest text-[10px] bg-green-50 py-4 rounded-2xl border border-green-100"
              >
                <CheckCircle2 className="w-4 h-4" />
                Prediction Secured Successfully
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
