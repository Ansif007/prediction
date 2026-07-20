"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, User as UserIcon, TrendingUp, Users as UsersIcon, Shield, EyeOff, Search, Star } from "lucide-react";
import { RoundView, RoundPointsData, UserData, DeptData } from "@/types";
import { normalizeDepartment, formatDepartmentDisplay, ROUND_LABELS, ROUND_RANGES } from "@/lib/utils";
import { useMobileBackToHome } from "@/hooks/useMobileBackToHome";
import { useRequireSetup } from "@/hooks/useRequireSetup";
import { useAuth } from "@/contexts/AuthContext";
import { getCache, setCache } from "@/lib/cache";

const WC_RED = '#DC2626';
const WC_GREEN = '#1D6E39';
const WC_BLUE = '#1B3B6B';
const WC_GOLD = '#F2B705';

const PodiumCard = ({ user, rank, icon, accent, delay }: {
  user: { id: string; name: string; department?: string; totalPoints: number };
  rank: number;
  icon: React.ReactNode;
  accent: string;
  delay: number;
}) => {
  const heights: Record<number, string> = { 1: 'md:h-80', 2: 'md:h-64', 3: 'md:h-56' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className={`relative w-full overflow-hidden rounded-t-3xl bg-white ${heights[rank]}`}
      style={{
        borderTop: `1px solid ${rank === 1 ? WC_GOLD : '#E2E8F0'}`,
        borderLeft: `1px solid ${rank === 1 ? WC_GOLD : '#E2E8F0'}`,
        borderRight: `1px solid ${rank === 1 ? WC_GOLD : '#E2E8F0'}`,
        borderBottom: 'none',
        boxShadow: rank === 1 ? `0 0 50px ${WC_GOLD}30, 0 4px 20px rgba(0,0,0,0.06)` : '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      {/* Accent bar at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2"
        style={{ backgroundColor: accent }}
      />

      {/* Ghosted rank */}
      <div
        className="absolute -right-4 -top-6 font-anton pointer-events-none select-none leading-none"
        style={{ fontSize: 'clamp(6rem, 12vw, 12rem)', color: rank === 1 ? `${WC_GOLD}15` : '#F1F5F9' }}
      >
        {rank}
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
        <div
          className="w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-6"
          style={{
            backgroundColor: rank === 1 ? `${WC_GOLD}20` : '#F8FAFC',
            border: `2px solid ${rank === 1 ? `${WC_GOLD}40` : '#E2E8F0'}`,
          }}
        >
          {icon}
        </div>
        <h3 className="font-oswald text-xl md:text-3xl font-semibold uppercase tracking-wide leading-relaxed text-slate-800">
          {user.name}
        </h3>
        {user.department && (
          <span className="font-oswald text-[9px] md:text-[11px] font-medium uppercase tracking-[0.2em] leading-relaxed text-slate-400">
            {formatDepartmentDisplay(user.department)}
          </span>
        )}
        <div
          className="mt-4 md:mt-6 inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl"
          style={{
            backgroundColor: rank === 1 ? WC_GOLD : '#F8FAFC',
            color: rank === 1 ? '#fff' : '#1E293B',
            border: rank !== 1 ? '1px solid #E2E8F0' : 'none',
          }}
        >
          <span className="font-space-mono text-2xl md:text-3xl font-bold leading-none">{user.totalPoints}</span>
          <span className="font-space-mono text-[8px] md:text-[10px] font-bold uppercase tracking-widest" style={{ opacity: 0.5 }}>PTS</span>
        </div>
      </div>
    </motion.div>
  );
};

export default function Leaderboard() {
  const { loading: setupLoading, blocked: setupBlocked } = useRequireSetup();
  useMobileBackToHome();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [depts, setDepts] = useState<DeptData[]>([]);
  const [view, setView] = useState<'individual' | 'department'>('individual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeaderboardEnabled, setIsLeaderboardEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roundView, setRoundView] = useState<RoundView>("overall");
  const [allData, setAllData] = useState<UserData[]>([]);
  const [roundPointsMap, setRoundPointsMap] = useState<Record<string, RoundPointsData>>({});

  const sortAndSet = useCallback((data: UserData[], round: RoundView) => {
    const sorted = [...data]
      .map((u) => ({
        ...u,
        totalPoints:
          round === "overall"
            ? u.totalPoints || 0
            : (roundPointsMap[u.id]?.[round as keyof RoundPointsData] as number) || 0,
      }))
        .sort(
        (a, b) =>
          (b.totalPoints || 0) - (a.totalPoints || 0) ||
          (b.fullScores || 0) - (a.fullScores || 0) ||
          a.name.localeCompare(b.name)
      );
    setUsers(sorted);
  }, [roundPointsMap]);

  useEffect(() => {
    if (allData.length === 0) return;
    sortAndSet(allData, roundView);
  }, [roundView, sortAndSet]);

  useEffect(() => {
    if (roundView !== "overall") setView("individual");
  }, [roundView]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "config", "app_settings"));
        setIsLeaderboardEnabled(
          settingsSnap.exists() ? settingsSnap.data().isLeaderboardEnabled !== false : true
        );

        const cached = getCache<UserData[]>("leaderboard_users_v2");
        let allUsers: UserData[];

        if (cached && !cached.stale) {
          allUsers = cached.data;
        } else {
          const snapshot = await getDocs(collection(db, "users"));
          allUsers = snapshot.docs
            .map((d) => ({ ...(d.data() as Omit<UserData, "id">), id: d.id }))
            .filter(u => u.showOnLeaderboard !== false);
          setCache("leaderboard_users_v2", allUsers);
        }

        const rpSnapshot = await getDocs(collection(db, "roundPoints"));
        const rpMap: Record<string, RoundPointsData> = {};
        rpSnapshot.docs.forEach((d) => {
          rpMap[d.id] = { ...(d.data() as Omit<RoundPointsData, "id">), id: d.id };
        });
        setRoundPointsMap(rpMap);

        setAllData(allUsers);
        sortAndSet(allUsers, "overall");

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (setupLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: WC_RED }} />
      </div>
    );
  }

  if (setupBlocked) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: WC_RED }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-white">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-red-50">
          <Star className="w-8 h-8" style={{ color: WC_RED }} />
        </div>
        <h2 className="font-anton text-3xl md:text-4xl tracking-[0.05em] text-slate-800 mb-3 uppercase">Arena Warming Up</h2>
        <p className="font-oswald text-sm font-medium max-w-xs mx-auto uppercase tracking-wider text-slate-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 font-oswald font-semibold uppercase tracking-widest rounded-xl text-sm text-white"
          style={{ backgroundColor: WC_RED }}
        >
          Retry Battle
        </button>
      </div>
    );
  }

  if (!isLeaderboardEnabled && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-white">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-slate-100">
          <EyeOff className="w-8 h-8 text-slate-400" />
        </div>
        <p className="font-oswald text-sm md:text-base font-medium max-w-sm mx-auto uppercase tracking-wider leading-relaxed text-slate-400">
          Leaderboard will be shown shortly
        </p>
      </div>
    );
  }

  const userRankMap = new Map(users.map((u, i) => [u.id, i + 1]));
  const filteredUsers = searchQuery
    ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;
  const topThree = filteredUsers.slice(0, 3);
  const theRest = filteredUsers.slice(3);

  const getMatchCount = (key: string): number | null => {
    const range = ROUND_RANGES[key];
    if (!range) return null;
    return range[1] - range[0] + 1;
  };

  return (
    <main className="min-h-screen bg-white">
      {/* ===== HEADER ===== */}
      <section className="relative overflow-hidden bg-white border-b" style={{ borderColor: '#F1F5F9' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-8 md:pb-12 text-center">
          {/* WC 2026 Full Emblem */}
          <div className="flex justify-center mb-6">
            <Image
              src="/fwc26-emblem.svg"
              alt="FIFA World Cup 26"
              width={130}
              height={200}
              className="h-auto"
              style={{ width: 'clamp(80px, 15vw, 130px)' }}
              priority
            />
          </div>

          {/* Title */}
          <h1 className="font-anton text-4xl md:text-6xl lg:text-7xl tracking-[0.04em] text-slate-800 uppercase leading-none mb-3">
            HALL OF FAME
          </h1>
          <p className="font-oswald text-sm md:text-base font-medium uppercase tracking-[0.15em] max-w-md mx-auto" style={{ color: WC_GOLD }}>
            The Best Predictors of MRF SRC
          </p>

          {/* Round Tabs with Pennant */}
          <div className="flex items-center justify-center gap-1 md:gap-2 mt-8 flex-wrap">
            {(Object.entries(ROUND_LABELS) as [RoundView, string][]).map(([key, label]) => {
              const count = getMatchCount(key);
              const isActive = roundView === key;
              return (
                <button
                  key={key}
                  onClick={() => setRoundView(key)}
                  className="relative flex items-center gap-2 px-3 md:px-5 py-2.5 rounded-lg transition-all font-oswald font-semibold text-xs md:text-sm uppercase tracking-wider"
                  style={{
                    color: isActive ? '#fff' : WC_RED,
                    backgroundColor: isActive ? WC_RED : '#fff',
                    border: isActive ? `1px solid ${WC_RED}` : '1px solid #E2E8F0',
                  }}
                >
                  <span>{label}</span>
                  {count !== null && (
                    <span
                      className="font-space-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                        color: isActive ? '#fff' : '#94A3B8',
                      }}
                    >
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="pennant"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: `8px solid ${WC_GOLD}`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* View Switcher */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setView('individual')}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-oswald font-semibold uppercase tracking-wider text-sm transition-all"
              style={{
                backgroundColor: view === 'individual' ? WC_RED : '#F8FAFC',
                color: view === 'individual' ? '#fff' : '#94A3B8',
                border: view === 'individual' ? 'none' : '1px solid #E2E8F0',
              }}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Individual
            </button>
            {roundView === "overall" && (
              <button
                onClick={() => setView('department')}
                className="flex items-center gap-2 px-5 py-2 rounded-lg font-oswald font-semibold uppercase tracking-wider text-sm transition-all"
                style={{
                  backgroundColor: view === 'department' ? WC_RED : '#F8FAFC',
                  color: view === 'department' ? '#fff' : '#94A3B8',
                  border: view === 'department' ? 'none' : '1px solid #E2E8F0',
                }}
              >
                <Shield className="w-3.5 h-3.5" />
                Department
              </button>
            )}
          </div>

          {/* Search */}
          {view === 'individual' && (
            <div className="max-w-md mx-auto mt-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                placeholder="Search participants..."
                className="w-full pl-11 pr-6 py-3 rounded-xl outline-none font-oswald text-sm font-medium uppercase tracking-wider transition-all"
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  color: '#1E293B',
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 relative z-10" style={{ marginTop: '-1rem' }}>
        {view === 'individual' ? (
          <>
            {/* ===== PODIUM (Top 3) ===== */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-end pt-4 md:pt-8">
              {topThree[1] && (
                <div className="w-full md:w-[30%] order-2 md:order-1">
                  <PodiumCard
                    user={topThree[1]}
                    rank={2}
                    icon={<Medal className="w-5 h-5 md:w-7 md:h-7 text-slate-500" />}
                    accent={WC_GREEN}
                    delay={0.2}
                  />
                </div>
              )}
              {topThree[0] && (
                <div className="w-full md:w-2/5 order-1 md:order-2">
                  <PodiumCard
                    user={topThree[0]}
                    rank={1}
                    icon={<Trophy className="w-6 h-6 md:w-8 md:h-8" style={{ color: WC_GOLD }} />}
                    accent={WC_RED}
                    delay={0.1}
                  />
                </div>
              )}
              {topThree[2] && (
                <div className="w-full md:w-[30%] order-3 md:order-3">
                  <PodiumCard
                    user={topThree[2]}
                    rank={3}
                    icon={<Award className="w-5 h-5 md:w-7 md:h-7 text-slate-400" />}
                    accent={WC_BLUE}
                    delay={0.3}
                  />
                </div>
              )}
            </div>

            {/* ===== DIVIDER ===== */}
            <div className="flex items-center gap-3 max-w-sm mx-auto my-10 md:my-14">
              <div className="flex-1 h-px" style={{
                background: `linear-gradient(90deg, transparent, ${WC_RED} 30%, ${WC_GOLD} 70%, transparent)`,
              }} />
              <div className="relative w-5 h-5 shrink-0">
                <svg viewBox="0 0 20 20" fill="none" className="w-full h-full text-slate-300">
                  <line x1="4" y1="2" x2="4" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <polygon points="4,2 16,6 4,10" fill={WC_RED} fillOpacity="0.4" />
                </svg>
              </div>
              <div className="flex-1 h-px" style={{
                background: `linear-gradient(90deg, transparent, ${WC_RED} 30%, ${WC_GOLD} 70%, transparent)`,
              }} />
            </div>

            {/* ===== ROSTER CARDS (4th+) ===== */}
            <div className="space-y-3 md:space-y-4 max-w-3xl mx-auto pb-16 md:pb-20">
              {theRest.map((user, index) => {
                const rank = userRankMap.get(user.id) ?? 0;
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative overflow-hidden rounded-2xl md:rounded-3xl transition-all bg-white"
                    style={{
                      borderTop: '1px solid #F1F5F9',
                      borderRight: '1px solid #F1F5F9',
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: '4px solid #CBD5E1',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Watermark */}
                    <div
                      className="absolute -right-2 top-1/2 -translate-y-1/2 font-anton pointer-events-none select-none leading-none"
                      style={{ fontSize: 'clamp(4rem, 8vw, 6rem)', color: '#F8FAFC' }}
                    >
                      #{rank}
                    </div>

                    <div className="relative z-10 flex items-center justify-between p-4 md:p-5">
                      <div className="flex items-center gap-4 md:gap-5 min-w-0">
                        {/* Jersey Number Circle */}
                        <div
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 font-oswald font-semibold text-base md:text-lg"
                          style={{
                            backgroundColor: '#F1F5F9',
                            color: '#94A3B8',
                          }}
                        >
                          {rank}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-oswald font-semibold uppercase tracking-wide text-base md:text-lg leading-tight truncate text-slate-800">
                            {user.name}
                          </h3>
                          {user.department && (
                            <span className="font-oswald text-[9px] md:text-[10px] font-medium uppercase tracking-widest leading-relaxed text-slate-400">
                              {formatDepartmentDisplay(user.department)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <div className="flex items-baseline gap-1">
                          <span className="font-space-mono text-xl md:text-2xl font-bold leading-none" style={{ color: '#94A3B8' }}>
                            {user.totalPoints}
                          </span>
                          <span className="font-space-mono text-[9px] md:text-xs font-bold uppercase tracking-wider" style={{ color: '#E2E8F0' }}>
                            PTS
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {users.length === 0 && (
                <div className="text-center py-16 md:py-20 rounded-[2rem] md:rounded-[3rem]" style={{
                  border: '1px dashed #E2E8F0',
                  backgroundColor: '#FAFAFA',
                }}>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 bg-slate-100">
                    <Star className="w-8 h-8 md:w-10 md:h-10 text-slate-300" />
                  </div>
                  <p className="font-anton text-xl md:text-2xl tracking-wider uppercase text-slate-300">No legends yet</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ===== DEPARTMENT VIEW ===== */
          <div className="max-w-4xl mx-auto pt-6 pb-16 md:pb-20">
            <div className="grid gap-5 md:gap-8">
              {depts.map((dept, index) => (
                <motion.div
                  key={dept.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between p-6 md:p-10 rounded-[2.5rem] transition-all"
                  style={{
                    backgroundColor: index === 0 ? '#fff' : '#fff',
                    border: index === 0 ? `2px solid ${WC_GOLD}50` : `1px solid ${WC_RED}15`,
                    boxShadow: index === 0 ? `0 0 40px ${WC_GOLD}20, 0 4px 20px rgba(0,0,0,0.06)` : '0 4px 20px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* #1 hero background */}
                  {index === 0 && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: `linear-gradient(135deg, ${WC_RED}08 0%, transparent 50%)`,
                    }} />
                  )}

                  {/* Watermark Trophy for #1 */}
                  {index === 0 && (
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                      <Trophy className="w-32 h-32" />
                    </div>
                  )}

                  <div className="flex items-center gap-6 w-full md:w-auto mb-4 md:mb-0 relative z-10">
                    <div
                      className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: index === 0 ? `${WC_GOLD}20` : '#F8FAFC',
                        border: index === 0 ? `2px solid ${WC_GOLD}30` : '1px solid #E2E8F0',
                      }}
                    >
                      <Shield
                        className="w-7 h-7 md:w-11 md:h-11"
                        style={{ color: index === 0 ? WC_GOLD : WC_RED }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-oswald font-semibold text-lg text-slate-300">
                          #{index + 1}
                        </span>
                        <h2 className="font-oswald font-semibold text-2xl md:text-4xl uppercase tracking-wide leading-relaxed text-slate-800">
                          {formatDepartmentDisplay(dept.name)}
                        </h2>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-oswald text-[10px] md:text-xs font-medium uppercase tracking-widest text-slate-400">
                            {dept.userCount} Members
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-oswald text-[10px] md:text-xs font-medium uppercase tracking-widest text-slate-400">
                            Avg: {dept.averagePoints}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center md:text-right w-full md:w-auto pt-4 md:pt-0 md:border-l md:pl-10 relative z-10" style={{ borderColor: index === 0 ? `${WC_GOLD}30` : '#F1F5F9' }}>
                    <div
                      className="font-space-mono text-4xl md:text-6xl font-bold leading-none"
                      style={{ color: index === 0 ? WC_GOLD : WC_RED }}
                    >
                      {dept.totalPoints}
                    </div>
                    <div className="font-oswald text-[10px] md:text-xs font-medium uppercase tracking-[0.2em] mt-1 text-slate-400">
                      Total Points
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
