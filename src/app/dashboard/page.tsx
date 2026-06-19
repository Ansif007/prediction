"use client";

import { useEffect, useState } from "react";
import { 
  collection, 
  getDocs, 
  Timestamp, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, Trophy, Star, CheckCircle2 } from "lucide-react";
import { Match } from "@/types";
import { formatKickoff, getTeamFlag } from "@/lib/utils";
import { useMobileBackToHome } from "@/hooks/useMobileBackToHome";
import { useRequireSetup } from "@/hooks/useRequireSetup";
import { useAuth } from "@/contexts/AuthContext";
import { getCachedMatches, setCachedMatches } from "@/lib/cache";

export default function Dashboard() {
  const { loading: setupLoading, blocked: setupBlocked } = useRequireSetup();
  useMobileBackToHome();
  const { user, isAdmin } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [predictedMatchIds, setPredictedMatchIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [matchTab, setMatchTab] = useState<'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // Update every 10s
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const cached = getCachedMatches<Match[]>();
        let matchList: Match[];

        if (cached && !cached.stale) {
          matchList = cached.data;
        } else {
          const querySnapshot = await getDocs(collection(db, "matches"));
          if (cancelled) return;

          matchList = querySnapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...(docItem.data() as Omit<Match, "id">),
          }));
          setCachedMatches(matchList);
        }
        matchList.sort((a: Match, b: Match) => {
          const aDone = a.status === 'completed' ? 1 : 0;
          const bDone = b.status === 'completed' ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          const timeA = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string | number | Date).getTime();
          const timeB = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string | number | Date).getTime();
          return timeA - timeB;
        });
        setMatches(matchList);

        if (user) {
          const predsSnap = await getDocs(query(collection(db, "predictions"), where("uid", "==", user.uid)));
          if (cancelled) return;
          setPredictedMatchIds(new Set(predsSnap.docs.map((d) => d.data().matchId as string)));

          const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "user")));
          if (cancelled) return;

          const allUsers = usersSnap.docs.map(docItem => ({
            id: docItem.id,
            name: (docItem.data().name as string) || '',
            points: (docItem.data().totalPoints as number) || 0
          })).sort((a, b) => {
            const pts = b.points - a.points;
            if (pts !== 0) return pts;
            return (a.name || '').localeCompare(b.name || '');
          });

          const currentUserData = allUsers.find(u => u.id === user.uid);
          if (currentUserData) {
            setUserPoints(currentUserData.points);
          }
        } else {
          setPredictedMatchIds(new Set());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (setupLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (setupBlocked) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 overflow-visible">
      <header className="mb-8 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3 md:space-y-5 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] md:text-xs font-black uppercase tracking-widest leading-relaxed mx-auto md:mx-0">
            <div className="relative w-3 h-3">
              <Image 
                src="/football.png" 
                alt="Football"
                fill
                className="object-contain"
              />
            </div>
            Live Arena
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-[0.1em] text-red-700 font-bebas leading-relaxed md:leading-loose uppercase">
            Battle Arena
          </h1>
          {isAdmin ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-[10px] font-black uppercase tracking-widest leading-relaxed mx-auto md:mx-0 border border-yellow-100">
              <Star className="w-3 h-3 fill-yellow-700" />
              Admin View Only
            </div>
          ) : (
            <p className="text-sm md:text-base text-red-400 font-medium leading-relaxed tracking-wide px-4 md:px-0 max-w-md mx-auto md:mx-0">
              Select a battle to lock in your prediction.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-3 md:gap-4">
          <div className="p-3 md:p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Star className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] font-bold text-red-300 uppercase tracking-widest leading-relaxed mb-1">Your Points</div>
              <div className="text-lg md:text-xl font-black text-red-700 leading-relaxed font-bebas">{userPoints} PTS</div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:gap-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex rounded-xl bg-red-50 p-1 gap-1">
            <button
              onClick={() => setMatchTab('upcoming')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                matchTab === 'upcoming' ? 'bg-white text-red-700 shadow-sm' : 'text-red-400 hover:text-red-600'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setMatchTab('completed')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                matchTab === 'completed' ? 'bg-white text-red-700 shadow-sm' : 'text-red-400 hover:text-red-600'
              }`}
            >
              Completed
            </button>
          </div>
          <div className="flex flex-wrap gap-3 md:gap-4 justify-end">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" />
              Predicted
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              Live
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
              Completed
            </span>
          </div>
        </div>
        {(matchTab === 'upcoming' ? matches.filter(m => m.status !== 'completed') : matches.filter(m => m.status === 'completed')).map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
              <Link
                href={`/predict/${match.id}`}
                className={`group block bg-white rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-8 card-shadow transition-all active:scale-[0.98] ${
                  predictedMatchIds.has(match.id)
                    ? 'border-2 border-emerald-400 hover:border-emerald-500'
                    : 'border border-red-50 hover:border-red-400'
                } ${
                  match.status === 'completed' ? 'opacity-90' : ''
                }`}
              >
              <MatchCardContent match={match} currentTime={currentTime} isPredicted={predictedMatchIds.has(match.id)} />
            </Link>
          </motion.div>
        ))}

        {(matchTab === 'upcoming' ? matches.filter(m => m.status !== 'completed') : matches.filter(m => m.status === 'completed')).length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-red-200" />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-red-700 font-bebas">No Battles Scheduled</h3>
            <p className="text-red-300 font-bold uppercase tracking-widest text-xs mt-2">Check back soon for upcoming matches.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function MatchCardContent({ match, currentTime, isPredicted }: { match: Match, currentTime: Date, isPredicted: boolean }) {
  return (
    <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-8">
      {/* Time & Status */}
      <div className="flex lg:flex-col items-center lg:items-start justify-between w-full lg:w-auto gap-2 lg:min-w-[160px]">
        <div className="flex flex-col lg:items-start gap-2.5">
          {isPredicted && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-relaxed">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              Predicted
            </div>
          )}
          <div className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] leading-relaxed ${
            match.status === 'live' ? 'bg-red-600 text-white animate-pulse' : 
            match.status === 'completed' ? 'bg-green-600 text-white shadow-lg shadow-green-100' :
            'bg-red-50 text-red-400 border border-red-100'
          }`}>
            {match.status === 'completed' ? 'Completed' : match.status}
          </div>
          
          {/* Lock Status */}
          {(() => {
            const kickoff = match.kickoffTime instanceof Timestamp ? match.kickoffTime.toDate() : new Date(match.kickoffTime as string);
            const isLocked = currentTime > new Date(kickoff.getTime() - 1 * 60000);
            if (isLocked && match.status === 'upcoming') {
              return (
                <div className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-widest leading-relaxed border border-red-200">
                  Locked
                </div>
              );
            }
            return null;
          })()}

          {match.status === 'completed' && match.totalGoalsResult && (
            <div className="flex flex-col gap-1.5">
              {match.result && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400 text-white shadow-md text-[8px] font-black uppercase tracking-widest leading-relaxed">
                  <Star className="w-2.5 h-2.5 fill-white shrink-0" />
                  Winner: {match.result}
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-[8px] font-black uppercase tracking-widest leading-relaxed">
                <Trophy className="w-2.5 h-2.5 shrink-0" />
                Total Goals: {match.totalGoalsResult}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold text-red-300 leading-relaxed tracking-wide">
          <Calendar className="w-3 h-3 md:w-4 md:h-4" />
          {formatKickoff(match.kickoffTime)}
        </div>
      </div>

      {/* Match UI */}
      <div className="flex-1 flex items-center justify-between md:justify-center gap-2 md:gap-12 w-full pt-2 md:pt-0">
        {/* Team A */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-2 md:gap-4 text-center md:text-right min-w-0">
          <div className="relative w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform shadow-sm shrink-0">
            <Image 
              src={getTeamFlag(match.teamA)} 
              alt={match.teamA} 
              fill
              className="object-cover"
            />
          </div>
          <span className="text-lg md:text-4xl font-black italic uppercase tracking-wide text-red-700 font-bebas leading-relaxed md:leading-loose break-words min-w-0 max-w-full">
            {match.teamA}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-black italic text-sm md:text-xl shadow-lg shadow-red-200 shrink-0">
            VS
          </div>
        </div>

        {/* Team B */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-start gap-2 md:gap-4 text-center md:text-left min-w-0">
          <div className="relative w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform shadow-sm md:order-1 order-1 shrink-0">
            <Image 
              src={getTeamFlag(match.teamB)} 
              alt={match.teamB} 
              fill
              className="object-cover"
            />
          </div>
          <span className="text-lg md:text-4xl font-black italic uppercase tracking-wide text-red-700 font-bebas leading-relaxed md:leading-loose break-words min-w-0 max-w-full md:order-2 order-2">
            {match.teamB}
          </span>
        </div>
      </div>

      {/* Action Icon (Desktop Only) */}
      {match.status !== 'completed' && (
        <div className="hidden lg:flex items-center justify-center pl-8">
          <div className="w-12 h-12 rounded-2xl bg-red-50 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center text-red-300 transition-all border border-red-100">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>
      )}
    </div>
  );
}
