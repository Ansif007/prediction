"use client";

import { useState, useEffect, useMemo } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { motion } from "framer-motion";
import { Trophy, ArrowRight, Bell, CheckCircle2, Swords, Star, Zap, Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { Match, UserData, Notice, LeaderboardEntry } from "@/types";
import { formatKickoff } from "@/lib/utils";
import { computeLeaderboard, getUserRoundRank } from "@/lib/leaderboard";

type DashboardData = {
  userDoc: UserData | null;
  matches: Match[];
  predictedMatchIds: Set<string>;
  allUsers: LeaderboardEntry[];
  notices: Notice[];
  isAdmin: boolean;
  isLeaderboardEnabled: boolean;
};

function getTodayUpcoming(matches: Match[]): Match[] {
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return matches.filter((m) => {
    if (m.status === "completed") return false;
    const t = m.kickoffTime instanceof Timestamp
      ? m.kickoffTime.toDate()
      : new Date(m.kickoffTime as string);
    return t >= todayStart && t <= todayEnd && t > now;
  }).sort((a, b) => {
    const ta = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string).getTime();
    const tb = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string).getTime();
    return ta - tb;
  });
}

export default function Home() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  async function loadDashboardData(u: User) {
    try {
      const [userSnap, matchesSnap, predsSnap, usersSnap, noticesSnap, settingsSnap] = await Promise.all([
        getDoc(doc(db, "users", u.uid)),
        getDocs(collection(db, "matches")),
        getDocs(query(collection(db, "predictions"), where("uid", "==", u.uid))),
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(2))),
        getDoc(doc(db, "config", "app_settings")),
      ]);

      const userDoc = userSnap.exists() ? (userSnap.data() as UserData) : null;
      const isAdmin = userDoc?.role === "admin";

      const matchList: Match[] = matchesSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Match, "id">),
      }));
      matchList.sort((a, b) => {
        const aDone = a.status === "completed" ? 1 : 0;
        const bDone = b.status === "completed" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        const ta = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string).getTime();
        const tb = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string).getTime();
        return ta - tb;
      });

      const predictedMatchIds = new Set(predsSnap.docs.map((d) => d.data().matchId as string));

      const usersForRanking = usersSnap.docs.map((d) => ({
        ...(d.data() as UserData),
        id: d.id,
      }));
      const allUsers = computeLeaderboard(usersForRanking, { scope: "overall" });

      const notices = noticesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Notice));

      const isLeaderboardEnabled = settingsSnap.exists()
        ? settingsSnap.data().isLeaderboardEnabled !== false
        : true;

      setData({
        userDoc,
        matches: matchList,
        predictedMatchIds,
        allUsers,
        notices,
        isAdmin,
        isLeaderboardEnabled,
      });
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u);
      setAuthLoading(false);

      if (u) {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        if (userSnap.exists()) {
          const ud = userSnap.data();
          if (ud.role !== "admin" && (!ud.employeeId || !ud.department)) {
            setNeedsSetup(true);
            router.replace("/setup");
            return;
          }
        }

        loadDashboardData(u);
      } else {
        setDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (authLoading || needsSetup) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return <LoginView />;
  }

  if (dataLoading || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <DashboardView data={data} authUser={authUser} />;
}

