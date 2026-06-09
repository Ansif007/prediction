"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, Timestamp, query, where } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, Trophy, Globe, Star } from "lucide-react";

import { useRouter } from "next/navigation";

interface Match {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: Timestamp | Date | string;
  status: string;
  result: string | null;
  totalGoalsResult?: string;
}

function formatKickoff(time: Timestamp | Date | string) {
  try {
    const d = time instanceof Timestamp ? time.toDate() : new Date(time as string | number | Date);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time?.toString() || "";
  }
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

export default function Dashboard() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | string>("--");
  const [userPoints, setUserPoints] = useState<number>(0);

  useEffect(() => {
    const fetchData = async (user: User | null) => {
      try {
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            router.push("/admin");
            return;
          }
        }
        
        // Fetch Matches
        const querySnapshot = await getDocs(collection(db, "matches"));
        const matchList: Match[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Match, "id">),
        }));
        // Sort matches by kickoff time (latest first)
        matchList.sort((a, b) => {
          const timeA = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string | number | Date).getTime();
          const timeB = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string | number | Date).getTime();
          return timeB - timeA;
        });
        setMatches(matchList);

        // Fetch User Rank and Points
        if (user) {
          const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "user")));
          const allUsers = usersSnap.docs.map(doc => ({
            id: doc.id,
            points: (doc.data().totalPoints as number) || 0
          })).sort((a, b) => b.points - a.points);

          const currentUserData = allUsers.find(u => u.id === user.uid);
          if (currentUserData) {
            setUserPoints(currentUserData.points);
            // Handling same points = same rank
            const rank = allUsers.findIndex(u => u.points <= currentUserData.points) + 1;
            setUserRank(rank);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      fetchData(user);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <header className="mb-8 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 md:space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] md:text-xs font-black uppercase tracking-widest mx-auto md:mx-0">
            <Globe className="w-3 h-3" />
            Live Arena
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-red-700 font-bebas">
            MATCH <span className="text-red-600 underline decoration-red-100 underline-offset-4 md:underline-offset-8">SCHEDULE</span>
          </h1>
          <p className="text-sm md:text-base text-red-400 font-medium px-4 md:px-0">Select a battle to lock in your prediction.</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-3 md:gap-4">
          <div className="p-3 md:p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Star className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] font-bold text-red-300 uppercase tracking-widest leading-none mb-1">Your Points</div>
              <div className="text-lg md:text-xl font-black text-red-700 leading-none font-bebas">{userPoints} PTS</div>
            </div>
          </div>
          <div className="p-3 md:p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] font-bold text-red-300 uppercase tracking-widest leading-none mb-1">Your Rank</div>
              <div className="text-lg md:text-xl font-black text-red-700 leading-none font-bebas">#{userRank}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:gap-6">
        {matches.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              href={`/predict/${match.id}`}
              className="group block bg-white border border-red-50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-8 card-shadow hover:border-red-400 transition-all active:scale-[0.98]"
            >
              <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-8">
                {/* Time & Status */}
                <div className="flex lg:flex-col items-center lg:items-start justify-between w-full lg:w-auto gap-2 lg:min-w-[160px]">
                  <div className="flex flex-col lg:items-start gap-2">
                    <div className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] ${
                      match.status === 'live' ? 'bg-red-600 text-white animate-pulse' : 
                      match.status === 'completed' ? 'bg-red-50 text-red-600 border border-red-100' :
                      'bg-red-50 text-red-400 border border-red-100'
                    }`}>
                      {match.status}
                    </div>
                    {match.status === 'completed' && match.totalGoalsResult && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-[8px] font-black uppercase tracking-widest">
                        <Trophy className="w-2.5 h-2.5" />
                        Goals: {match.totalGoalsResult}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold text-red-300">
                    <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                    {formatKickoff(match.kickoffTime)}
                  </div>
                </div>

                {/* Match UI */}
                <div className="flex-1 flex items-center justify-between md:justify-center gap-2 md:gap-12 w-full pt-2 md:pt-0">
                  {/* Team A */}
                  <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-2 md:gap-4 text-center md:text-right">
                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform shadow-sm">
                      <img 
                        src={getTeamFlag(match.teamA)} 
                        alt={match.teamA} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-lg md:text-4xl font-black italic uppercase tracking-tighter text-red-700 font-bebas line-clamp-1">
                      {match.teamA}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-red-600 flex items-center justify-center text-white font-black italic text-sm md:text-xl shadow-lg shadow-red-200 shrink-0">
                      VS
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="flex-1 flex flex-col md:flex-row items-center justify-start gap-2 md:gap-4 text-center md:text-left">
                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform shadow-sm md:order-1 order-1">
                      <img 
                        src={getTeamFlag(match.teamB)} 
                        alt={match.teamB} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-lg md:text-4xl font-black italic uppercase tracking-tighter text-red-700 font-bebas line-clamp-1 md:order-2 order-2">
                      {match.teamB}
                    </span>
                  </div>
                </div>

                {/* Action Icon (Desktop Only) */}
                <div className="hidden lg:flex items-center justify-center pl-8">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center text-red-300 transition-all border border-red-100">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}

        {matches.length === 0 && (
          <div className="text-center py-20 md:py-32 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed border-red-100 bg-red-50/50">
            <Globe className="w-12 h-12 md:w-16 md:h-16 text-red-200 mx-auto mb-4 md:mb-6" />
            <p className="text-red-300 font-black italic uppercase tracking-widest font-bebas text-xl md:text-2xl">No battles scheduled yet</p>
          </div>
        )}
      </div>
    </main>
  );
}