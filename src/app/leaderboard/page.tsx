"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, User as UserIcon, Star, TrendingUp, Users as UsersIcon, Building2, EyeOff } from "lucide-react";
import { UserData, DeptData } from "@/types";
import { normalizeDepartment, formatDepartmentDisplay } from "@/lib/utils";
import { useMobileBackToHome } from "@/hooks/useMobileBackToHome";

export default function Leaderboard() {
  useMobileBackToHome();
  const [users, setUsers] = useState<UserData[]>([]);
  const [depts, setDepts] = useState<DeptData[]>([]);
  const [view, setView] = useState<'individual' | 'department'>('individual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeaderboardEnabled, setIsLeaderboardEnabled] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
          .filter(u => u.role !== "admin");

        // Calculate Individual Leaderboard
        const individualData = [...allUsers].sort((a, b) => {
          const pts = (b.totalPoints || 0) - (a.totalPoints || 0);
          if (pts !== 0) return pts;
          return (a.name || '').localeCompare(b.name || '');
        });
        setUsers(individualData);

        // Calculate Department Leaderboard
        const deptMap: Record<string, { totalPoints: number; userCount: number }> = {};
        allUsers.forEach(u => {
          const dept = normalizeDepartment(u.department);
          if (!deptMap[dept]) {
            deptMap[dept] = { totalPoints: 0, userCount: 0 };
          }
          deptMap[dept].totalPoints += (u.totalPoints || 0);
          deptMap[dept].userCount += 1;
        });

        const departmentData: DeptData[] = Object.entries(deptMap).map(([name, stats]) => ({
          name,
          totalPoints: stats.totalPoints,
          userCount: stats.userCount,
          averagePoints: stats.userCount > 0 ? Number((stats.totalPoints / stats.userCount).toFixed(1)) : 0
        })).sort((a, b) => b.totalPoints - a.totalPoints);
        
        setDepts(departmentData);

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
        <h2 className="text-3xl font-black italic tracking-[0.1em] text-red-700 font-bebas mb-2 uppercase">Arena Warming Up</h2>
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

  const topThree = users.slice(0, 3);
  const theRest = users.slice(3);

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12 overflow-visible">
      <header className="mb-10 md:mb-20 text-center space-y-5 md:space-y-6">
        <div className="inline-flex p-3 md:p-4 rounded-2xl md:rounded-3xl bg-red-600 text-white shadow-xl shadow-red-200 mb-2 md:mb-4 rotate-3">
          <Trophy className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black italic tracking-[0.1em] text-red-700 font-bebas uppercase leading-relaxed md:leading-loose">
          THE <span className="text-red-600">HALL</span> OF FAME
        </h1>
        <p className="text-xs md:text-sm text-red-400 font-bold max-w-md mx-auto uppercase tracking-wider leading-relaxed px-4">
          Tracking the best predictors across the company.
        </p>

        {/* View Switcher */}
        <div className="flex items-center justify-center gap-3 mt-10">
          <button 
            onClick={() => setView('individual')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black italic uppercase tracking-tighter font-bebas transition-all ${
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
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black italic uppercase tracking-tighter font-bebas transition-all ${
              view === 'department' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                : 'bg-red-50 text-red-300 hover:bg-red-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Department
          </button>
        </div>
      </header>

      {view === 'individual' ? (
        <>
          {/* Top 3 Podium Visual */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 mb-14 md:mb-20 items-center md:items-end pt-6 md:pt-12">
            {/* Mobile View: Ranks top 3 in order 1, 2, 3. Desktop: 2, 1, 3 */}
            {/* Gold - Rank 1 */}
            {topThree[0] && (
              <PodiumCard 
                user={topThree[0]} 
                rank={1} 
                icon={<Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-500" />} 
                height="h-auto md:h-80"
                isGold
                delay={0.1}
                mobileOrder="order-1"
              />
            )}
            {/* Silver - Rank 2 */}
            {topThree[1] && (
              <PodiumCard 
                user={topThree[1]} 
                rank={2} 
                icon={<Medal className="w-6 h-6 md:w-8 md:h-8 text-red-200" />} 
                height="h-auto md:h-64"
                delay={0.2}
                mobileOrder="order-2"
              />
            )}
            {/* Bronze - Rank 3 */}
            {topThree[2] && (
              <PodiumCard 
                user={topThree[2]} 
                rank={3} 
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
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-5 md:p-6 rounded-2xl md:rounded-3xl bg-white border border-red-50 card-shadow hover:border-red-400 transition-all"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <span className="text-xl md:text-2xl font-black italic text-red-100 font-bebas w-6 md:w-8">
                    #{index + 4}
                  </span>
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                      <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black italic uppercase tracking-wide text-red-700 font-bebas text-lg md:text-xl leading-relaxed truncate">
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
                  <div className="text-xl md:text-2xl font-black italic text-red-600 font-bebas leading-none">{user.totalPoints}</div>
                  <div className="text-[8px] md:text-[10px] font-bold text-red-300 uppercase tracking-widest">Points</div>
                </div>
              </motion.div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-16 md:py-24 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed border-red-100 bg-red-50/50">
                <Star className="w-12 h-12 md:w-16 md:h-16 text-red-100 mx-auto mb-4 md:mb-6" />
                <p className="text-red-300 font-black italic uppercase tracking-widest font-bebas text-xl md:text-2xl">No legends yet</p>
              </div>
            )}
          </div>
        </>
      ) : (
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
                      <span className={`text-xl md:text-2xl font-black italic font-bebas ${index === 0 ? 'text-red-100' : 'text-red-200'}`}>
                        #{index + 1}
                      </span>
                      <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-wide font-bebas leading-relaxed">
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
                  <div className={`text-4xl md:text-6xl font-black italic font-bebas leading-none ${index === 0 ? 'text-yellow-400' : 'text-red-600'}`}>
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
    </main>
  );
}

function PodiumCard({ user, rank, icon, height, isGold, delay, mobileOrder }: { user: UserData, rank: number, icon: React.ReactNode, height: string, isGold?: boolean, delay: number, mobileOrder: string }) {
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
          <div className={`absolute -bottom-2 md:-bottom-3 px-3 md:px-4 py-0.5 md:py-1 rounded-full font-black italic text-[10px] md:text-sm ${isGold ? 'bg-yellow-400 text-red-900' : 'bg-red-800 text-white'} shadow-lg font-bebas`}>
            RANK {rank}
          </div>
        </div>
        
        <div className={`flex-1 md:w-full md:mt-0 ${isGold ? 'md:bg-red-600' : 'md:bg-white md:border md:border-red-50'} md:rounded-t-[3rem] md:p-8 text-left md:text-center md:shadow-2xl flex flex-col md:items-center justify-center gap-1 md:gap-2`}>
          <div className="flex flex-col md:items-center gap-0.5">
            <h3 className={`font-black italic uppercase tracking-wide font-bebas text-lg md:text-2xl leading-relaxed truncate w-full ${isGold ? 'text-white' : 'text-red-700'}`}>
              {user.name}
            </h3>
            {user.department && (
              <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed ${isGold ? 'text-red-100/60' : 'text-red-300'}`}>
                {formatDepartmentDisplay(user.department)}
              </span>
            )}
          </div>
          <div className="flex flex-row md:flex-col items-baseline md:items-center gap-2 md:gap-0 mt-1">
            <span className={`text-2xl md:text-4xl font-black italic font-bebas ${isGold ? 'text-yellow-400' : 'text-red-600'}`}>
              {user.totalPoints}
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