function LoginView() {
  const { showToast } = useToast();
  const [logging, setLogging] = useState(false);

  const login = async () => {
    setLogging(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedInUser = result.user;
      const userRef = doc(db, "users", loggedInUser.uid);
      const userSnap = await getDoc(userRef);
      await setDoc(userRef, {
        uid: loggedInUser.uid,
        name: loggedInUser.displayName || loggedInUser.email?.split("@")[0] || "",
        email: loggedInUser.email || "",
        role: userSnap.exists() ? userSnap.data().role : "user",
        totalPoints: userSnap.exists() ? userSnap.data().totalPoints : 0,
        createdAt: userSnap.exists() ? userSnap.data().createdAt : new Date().toISOString(),
      }, { merge: true });
      showToast("Welcome back!", "info");
    } catch {
      showToast("Login Failed", "error");
    } finally {
      setLogging(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        <div className="relative w-20 h-20 mb-8">
          <Image src="/football.png" alt="World Cup" fill className="object-contain" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.15em] mb-6">
          <Swords className="w-3 h-3" />
          Prediction Challenge
        </div>

        <h1 className="text-4xl font-black tracking-tight leading-[1.15] text-red-900 mb-3">
          MRF STAFF RECREATION CLUB
        </h1>
        <p className="text-sm font-bold text-red-400 uppercase tracking-[0.15em] mb-2">
          FIFA World Cup 2026
        </p>
        <p className="text-xs text-red-300 font-medium mb-10 leading-relaxed max-w-[260px]">
          Predict match winners. Compete with colleagues. Climb the leaderboard.
        </p>

        <button
          onClick={login}
          disabled={logging}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-red-600 text-white font-black uppercase tracking-[0.15em] rounded-2xl hover:bg-red-700 transition-all active:scale-[0.97] shadow-xl shadow-red-200 disabled:opacity-60"
        >
          {logging ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Image src="https://www.google.com/favicon.ico" alt="" width={20} height={20} />
              Sign in with Google
            </>
          )}
        </button>

        <Link
          href="/leaderboard"
          className="mt-4 flex items-center gap-2 px-6 py-3 text-red-400 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-red-50 transition-all"
        >
          <Trophy className="w-4 h-4" />
          View Leaderboard
        </Link>
      </motion.div>

      <p className="fixed bottom-8 text-[9px] font-bold text-red-200 uppercase tracking-widest">
         Created by ANSIF 
      </p>
    </main>
  );
}

