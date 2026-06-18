"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, User as UserIcon, Star, TrendingUp, Users as UsersIcon, Building2, EyeOff, Search } from "lucide-react";
import { UserData, DeptData, RoundResult, LeaderboardEntry } from "@/types";
import { formatDepartmentDisplay, ROUNDS, getRoundLabel } from "@/lib/utils";
import { computeLeaderboard, computeDepartmentRankings, getRoundTopThree } from "@/lib/leaderboard";
import { useMobileBackToHome } from "@/hooks/useMobileBackToHome";
import { useRequireSetup } from "@/hooks/useRequireSetup";

export default function Leaderboard() {
  const { loading: setupLoading, blocked: setupBlocked } = useRequireSetup();
  useMobileBackToHome();
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [depts, setDepts] = useState<DeptData[]>([]);
  const [view, setView] = useState<'individual' | 'department'>('individual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeaderboardEnabled, setIsLeaderboardEnabled] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roundView, setRoundView] = useState<string>("overall");
  const [roundData, setRoundData] = useState<Record<string, RoundResult>>({});

  useEffect(() => {
    if (roundView === "overall" || roundData[roundView]) return;
    getDoc(doc(db, "roundResults", roundView))
      .then((snap) => {
        if (snap.exists()) {
          setRoundData((prev) => ({ ...prev, [roundView]: snap.data() as RoundResult }));
        }
      })
      .catch(console.error);
  }, [roundView, roundData]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "config", "app_settings"));
        setIsLeaderboardEnabled(
          settingsSnap.exists() ? settingsSnap.data().isLeaderboardEnabled !== false : true
        );

        const authUser = await new Promise<User | null>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
          });
        });

        if (authUser) {
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");
        }

        // Fetch all users to avoid index requirement for small internal app
        const q = query(collection(db, "users"));
        const snapshot = await getDocs(q);
        
        const allUsers = snapshot.docs
          .map((doc) => ({
            ...(doc.data() as UserData),
            id: doc.id,
          }))
          .filter(u => u.role !== "admin" && u.showOnLeaderboard !== false);

        // Calculate Individual Leaderboard
        const individualData = computeLeaderboard(allUsers, { scope: "overall" });
        setUsers(individualData);

        // Calculate Department Leaderboard
        setDepts(computeDepartmentRankings(allUsers));

        setError(null);
      } catch (err: unknown) {
        console.error("Error loading leaderboard:", err);
        const error = err as { message?: string };
        if (error.message?.includes("index")) {
          setError("Leaderboard is being prepared. Please check back in a few minutes.");
        } else {
          setError("Failed to load leaderboard. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, []);

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <Star className="w-8 h-8 text-red-600 animate-pulse" />
        </div>
        <h2 className="text-3xl font-black italic tracking-[0.1em] text-red-700 font-sans mb-2 uppercase">Arena Warming Up</h2>
        <p className="text-sm text-red-400 font-bold max-w-xs mx-auto uppercase tracking-wider">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-200"
        >
          Retry Battle
        </button>
      </div>
    );
  }

  if (!isLeaderboardEnabled && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <EyeOff className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-sm md:text-base text-red-500 font-bold max-w-sm mx-auto uppercase tracking-wider leading-relaxed">
          Leaderboard will be shown shortly
        </p>
      </div>
    );
  }

  const filteredUsers = searchQuery
    ? users.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;
  const topThree = getRoundTopThree(filteredUsers);
  const theRest = filteredUsers.slice(3);

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12 overflow-visible">
      <header className="mb-10 md:mb-20 text-center space-y-5 md:space-y-6">
        <div className="inline-flex p-3 md:p-4 rounded-2xl md:rounded-3xl bg-red-600 text-white shadow-xl shadow-red-200 mb-2 md:mb-4 rotate-3">
          <Trophy className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black italic tracking-[0.1em] text-red-700 font-sans uppercase leading-relaxed md:leading-loose">
          THE <span className="text-red-600">HALL</span> OF FAME
        </h1>
        <p className="text-xs md:text-sm text-red-400 font-bold max-w-md mx-auto uppercase tracking-wider leading-relaxed px-4">
          Tracking the best predictors across the company.
        </p>

        {/* Round Tabs */}
        <div className="flex items-center justify-center gap-1.5 mt-8 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: "overall", label: "Overall", icon: Trophy },
            ...ROUNDS.map((r) => ({ id: r.id, label: r.name, icon: Star })),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = roundView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setRoundView(tab.id);
                  if (tab.id !== "overall") {
                    setView('individual');
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 ${
                  isActive
                    ? "bg-red-600 text-white shadow-lg shadow-red-200"
                    : "bg-red-50 text-red-300 hover:text-red-500 hover:bg-red-100"
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* View Switcher (Overall only) */}
        {roundView === "overall" && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button 
              onClick={() => setView('individual')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black italic uppercase tracking-tighter font-sans transition-all ${
                view === 'individual' 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                  : 'bg-red-50 text-red-300 hover:bg-red-100'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Individual
            </button>
            <button 
              onClick={() => setView('department')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black italic uppercase tracking-tighter font-sans transition-all ${
                view === 'department' 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                  : 'bg-red-50 text-red-300 hover:bg-red-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Department
            </button>
          </div>
        )}

        {roundView === "overall" && view === 'individual' && (
          <div className="max-w-md mx-auto mt-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300" />
            <input
              type="text"
              placeholder="Search participants..."
              className="w-full pl-11 pr-6 py-3 rounded-xl bg-red-50 border border-red-100 outline-none text-sm font-bold text-red-700 focus:border-red-600 transition-all placeholder:text-red-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </header>

      {roundView === "overall" && view === 'individual' && (
        <>
          {/* Top 3 Podium Visual */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 mb-14 md:mb-20 items-center md:items-end pt-6 md:pt-12">
            {/* Mobile View: Ranks top 3 in order 1, 2, 3. Desktop: 2, 1, 3 */}
            {/* Gold - Rank 1 */}
            {topThree.first && (
              <PodiumCard 
                user={topThree.first} 
                rank={topThree.first?.rank ?? 0} 
                icon={<Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-500" />} 
                height="h-auto md:h-80"
                isGold
                delay={0.1}
                mobileOrder="order-1"
              />
            )}
            {/* Silver - Rank 2 */}
            {topThree.second && (
              <PodiumCard 
                user={topThree.second} 
                rank={topThree.second?.rank ?? 0} 
                icon={<Medal className="w-6 h-6 md:w-8 md:h-8 text-red-200" />} 
                height="h-auto md:h-64"
                delay={0.2}
                mobileOrder="order-2"
              />
            )}
            {/* Bronze - Rank 3 */}
            {topThree.third && (
              <PodiumCard 
                user={topThree.third} 
                rank={topThree.third?.rank ?? 0} 
                icon={<Award className="w-6 h-6 md:w-8 md:h-8 text-red-400" />} 
                height="h-auto md:h-56"
                delay={0.3}
                mobileOrder="order-3"
              />
            )}
          </div>

          {/* Remaining List */}
          <div className="space-y-4 md:space-y-5 max-w-3xl mx-auto pb-12">
            {theRest.map((user, index) => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-5 md:p-6 rounded-2xl md:rounded-3xl bg-white border border-red-50 card-shadow hover:border-red-400 transition-all"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <span className="text-xl md:text-2xl font-black italic text-red-100 font-sans w-6 md:w-8">
                    #{user.rank}
                  </span>
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                      <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black italic uppercase tracking-wide text-red-700 font-sans text-lg md:text-xl leading-relaxed break-words">
                          {user.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {user.department && (
                          <span className="text-[8px] md:text-[10px] font-black text-red-300 uppercase tracking-widest leading-relaxed">
                            {formatDepartmentDisplay(user.department)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xl md:text-2xl font-black italic text-red-600 font-sans leading-none">{user.points}</div>
                  <div className="text-[8px] md:text-[10px] font-bold text-red-300 uppercase tracking-widest">Points</div>
                </div>
              </motion.div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-16 md:py-24 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed border-red-100 bg-red-50/50">
                <Star className="w-12 h-12 md:w-16 md:h-16 text-red-100 mx-auto mb-4 md:mb-6" />
                <p className="text-red-300 font-black italic uppercase tracking-widest font-sans text-xl md:text-2xl">No legends yet</p>
              </div>
            )}
          </div>
        </>
        )}

        {roundView === "overall" && view === 'department' && (
        <div className="max-w-4xl mx-auto pt-10">
          <div className="grid gap-5 md:gap-8">
            {depts.map((dept, index) => (
              <motion.div
                key={dept.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden flex flex-col md:flex-row items-center justify-between p-6 md:p-10 rounded-[2.5rem] border-2 transition-all ${
                  index === 0 
                    ? 'bg-red-600 border-red-600 text-white shadow-2xl shadow-red-200' 
                    : 'bg-white border-red-50 text-red-700 card-shadow'
                }`}
              >
                {index === 0 && (
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="w-32 h-32" />
                  </div>
                )}
                
                <div className="flex items-center gap-6 w-full md:w-auto mb-4 md:mb-0">
                  <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 ${
                    index === 0 ? 'bg-white/20' : 'bg-red-50'
                  }`}>
                    <Building2 className={`w-8 h-8 md:w-12 md:h-12 ${index === 0 ? 'text-white' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xl md:text-2xl font-black italic font-sans ${index === 0 ? 'text-red-100' : 'text-red-200'}`}>
                        #{index + 1}
                      </span>
                      <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-wide font-sans leading-relaxed">
                        {formatDepartmentDisplay(dept.name)}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="w-3.5 h-3.5 opacity-60" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-80">
                          {dept.userCount} Members
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 opacity-60" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-80">
                          Avg: {dept.averagePoints}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center md:text-right w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/20 md:border-l md:pl-10">
                  <div className={`text-4xl md:text-6xl font-black italic font-sans leading-none ${index === 0 ? 'text-yellow-400' : 'text-red-600'}`}>
                    {dept.totalPoints}
                  </div>
                  <div className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mt-1 ${index === 0 ? 'text-red-100' : 'text-red-300'}`}>
                    Total Points
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {roundView !== "overall" && (
        <>
          {roundData[roundView] ? (
            <RoundView
              roundResult={roundData[roundView]}
              roundLabel={getRoundLabel(roundView)}
            />
          ) : (
            <div className="text-center py-20">
              <Star className="w-12 h-12 text-red-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-red-300 uppercase tracking-wider">
                No data yet for {getRoundLabel(roundView)}
              </p>
              <p className="text-[10px] text-red-200 mt-1 uppercase tracking-widest">
                Standings will appear after matches are scored
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function RoundView({ roundResult, roundLabel }: { roundResult: RoundResult; roundLabel: string }) {
  const rankings = roundResult.rankings;
  const topThree = getRoundTopThree(rankings);
  const theRest = rankings.slice(3);

  return (
    <div className="mt-10">
      {/* Top 3 Winners Banner */}
      {topThree.first && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-red-200/50 mb-10 text-center"
        >
          <h2 className="text-xs font-black uppercase tracking-widest text-red-200 mb-4">
            {roundLabel} — Champions
          </h2>
          <div className="flex items-center justify-center gap-6 md:gap-10">
            {topThree.second && (
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Medal className="w-6 h-6 md:w-8 md:h-8 text-red-200" />
                </div>
                <p className="text-sm md:text-lg font-black">{topThree.second.name}</p>
                <p className="text-xs text-red-200 font-bold">{topThree.second.points} pts</p>
              </div>
            )}
            {topThree.first && (
              <div className="text-center -mt-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xl shadow-red-800/30">
                  <Trophy className="w-8 h-8 md:w-10 md:h-10 text-red-700" />
                </div>
                <p className="text-base md:text-xl font-black">{topThree.first.name}</p>
                <p className="text-sm text-yellow-300 font-bold">{topThree.first.points} pts</p>
              </div>
            )}
            {topThree.third && (
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Award className="w-6 h-6 md:w-8 md:h-8 text-red-300" />
                </div>
                <p className="text-sm md:text-lg font-black">{topThree.third.name}</p>
                <p className="text-xs text-red-200 font-bold">{topThree.third.points} pts</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Rest of rankings */}
      <div className="space-y-4 md:space-y-5 max-w-3xl mx-auto pb-12">
        {theRest.map((entry, index) => (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-5 md:p-6 rounded-2xl md:rounded-3xl bg-white border border-red-50 card-shadow hover:border-red-400 transition-all"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <span className="text-xl md:text-2xl font-black italic text-red-100 font-sans w-6 md:w-8">
                #{index + 4}
              </span>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                  <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black italic uppercase tracking-wide text-red-700 font-sans text-lg md:text-xl leading-relaxed break-words">
                    {entry.name}
                  </h3>
                  {entry.department && (
                    <span className="text-[8px] md:text-[10px] font-black text-red-300 uppercase tracking-widest leading-relaxed">
                      {formatDepartmentDisplay(entry.department)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 text-[10px] font-bold text-red-300 uppercase tracking-widest">
                <span>{entry.winnerHits}W</span>
                <span>{entry.exactScoreHits}G</span>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-black italic text-red-600 font-sans leading-none">{entry.points}</div>
                <div className="text-[8px] md:text-[10px] font-bold text-red-300 uppercase tracking-widest">Pts</div>
              </div>
            </div>
          </motion.div>
        ))}

        {rankings.length === 0 && (
          <div className="text-center py-16 md:py-24 rounded-[2rem] border-4 border-dashed border-red-100 bg-red-50/50">
            <Star className="w-12 h-12 md:w-16 md:h-16 text-red-100 mx-auto mb-4 md:mb-6" />
            <p className="text-red-300 font-black italic uppercase tracking-widest font-sans text-xl md:text-2xl">No entries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ user, rank, icon, height, isGold, delay, mobileOrder }: { user: LeaderboardEntry, rank: number, icon: React.ReactNode, height: string, isGold?: boolean, delay: number, mobileOrder: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className={`relative flex flex-col items-center justify-end w-full md:w-1/3 ${height} ${mobileOrder} md:order-${rank === 1 ? '2' : rank === 2 ? '1' : '3'}`}
    >
      <div className={`flex flex-row md:flex-col items-center gap-4 md:gap-0 w-full p-4 md:p-0 ${isGold ? 'bg-red-600 md:bg-transparent text-white' : 'bg-white md:bg-transparent text-red-700'} rounded-3xl md:rounded-none border md:border-0 border-red-100 shadow-xl md:shadow-none`}>
        <div className={`relative w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl ${isGold ? 'bg-red-600 md:bg-red-600 shadow-red-200' : 'bg-white border-2 border-red-50 shadow-red-50'} shadow-xl md:shadow-2xl flex items-center justify-center z-10 transition-transform hover:scale-110 shrink-0`}>
          {icon}
          <div className={`absolute -bottom-2 md:-bottom-3 px-3 md:px-4 py-0.5 md:py-1 rounded-full font-black italic text-[10px] md:text-sm ${isGold ? 'bg-yellow-400 text-red-900' : 'bg-red-800 text-white'} shadow-lg font-sans`}>
            RANK {rank}
          </div>
        </div>
        
        <div className={`flex-1 md:w-full md:mt-0 ${isGold ? 'md:bg-red-600' : 'md:bg-white md:border md:border-red-50'} md:rounded-t-[3rem] md:p-8 text-left md:text-center md:shadow-2xl flex flex-col md:items-center justify-center gap-1 md:gap-2`}>
          <div className="flex flex-col md:items-center gap-0.5">
            <h3 className={`font-black italic uppercase tracking-wide font-sans text-lg md:text-2xl leading-relaxed break-words w-full ${isGold ? 'text-white' : 'text-red-700'}`}>
              {user.name}
            </h3>
            {user.department && (
              <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed ${isGold ? 'text-red-100/60' : 'text-red-300'}`}>
                {formatDepartmentDisplay(user.department)}
              </span>
            )}
          </div>
          <div className="flex flex-row md:flex-col items-baseline md:items-center gap-2 md:gap-0 mt-1">
            <span className={`text-2xl md:text-4xl font-black italic font-sans ${isGold ? 'text-yellow-400' : 'text-red-600'}`}>
              {user.points}
            </span>
            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] ${isGold ? 'text-red-200' : 'text-red-300'}`}>
              Points
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}