function DashboardView({ data, authUser }: { data: DashboardData; authUser: User }) {
  const { userDoc, matches, predictedMatchIds, allUsers, notices } = data;

  const userRank = useMemo(() => getUserRoundRank(allUsers, authUser.uid), [allUsers, authUser.uid]);

  const userPoints = userDoc?.totalPoints || 0;

  const todayMatches = useMemo(() => getTodayUpcoming(matches), [matches]);
  const pendingToday = todayMatches.filter((m) => !predictedMatchIds.has(m.id));
  const todayPredicted = todayMatches.filter((m) => predictedMatchIds.has(m.id)).length;

  const userStreak = useMemo(() => {
    const sorted = matches.filter((m) => m.status === "completed").sort((a, b) => {
      const ta = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string).getTime();
      const tb = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string).getTime();
      return tb - ta;
    });
    let streak = 0;
    for (const m of sorted) {
      if (predictedMatchIds.has(m.id)) streak++;
      else break;
    }
    return streak;
  }, [matches, predictedMatchIds]);

  const topFive = allUsers.slice(0, 5);

  const predNowHref = pendingToday.length > 0 ? `/predict/${pendingToday[0].id}` : "/dashboard";

  const hasPendingPredictions = pendingToday.length > 0;

  const earliestDeadline = useMemo(() => {
    if (pendingToday.length === 0) return null;
    return pendingToday.reduce((earliest, m) => {
      const t = m.kickoffTime instanceof Timestamp
        ? m.kickoffTime.toDate()
        : new Date(m.kickoffTime as string);
      return t < earliest ? t : earliest;
    }, new Date(Infinity));
  }, [pendingToday]);

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-6 text-white shadow-2xl shadow-red-200/50"
      >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <Swords className="w-full h-full" />
        </div>

        <div className="relative z-10">
          <h2 className="text-2xl font-black leading-tight mb-1">
            {hasPendingPredictions
              ? `${pendingToday.length} Prediction${pendingToday.length > 1 ? "s" : ""} Due Today`
              : "All Predictions In!"}
          </h2>

          {earliestDeadline && (
            <p className="text-sm text-white/70 font-medium mb-5">
              Predict by: {formatKickoff(earliestDeadline)}
            </p>
          )}

          <Link
            href={predNowHref}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all active:scale-95 ${
              hasPendingPredictions
                ? "bg-white text-red-700 hover:bg-white/90 shadow-lg"
                : "bg-white/20 text-white/80 cursor-default pointer-events-none"
            }`}
          >
            {hasPendingPredictions ? (
              <>
                PREDICT NOW
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                ALL DONE
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </Link>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          value={userRank > 0 ? `#${userRank}` : "—"}
          label="Rank"
          color="red"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          value={String(userPoints)}
          label="Points"
          color="red"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          value={`${userStreak}`}
          label="Streak"
          color="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          value={`${todayPredicted}/${todayMatches.length}`}
          label="Today"
          color="emerald"
        />
      </motion.div>

      {notices.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-red-50/50 rounded-2xl p-4 border border-red-100"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Notices</span>
            </div>
            <Link href="/dashboard" className="text-[9px] font-bold text-red-400 uppercase tracking-wider hover:text-red-600 transition-colors">
              View All &rarr;
            </Link>
          </div>
          <div className="space-y-2">
            {notices.slice(0, 2).map((notice) => (
              <div key={notice.id} className="p-3 rounded-xl bg-white border border-red-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-[7px] font-black uppercase tracking-widest text-white leading-none">
                    {notice.type}
                  </span>
                </div>
                <p className="text-xs font-bold text-red-700 line-clamp-1 leading-relaxed">{notice.title}</p>
                {notice.content && (
                  <p className="text-[10px] text-red-400 mt-0.5 line-clamp-1 leading-relaxed">{notice.content}</p>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-500">
            {todayMatches.length > 0 ? `Today's Matches (${todayMatches.length})` : "Today's Matches"}
          </h3>
          <Link
            href="/dashboard"
            className="text-[9px] font-bold text-red-400 uppercase tracking-wider hover:text-red-600 transition-colors"
          >
            View All &rarr;
          </Link>
        </div>

        {todayMatches.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-red-100 bg-red-50/30 p-8 text-center">
            <Calendar className="w-8 h-8 text-red-200 mx-auto mb-2" />
            <p className="text-xs font-bold text-red-300 uppercase tracking-wider">No matches scheduled today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayMatches.slice(0, 5).map((match) => {
              const isPredicted = predictedMatchIds.has(match.id);
              return (
                <Link
                  key={match.id}
                  href={isPredicted ? "#" : `/predict/${match.id}`}
                  className={`block bg-white rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                    isPredicted
                      ? "border-emerald-200 bg-emerald-50/30"
                      : "border-red-50 hover:border-red-300 card-shadow"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-red-700 truncate">{match.teamA}</span>
                        <span className="text-[10px] font-bold text-red-300 shrink-0">vs</span>
                        <span className="text-sm font-bold text-red-700 truncate">{match.teamB}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        <span>{formatKickoff(match.kickoffTime)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 ml-3">
                      {isPredicted ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-wider">Done</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white">
                          <span className="text-[9px] font-black uppercase tracking-wider">Predict</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </motion.section>

      {data.isLeaderboardEnabled && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="pb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-500">Leaderboard</h3>
            <Link
              href="/leaderboard"
              className="text-[9px] font-bold text-red-400 uppercase tracking-wider hover:text-red-600 transition-colors"
            >
              View Full &rarr;
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-red-50 divide-y divide-red-50 card-shadow overflow-hidden">
            {topFive.map((u, i) => {
              const isMe = u.userId === authUser.uid;
              const rankColor = i === 0 ? "text-yellow-500" : i === 1 ? "text-red-400" : i === 2 ? "text-amber-600" : "text-red-200";
              return (
                <div
                  key={u.userId}
                  className={`flex items-center justify-between px-4 py-3 ${isMe ? "bg-red-50/50" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 text-center text-sm font-black italic font-sans ${rankColor}`}>
                      #{i + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-red-700 truncate block leading-tight">
                        {u.name}
                        {isMe && (
                          <span className="ml-1.5 text-[8px] font-black uppercase tracking-widest text-red-400">(You)</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-red-600 font-sans shrink-0 ml-3">{u.points}</span>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      <p className="text-center text-[9px] font-bold text-red-200 uppercase tracking-widest pb-4">
        Created by ANSIF 
      
      </p>
    </main>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: "red" | "amber" | "emerald" }) {
  const bgMap = {
    red: "bg-red-50 border-red-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
  };
  const iconMap = {
    red: "text-red-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
  };
  const valueMap = {
    red: "text-red-700",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
  };

  return (
    <div className={`rounded-2xl p-4 border ${bgMap[color]} card-shadow`}>
      <div className={`mb-2 ${iconMap[color]}`}>{icon}</div>
      <div className={`text-2xl font-black font-sans leading-none mb-1 ${valueMap[color]}`}>{value}</div>
      <div className="text-[9px] font-black uppercase tracking-widest text-red-300">{label}</div>
    </div>
  );
}
