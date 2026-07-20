"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  increment,
  addDoc,
  deleteDoc,
  getDoc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, Plus, Trash2, X, Edit2, Play, Pause, 
  BarChart3, AlertTriangle, Users, LayoutGrid, Settings, Activity, 
  Download, Search, Trophy, Target, Bell, RefreshCw
} from "lucide-react";
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Match, UserData, Prediction, DeptData, Notice } from "@/types";
import { formatKickoff, WORLD_CUP_2026_TEAMS, normalizeDepartment, formatDepartmentDisplay, roundKeyFromMatchNumber, STAGE_POINTS, getStageFromMatchNumber } from "@/lib/utils";
import { exportMasterPredictionsReport } from "@/lib/exportPredictionsReport";
import { useMobileBackToHome } from "@/hooks/useMobileBackToHome";
import { useAuth } from "@/contexts/AuthContext";
import { backfillRoundPoints, backfillFullScores, BackfillResult } from "@/lib/migration";
import { renumberMatches, RenumberResult } from "@/lib/renumber";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

type AdminTab = 'matches' | 'users' | 'notices' | 'stats';

export default function AdminPage() {
  useMobileBackToHome();
  const [activeTab, setActiveTab] = useState<AdminTab>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [exportingPredictions, setExportingPredictions] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ matchId: string, result: string, goals: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchTab, setMatchTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [statsMatchTab, setStatsMatchTab] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [isLeaderboardEnabled, setIsLeaderboardEnabled] = useState(true);
  const [togglingLeaderboard, setTogglingLeaderboard] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    totalPredictions: 0,
    activeMatches: 0
  });
  const [incompleteCount, setIncompleteCount] = useState(0);
  const [detailStats, setDetailStats] = useState({
    winnerAccuracy: 0,
    goalsAccuracy: 0,
    combinedAccuracy: 0,
    activePct: 0,
    totalPredictions: 0,
    avgPerUser: 0,
    avgPerMatch: 0,
    roundStats: [] as {
      label: string; predictions: number; avgPerMatch: number;
      winnerAccuracy: number; goalsAccuracy: number; uniqueUsers: number; matches: number;
    }[],
    matchDetails: [] as {
      teamA: string; teamB: string; matchNumber?: number; result: string | null;
      totalGoalsResult: string | null; status: string; totalPredictions: number;
      teamAPicks: number; drawPicks: number; teamBPicks: number;
      winnerCorrect: number; goalsCorrect: number; scored: boolean;
      pts3: number; pts2: number; pts1: number; pts0: number;
    }[],
    deptEngagement: [] as { dept: string; active: number; predictions: number }[],
    accuracyTrend: [] as { label: string; winnerAcc: number; goalsAcc: number }[],
    userDistribution: [] as { range: string; count: number }[],
    dailyTrend: [] as { date: string; predictions: number }[],
    engagementTrend: [] as { label: string; predictions: number }[],
  });
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [backfillingFullScores, setBackfillingFullScores] = useState(false);
  const [backfillFullScoresResult, setBackfillFullScoresResult] = useState<BackfillResult | null>(null);
  const [renumbering, setRenumbering] = useState(false);
  const [renumberResult, setRenumberResult] = useState<RenumberResult | null>(null);
  
  // New/Edit Match Form State
  const [matchForm, setMatchForm] = useState({
    teamA: "",
    teamB: "",
    kickoffTime: "",
  });

  // Notice Form State
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    type: "info" as Notice['type']
  });

  const loadAdminData = async () => {
    if (!isAdmin) return;
    try {
      const [usersSnap, matchesSnap, predictionsSnap, noticesSnap, settingsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "matches")),
        getDocs(collection(db, "predictions")),
        getDocs(collection(db, "notices")),
        getDoc(doc(db, "config", "app_settings")),
      ]);

      const usersData = usersSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as UserData
      );
      const matchesRaw = matchesSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Match
      );
      const preds = predictionsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Prediction
      );
      const noticesData = noticesSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Notice
      );

      const enrichedMatches: Match[] = matchesRaw.map((data) => {
        const matchPreds = preds.filter((p) => p.matchId === data.id);
        return {
          ...data,
          stats: {
            teamA: matchPreds.filter((p) => p.winnerPrediction === data.teamA).length,
            draw: matchPreds.filter((p) => p.winnerPrediction === "DRAW").length,
            teamB: matchPreds.filter((p) => p.winnerPrediction === data.teamB).length,
            total: matchPreds.length,
          },
        };
      });

      setUsers(
        [...usersData].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
      );
      setMatches(enrichedMatches);
      setNotices(
        [...noticesData].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setGlobalStats({
        totalUsers: usersData.filter((u) => u.role === "user").length,
        totalPredictions: preds.length,
        activeMatches: matchesRaw.filter((m) => m.status === "live").length,
      });
      setIncompleteCount(
        usersData.filter((u) => u.role === "user" && (!u.employeeId || !u.department)).length
      );
      setIsLeaderboardEnabled(
        settingsSnap.exists() ? settingsSnap.data().isLeaderboardEnabled !== false : true
      );

      // Compute detailed stats
      const regularUsers = usersData.filter(u => u.role === "user");
      const totalUsers = regularUsers.length;
      const totalPreds = preds.length;

      let correctWinner = 0;
      let correctGoals = 0;
      let completedScored = 0;

      const roundStatsInit = [
        { label: "Round 1", predictions: 0, avgPerMatch: 0, winnerCorrect: 0, winnerTotal: 0, goalsCorrect: 0, goalsTotal: 0, uniqueUsers: new Set<string>(), matches: 0 },
        { label: "Round 2", predictions: 0, avgPerMatch: 0, winnerCorrect: 0, winnerTotal: 0, goalsCorrect: 0, goalsTotal: 0, uniqueUsers: new Set<string>(), matches: 0 },
        { label: "Round 3", predictions: 0, avgPerMatch: 0, winnerCorrect: 0, winnerTotal: 0, goalsCorrect: 0, goalsTotal: 0, uniqueUsers: new Set<string>(), matches: 0 },
        { label: "Knockout", predictions: 0, avgPerMatch: 0, winnerCorrect: 0, winnerTotal: 0, goalsCorrect: 0, goalsTotal: 0, uniqueUsers: new Set<string>(), matches: 0 },
      ];

      const matchDetails: typeof detailStats.matchDetails = [];
      const deptMap = new Map<string, { active: Set<string>; predictions: number }>();
      const userPredCount = new Map<string, number>();
      const accuracyTrend: { label: string; winnerAcc: number; goalsAcc: number }[] = [];

      const roundKey = (mn: number) =>
        mn <= 24 ? 0 : mn <= 48 ? 1 : mn <= 72 ? 2 : 3;

      // Build department set from users for dept engagement
      for (const u of regularUsers) {
        const dept = u.department || "others";
        if (!deptMap.has(dept)) deptMap.set(dept, { active: new Set(), predictions: 0 });
      }

      // Sort matches chronologically for accuracy trend
      const sortedCompleted = [...matchesRaw]
        .filter(m => m.status === "completed" && m.result)
        .sort((a, b) => {
          const tA = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string).getTime();
          const tB = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string).getTime();
          return tA - tB;
        });
      let trendWinner = 0;
      let trendGoals = 0;
      let totalPredsSoFar = 0;

      for (const p of preds) {
        const match = matchesRaw.find(m => m.id === p.matchId);
        if (!match) continue;
        userPredCount.set(p.uid, (userPredCount.get(p.uid) || 0) + 1);

        if (match.matchNumber) {
          const idx = roundKey(match.matchNumber);
          roundStatsInit[idx].predictions++;
          roundStatsInit[idx].uniqueUsers.add(p.uid);
        }

        // Department engagement
        const user = regularUsers.find(u => u.uid === p.uid);
        if (user) {
          const dept = user.department || "others";
          if (!deptMap.has(dept)) deptMap.set(dept, { active: new Set(), predictions: 0 });
          const entry = deptMap.get(dept)!;
          entry.active.add(p.uid);
          entry.predictions++;
        }

        if (match.status !== "completed" || !match.result) continue;

        completedScored++;
        if (p.pointsAwarded) {
          if (p.winnerPrediction === match.result) correctWinner++;
          if (p.goalsPrediction === match.totalGoalsResult) correctGoals++;
        }

        if (match.matchNumber) {
          const idx = roundKey(match.matchNumber);
          roundStatsInit[idx].winnerTotal++;
          if (p.pointsAwarded && p.winnerPrediction === match.result) roundStatsInit[idx].winnerCorrect++;
          if (p.pointsAwarded && p.goalsPrediction === match.totalGoalsResult) roundStatsInit[idx].goalsCorrect++;
          if (p.pointsAwarded) roundStatsInit[idx].goalsTotal++;
        }
      }

      // Build match details
      const sortedMatches = [...enrichedMatches].sort((a, b) => {
        const mnA = a.matchNumber ?? 999;
        const mnB = b.matchNumber ?? 999;
        if (mnA !== mnB) return mnA - mnB;
        const tA = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string).getTime();
        const tB = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string).getTime();
        return tA - tB;
      });

      for (const m of sortedMatches) {
        const matchPreds = preds.filter(p => p.matchId === m.id);
        let wCorrect = 0;
        let gCorrect = 0;
        let pts3 = 0, pts2 = 0, pts1 = 0, pts0 = 0;
        for (const p of matchPreds) {
          if (m.status === "completed" && p.pointsAwarded) {
            const w = p.winnerPrediction === m.result;
            const g = p.goalsPrediction === m.totalGoalsResult;
            if (w) wCorrect++;
            if (g) gCorrect++;
            if (w && g) pts3++;
            else if (w) pts2++;
            else if (g) pts1++;
            else pts0++;
          }
        }
        matchDetails.push({
          teamA: m.teamA, teamB: m.teamB, matchNumber: m.matchNumber,
          result: m.result ?? null, totalGoalsResult: m.totalGoalsResult ?? null,
          status: m.status,
          totalPredictions: m.stats?.total || 0,
          teamAPicks: m.stats?.teamA || 0,
          drawPicks: m.stats?.draw || 0,
          teamBPicks: m.stats?.teamB || 0,
          winnerCorrect: wCorrect,
          goalsCorrect: gCorrect,
          pts3, pts2, pts1, pts0,
          scored: m.status === "completed",
        });
      }

      // Accuracy trend by chronological completed match
      for (const m of sortedCompleted) {
        const md = matchDetails.find(d => d.teamA === m.teamA && d.teamB === m.teamB && d.status === "completed");
        if (!md || md.totalPredictions === 0) continue;
        trendWinner += md.winnerCorrect;
        trendGoals += md.goalsCorrect;
        totalPredsSoFar += md.totalPredictions;
        accuracyTrend.push({
          label: md.matchNumber ? `#${md.matchNumber}` : `${md.teamA.slice(0, 3)} vs ${md.teamB.slice(0, 3)}`,
          winnerAcc: Math.round((trendWinner / totalPredsSoFar) * 100),
          goalsAcc: Math.round((trendGoals / totalPredsSoFar) * 100),
        });
      }

      // Daily prediction trend
      const dayTotals = new Map<string, { display: string; ts: number; count: number }>();
      for (const m of enrichedMatches) {
        const t = m.kickoffTime instanceof Timestamp ? m.kickoffTime.toDate().getTime() : new Date(m.kickoffTime as string).getTime();
        const d = new Date(t);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const display = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        if (!dayTotals.has(key)) dayTotals.set(key, { display, ts: t, count: 0 });
        dayTotals.get(key)!.count += (m.stats?.total || 0);
      }
      const dailyTrend = Array.from(dayTotals.values())
        .sort((a, b) => a.ts - b.ts)
        .map(d => ({ date: d.display, predictions: d.count }));

      // Engagement per match trend
      const engagementTrend = matchDetails.map(m => ({
        label: m.matchNumber ? `#${m.matchNumber}` : `${m.teamA.slice(0, 3)}vs${m.teamB.slice(0, 3)}`,
        predictions: m.totalPredictions,
      }));

      // User distribution buckets
      const buckets = [0, 0, 0, 0, 0];
      for (const count of userPredCount.values()) {
        if (count <= 5) buckets[0]++;
        else if (count <= 10) buckets[1]++;
        else if (count <= 20) buckets[2]++;
        else if (count <= 50) buckets[3]++;
        else buckets[4]++;
      }

      // Round stats finalize
      const completedMatchesPerRound = [0, 0, 0, 0];
      for (const m of matchesRaw) {
        if (m.matchNumber && m.status === "completed") {
          completedMatchesPerRound[roundKey(m.matchNumber)]++;
        }
      }
      const roundStats = roundStatsInit.map((r, i) => ({
        label: r.label,
        predictions: r.predictions,
        avgPerMatch: completedMatchesPerRound[i] > 0 ? Number((r.predictions / completedMatchesPerRound[i]).toFixed(1)) : 0,
        winnerAccuracy: r.winnerTotal > 0 ? Math.round((r.winnerCorrect / r.winnerTotal) * 100) : 0,
        goalsAccuracy: r.goalsTotal > 0 ? Math.round((r.goalsCorrect / r.goalsTotal) * 100) : 0,
        uniqueUsers: r.uniqueUsers.size,
        matches: completedMatchesPerRound[i],
      }));

      // Count total matches for avgPerMatch
      const totalCompletedMatches = matchesRaw.filter(m => m.status === "completed").length;

      // Department engagement
      const deptEngagement = Array.from(deptMap.entries())
        .map(([dept, data]) => ({
          dept,
          active: data.active.size,
          predictions: data.predictions,
        }))
        .sort((a, b) => b.active - a.active);

      setDetailStats({
        winnerAccuracy: completedScored > 0 ? Math.round((correctWinner / completedScored) * 100) : 0,
        goalsAccuracy: completedScored > 0 ? Math.round((correctGoals / completedScored) * 100) : 0,
        combinedAccuracy: completedScored > 0 ? Math.round(((correctWinner + correctGoals) / (completedScored * 2)) * 100) : 0,
        activePct: totalUsers > 0 ? Math.round((userPredCount.size / totalUsers) * 100) : 0,
        totalPredictions: totalPreds,
        avgPerUser: totalUsers > 0 ? Number((totalPreds / totalUsers).toFixed(1)) : 0,
        avgPerMatch: totalCompletedMatches > 0 ? Number((completedScored / totalCompletedMatches).toFixed(1)) : 0,
        roundStats,
        matchDetails,
        deptEngagement,
        accuracyTrend,
        dailyTrend,
        engagementTrend,
        userDistribution: [
          { range: "1–5 preds", count: buckets[0] },
          { range: "6–10 preds", count: buckets[1] },
          { range: "11–20 preds", count: buckets[2] },
          { range: "21–50 preds", count: buckets[3] },
          { range: "50+ preds", count: buckets[4] },
        ],
      });
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      setIsRefreshing(true);
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleLeaderboardToggle = async () => {
    setTogglingLeaderboard(true);
    try {
      const newValue = !isLeaderboardEnabled;
      await setDoc(
        doc(db, "config", "app_settings"),
        { isLeaderboardEnabled: newValue },
        { merge: true }
      );
      setIsLeaderboardEnabled(newValue);
    } catch (error) {
      console.error("Error updating leaderboard visibility:", error);
      alert("Failed to update leaderboard visibility.");
    } finally {
      setTogglingLeaderboard(false);
    }
  };

  const handleRenumber = async () => {
    if (!confirm("This will reassign match numbers for ALL matches by kickoff time. Delete roundPoints collection in Firebase console afterwards, then click Backfill. Continue?")) return;
    setRenumbering(true);
    setRenumberResult(null);
    try {
      const res = await renumberMatches();
      setRenumberResult(res);
    } catch (err) {
      setRenumberResult({
        matchesProcessed: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        success: false,
      });
    } finally {
      setRenumbering(false);
    }
  };

  const handleBackfillFullScores = async () => {
    setBackfillingFullScores(true);
    setBackfillFullScoresResult(null);
    try {
      const res = await backfillFullScores();
      setBackfillFullScoresResult(res);
    } catch (err) {
      setBackfillFullScoresResult({
        usersProcessed: 0,
        predictionsProcessed: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        success: false,
      });
    } finally {
      setBackfillingFullScores(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await backfillRoundPoints();
      setBackfillResult(res);
    } catch (err) {
      setBackfillResult({
        usersProcessed: 0,
        predictionsProcessed: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        success: false,
      });
    } finally {
      setBackfilling(false);
    }
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchForm.teamA || !matchForm.teamB || !matchForm.kickoffTime) return;
    
    try {
      // Query Firestore directly for the max matchNumber (avoids stale-state duplicates)
      const allMatchesSnap = await getDocs(collection(db, "matches"));
      const existingNumbers = allMatchesSnap.docs
        .map((d) => d.data().matchNumber as number | undefined)
        .filter((n): n is number => n != null);
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      await addDoc(collection(db, "matches"), {
        ...matchForm,
        matchNumber: nextNumber,
        kickoffTime: Timestamp.fromDate(new Date(matchForm.kickoffTime)),
        status: "upcoming",
        result: null,
        totalGoalsResult: null,
      });
      setShowAddForm(false);
      setMatchForm({ teamA: "", teamB: "", kickoffTime: "" });
    } catch (error) {
      console.error("Error adding match:", error);
    }
  };

  const handleUpdateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch || !matchForm.teamA || !matchForm.teamB || !matchForm.kickoffTime) return;

    try {
      const matchRef = doc(db, "matches", editingMatch.id);
      await updateDoc(matchRef, {
        teamA: matchForm.teamA,
        teamB: matchForm.teamB,
        kickoffTime: Timestamp.fromDate(new Date(matchForm.kickoffTime)),
      });
      setEditingMatch(null);
      setMatchForm({ teamA: "", teamB: "", kickoffTime: "" });
    } catch (error) {
      console.error("Error updating match:", error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const userRef = doc(db, "users", editingUser.id);
      await updateDoc(userRef, {
        name: editingUser.name,
      });
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleToggleLeaderboardVisibility = async (user: UserData) => {
    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        showOnLeaderboard: user.showOnLeaderboard === false ? true : false,
      });
    } catch (error) {
      console.error("Error toggling leaderboard visibility:", error);
    }
  };

  const handleSetStatus = async (matchId: string, status: string) => {
    try {
      await updateDoc(doc(db, "matches", matchId), { status });
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status } : m));
    } catch (error) {
      console.error("Error setting status:", error);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("Are you sure you want to delete this match?")) return;
    try {
      await deleteDoc(doc(db, "matches", matchId));
      setMatches(prev => prev.filter(m => m.id !== matchId));
    } catch (error) {
      console.error("Error deleting match:", error);
    }
  };

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.content) return;

    try {
      await addDoc(collection(db, "notices"), {
        ...noticeForm,
        createdAt: new Date().toISOString()
      });
      setShowNoticeForm(false);
      setNoticeForm({ title: "", content: "", type: "info" });
    } catch (error) {
      console.error("Error adding notice:", error);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    try {
      await deleteDoc(doc(db, "notices", id));
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Error deleting notice:", error);
    }
  };

  const saveResult = async () => {
    if (!confirmResult) return;
    const { matchId, result, goals } = confirmResult;
    
    try {
      const match = matches.find((m) => m.id === matchId);
      if (match?.status === "completed") {
        alert("Points already calculated");
        return;
      }

      // Ensure matchNumber exists — query Firestore for max to avoid stale-state duplicates
      let matchNumber = match?.matchNumber;
      if (matchNumber == null) {
        const allMatchesSnap = await getDocs(collection(db, "matches"));
        const existingNumbers = allMatchesSnap.docs
          .map((d) => d.data().matchNumber as number | undefined)
          .filter((n): n is number => n != null);
        matchNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      }

      const roundKey = roundKeyFromMatchNumber(matchNumber);

      const predictionsQuery = query(
        collection(db, "predictions"),
        where("matchId", "==", matchId)
      );

      const predictionSnapshot = await getDocs(predictionsQuery);
      const batch = writeBatch(db);

      // Include match update in the same atomic batch
      const matchRef = doc(db, "matches", matchId);
      batch.update(matchRef, {
        result,
        totalGoalsResult: goals,
        status: "completed",
        ...(match?.matchNumber == null ? { matchNumber } : {}),
      });

      for (const predictionDoc of predictionSnapshot.docs) {
        const pred = predictionDoc.data() as Prediction;
        
        // Skip if points already awarded for this prediction
        if (pred.pointsAwarded) continue;
  
        const user = users.find(u => u.uid === pred.uid);
        
        // Skip admins
        if (user?.role === 'admin') continue;
  
        const stage = getStageFromMatchNumber(matchNumber);
        const { winnerPoints, goalsPoints } = STAGE_POINTS[stage];

        let pointsEarned = 0;
        if (pred.winnerPrediction === result) {
          pointsEarned += winnerPoints;
        }
        if (pred.goalsPrediction === goals) {
          pointsEarned += goalsPoints;
        }
  
        // Always mark prediction as processed to prevent double-counting even if 0 points earned
        const predictionRef = doc(db, "predictions", predictionDoc.id);
        batch.update(predictionRef, {
          pointsAwarded: true,
          pointsEarned: pointsEarned
        });
  
        if (pointsEarned > 0) {
          const userRef = doc(db, "users", pred.uid);
          
          //  SAFE UPSERT FIX: Uses batch.set with merge: true
          // This creates the document if missing, or increments points safely if it exists!
          batch.set(userRef, {
            totalPoints: increment(pointsEarned)
          }, { merge: true });

          // Update roundPoints — always runs (roundKey guaranteed by auto-assignment above)
          const rpRef = doc(db, "roundPoints", pred.uid);
          batch.set(rpRef, {
            uid: pred.uid,
            name: user?.name || pred.userName || "",
            department: user?.department || "",
            [roundKey]: increment(pointsEarned),
            overall: increment(pointsEarned),
          }, { merge: true });
        }
      }
  
      await batch.commit();
      alert(`Result saved! Points awarded to ${predictionSnapshot.size} predictors.`);
      setConfirmResult(null);
    } catch (error) {
      console.error(error);
      alert("Failed to save result. Check console.");
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // 1. Leaderboard Sheet (Primary Rank File)
      const leaderboardData = users
        .filter(u => u.role === 'user')
        .sort((a, b) => {
          const pts = b.totalPoints - a.totalPoints;
          if (pts !== 0) return pts;
          return (a.name || '').localeCompare(b.name || '');
        })
      .map((u, index) => ({
        Rank: index + 1,
        Name: u.name,
        Employee_Number: u.employeeId || 'N/A',
        Group: u.department ? formatDepartmentDisplay(u.department) : 'N/A',
        Total_Score: u.totalPoints,
        Status: u.profileSetup ? 'Verified' : 'Pending Setup'
      }));
    const leaderboardWS = XLSX.utils.json_to_sheet(leaderboardData);
    
    // Set column widths for better readability
    leaderboardWS['!cols'] = [
      { wch: 8 },  // Rank
      { wch: 25 }, // Name
      { wch: 20 }, // Employee_Number
      { wch: 25 }, // Group
      { wch: 15 }, // Total_Score
      { wch: 15 }  // Status
    ];

    XLSX.utils.book_append_sheet(wb, leaderboardWS, "Official Rankings");

    // 2. Department Rankings
    const deptMap: Record<string, { totalPoints: number; userCount: number }> = {};
    users.filter(u => u.role === 'user').forEach(u => {
      const dept = normalizeDepartment(u.department);
      if (!deptMap[dept]) deptMap[dept] = { totalPoints: 0, userCount: 0 };
      deptMap[dept].totalPoints += (u.totalPoints || 0);
      deptMap[dept].userCount += 1;
    });

    const departmentData = Object.entries(deptMap).map(([name, stats]) => ({
      Group_Name: formatDepartmentDisplay(name),
      Total_Points: stats.totalPoints,
      Participant_Count: stats.userCount,
      Average_Points: stats.userCount > 0 ? Number((stats.totalPoints / stats.userCount).toFixed(2)) : 0
    })).sort((a, b) => b.Total_Points - a.Total_Points);

    const deptWS = XLSX.utils.json_to_sheet(departmentData);
    XLSX.utils.book_append_sheet(wb, deptWS, "Group Standings");

    // 3. Match History
    const outcomesWS = XLSX.utils.json_to_sheet(matches.map(m => ({
      Match: `${m.teamA} vs ${m.teamB}`,
      Kickoff: formatKickoff(m.kickoffTime),
      Winner: m.result || 'PENDING',
      Goals: m.totalGoalsResult || 'PENDING',
      Participation: m.stats?.total || 0
    })));
    XLSX.utils.book_append_sheet(wb, outcomesWS, "Match Results");

    XLSX.writeFile(wb, `MRF_SRC_Rankings_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportMasterPredictions = async () => {
    setExportingPredictions(true);
    try {
      await exportMasterPredictionsReport(db, users, matches);
    } catch (error) {
      console.error("Error exporting predictions report:", error);
      alert("Failed to generate predictions report. Please try again.");
    } finally {
      setExportingPredictions(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <ShieldAlert className="w-16 h-16 text-red-600 mb-4" />
        <h1 className="text-4xl font-black italic tracking-tighter text-red-700 font-bebas">ACCESS DENIED</h1>
        <p className="text-red-400 mt-2 font-bold uppercase tracking-widest text-sm">You do not have administrative privileges.</p>
        <Link href="/" className="mt-8 px-8 py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-2xl">Return Home</Link>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#fcfcfc]">
      {/* Top Admin Bar */}
      <div className="bg-red-700 text-white py-4 px-6 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-[0.1em] font-bebas leading-none uppercase">Admin <span className="text-red-200">Panel</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Battle Management Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest rounded-xl text-[10px] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>
            <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all">Arena View</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-red-50 p-1.5 rounded-2xl w-fit">
          {[
            { id: 'matches', label: 'Battles', icon: LayoutGrid },
            { id: 'users', label: 'Participants', icon: Users },
            { id: 'stats', label: 'Statistics', icon: BarChart3 },
            { id: 'notices', label: 'Notice Board', icon: Bell }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as AdminTab);
                setSearchTerm("");
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black italic uppercase tracking-tighter font-bebas transition-all ${
                activeTab === tab.id 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                  : 'text-red-300 hover:text-red-500 hover:bg-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <StatBox icon={<Users className="w-5 h-5" />} label="Total Participants" value={globalStats.totalUsers} color="red" />
          <StatBox icon={<BarChart3 className="w-5 h-5" />} label="Total Predictions" value={globalStats.totalPredictions} color="red" />
          <StatBox icon={<Activity className="w-5 h-5" />} label="Live Battles" value={globalStats.activeMatches} color="live" />
          <StatBox icon={<LayoutGrid className="w-5 h-5" />} label="Total Battles" value={matches.length} color="red" />
        </div>

        {/* Incomplete Users Alert */}
        {incompleteCount > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="text-sm font-black text-amber-800 font-bebas italic uppercase">{incompleteCount}</span>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider ml-1">
                user{incompleteCount !== 1 ? 's' : ''} with incomplete profile — no Employee ID or Group set
              </span>
            </div>
          </div>
        )}

        {/* Leaderboard Visibility Toggle */}
        <div className="mb-8 flex items-center justify-between gap-4 p-5 md:p-6 bg-white rounded-2xl border border-red-50 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wider text-red-700 font-bebas italic leading-relaxed">
                Enable Leaderboard Visibility
              </p>
              <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest leading-relaxed mt-0.5">
                {isLeaderboardEnabled ? "Visible to all participants" : "Hidden from standard users"}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isLeaderboardEnabled}
            aria-label="Enable Leaderboard Visibility"
            disabled={togglingLeaderboard}
            onClick={handleLeaderboardToggle}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-50 ${
              isLeaderboardEnabled ? "bg-red-600" : "bg-red-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                isLeaderboardEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* On-Demand Predictions Export */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 md:p-6 bg-gradient-to-r from-slate-800 to-[#1B365D] rounded-2xl border border-slate-700 shadow-lg">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wider text-white font-bebas italic leading-relaxed">
              Predictions Data Pipeline
            </p>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed mt-1">
              Stream full prediction records on demand — no live DOM rendering
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportMasterPredictions}
            disabled={exportingPredictions}
            className="shrink-0 flex items-center gap-2 px-5 py-3 bg-white text-[#1B365D] font-black uppercase tracking-widest rounded-xl text-xs shadow-md hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportingPredictions ? (
              <>
                <span className="w-4 h-4 border-2 border-[#1B365D]/30 border-t-[#1B365D] rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>📥 Export Master Predictions Report (Excel)</>
            )}
          </button>
        </div>

        {/* Round Leaderboard Tools */}
        <div className="mb-8 p-6 bg-gradient-to-r from-red-800 to-red-700 rounded-2xl border border-red-600 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white font-bebas italic leading-relaxed">
                ⚙️ Round Leaderboard Tools
              </h3>
              <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest leading-relaxed mt-1">
                Backfill round points from already-scored predictions
              </p>
            </div>
            <button
              onClick={handleBackfill}
              disabled={backfilling}
              className="shrink-0 flex items-center gap-2 px-5 py-3 bg-white text-red-700 font-black uppercase tracking-widest rounded-xl text-xs shadow-md hover:bg-red-50 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {backfilling ? (
                <>
                  <span className="w-4 h-4 border-2 border-red-700/30 border-t-red-700 rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>🔄 Backfill Round Points</>
              )}
            </button>
          </div>
          {backfillResult && (
            <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider ${
              backfillResult.success ? 'bg-green-900/40 text-green-200' : 'bg-red-900/40 text-red-200'
            }`}>
              {backfillResult.success ? (
                <>✅ Processed {backfillResult.predictionsProcessed} predictions across {backfillResult.usersProcessed} users</>
              ) : (
                <>❌ Failed: {backfillResult.errors.join("; ")}</>
              )}
            </div>
          )}

          <hr className="border-red-600/30" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white font-bebas italic leading-relaxed">
                🏷️ Match Numbering Tools
              </h3>
              <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest leading-relaxed mt-1">
                Renumber all matches sequentially by kickoff time. Delete roundPoints in Firebase console first, then Backfill.
              </p>
            </div>
            <button
              onClick={handleRenumber}
              disabled={renumbering}
              className="shrink-0 flex items-center gap-2 px-5 py-3 bg-white text-red-700 font-black uppercase tracking-widest rounded-xl text-xs shadow-md hover:bg-red-50 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {renumbering ? (
                <>
                  <span className="w-4 h-4 border-2 border-red-700/30 border-t-red-700 rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>🔢 Renumber All Matches</>
              )}
            </button>
          </div>
          {renumberResult && (
            <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider ${
              renumberResult.success ? 'bg-green-900/40 text-green-200' : 'bg-red-900/40 text-red-200'
            }`}>
              {renumberResult.success ? (
                <>✅ Renumbered {renumberResult.matchesProcessed} matches</>
              ) : (
                <>❌ Failed: {renumberResult.errors.join("; ")}</>
              )}
            </div>
          )}

          <hr className="border-red-600/30" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white font-bebas italic leading-relaxed">
                🏆 Full Score Tiebreaker
              </h3>
              <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest leading-relaxed mt-1">
                Count perfect predictions (both winner &amp; goals correct) for all users from existing data
              </p>
            </div>
            <button
              onClick={handleBackfillFullScores}
              disabled={backfillingFullScores}
              className="shrink-0 flex items-center gap-2 px-5 py-3 bg-white text-red-700 font-black uppercase tracking-widest rounded-xl text-xs shadow-md hover:bg-red-50 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {backfillingFullScores ? (
                <>
                  <span className="w-4 h-4 border-2 border-red-700/30 border-t-red-700 rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>🏅 Backfill Full Scores</>
              )}
            </button>
          </div>
          {backfillFullScoresResult && (
            <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider ${
              backfillFullScoresResult.success ? 'bg-green-900/40 text-green-200' : 'bg-red-900/40 text-red-200'
            }`}>
              {backfillFullScoresResult.success ? (
                <>✅ Scored {backfillFullScoresResult.predictionsProcessed} predictions across {backfillFullScoresResult.usersProcessed} users</>
              ) : (
                <>❌ Failed: {backfillFullScoresResult.errors.join("; ")}</>
              )}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-xl overflow-hidden">
          {/* Toolbar */}
          <div className="px-8 py-6 border-b border-red-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-50/30">
            <h2 className="text-2xl font-black italic tracking-[0.1em] text-red-700 font-bebas uppercase flex items-center gap-3">
              {activeTab === 'matches' && <><Settings className="w-6 h-6" /> Match Deployment</>}
              {activeTab === 'users' && <><Users className="w-6 h-6" /> User Roster</>}
              {activeTab === 'stats' && <><BarChart3 className="w-6 h-6" /> Statistics</>}
              {activeTab === 'notices' && <><Bell className="w-6 h-6" /> Notice Management</>}
            </h2>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setIsRefreshing(true); loadAdminData(); }}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-100 text-red-600 font-black uppercase tracking-widest rounded-xl text-xs shadow-sm hover:bg-red-50 transition-all active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {activeTab === 'users' && (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-200" />
                  <input 
                    type="text" 
                    placeholder="Search..."
                    className="pl-11 pr-6 py-2.5 rounded-xl bg-white border border-red-100 outline-none text-xs font-bold text-red-700 w-full md:w-64 focus:border-red-600 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
              {activeTab === 'matches' && (
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl text-xs shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  New Battle
                </button>
              )}
              {activeTab === 'notices' && (
                <button 
                  onClick={() => setShowNoticeForm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl text-xs shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Post Notice
                </button>
              )}
            </div>
          </div>

          {activeTab === 'matches' && (
            <div className="px-8 py-4 border-b border-red-50 flex gap-1">
              <button
                onClick={() => setMatchTab('upcoming')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  matchTab === 'upcoming' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-red-400 hover:text-red-600'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setMatchTab('completed')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  matchTab === 'completed' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-red-400 hover:text-red-600'
                }`}
              >
                Completed
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            {activeTab === 'matches' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50/50 text-[10px] font-black uppercase tracking-widest text-red-400">
                    <th className="px-8 py-4">#</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Battle</th>
                    <th className="px-8 py-4">Stage</th>
                    <th className="px-8 py-4">Kickoff</th>
                    <th className="px-8 py-4">Engagement</th>
                    <th className="px-8 py-4">Final Result</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {(matchTab === 'upcoming' ? matches.filter(m => m.status !== 'completed') : matches.filter(m => m.status === 'completed')).sort((a,b) => {
                    const timeA = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string).getTime();
                    const timeB = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string).getTime();
                    return timeA - timeB;
                  }).map((match) => (
                    <tr key={match.id} className="hover:bg-red-50/20 transition-all group">
                      <td className="px-8 py-6 text-sm font-black italic text-red-500 font-bebas">
                        {match.matchNumber != null ? `#${match.matchNumber}` : "—"}
                      </td>
                      <td className="px-8 py-6">
                        <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          match.status === 'completed' ? 'bg-red-50 text-red-600 border-red-100' : 
                          match.status === 'live' ? 'bg-red-600 text-white border-red-600 animate-pulse' :
                          'bg-white text-red-300 border-red-50'
                        }`}>
                          {match.status}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-lg font-black italic uppercase tracking-tighter text-red-700 font-bebas">
                          {match.teamA} <span className="text-red-300 mx-1">vs</span> {match.teamB}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {match.matchNumber != null && (
                          <span className="inline-block px-2 py-1 rounded-full bg-red-50 text-red-400 border border-red-100 text-[9px] font-black uppercase tracking-widest">
                            {getStageFromMatchNumber(match.matchNumber)}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-red-700">
                            {match.kickoffTime instanceof Timestamp 
                              ? match.kickoffTime.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' }) 
                              : new Date(match.kickoffTime as string).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-bold text-red-300">
                            {match.kickoffTime instanceof Timestamp 
                              ? match.kickoffTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                              : new Date(match.kickoffTime as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <div className="flex justify-between text-[9px] font-bold text-red-300 uppercase tracking-widest">
                            <span>{match.stats?.total || 0} Predictions</span>
                            <span>{match.stats ? Math.round((match.stats.total / (globalStats.totalUsers || 1)) * 100) : 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-red-50 rounded-full overflow-hidden flex">
                            {match.stats && match.stats.total > 0 && (
                              <>
                                <div style={{ width: `${(match.stats.teamA / match.stats.total) * 100}%` }} className="bg-red-600 h-full" />
                                <div style={{ width: `${(match.stats.draw / match.stats.total) * 100}%` }} className="bg-red-400 h-full" />
                                <div style={{ width: `${(match.stats.teamB / match.stats.total) * 100}%` }} className="bg-red-200 h-full" />
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {match.status === "completed" ? (
                          <div className="flex flex-col gap-1 text-red-600">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Winner: {match.result}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Goals: {match.totalGoalsResult}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            {(match.matchNumber && roundKeyFromMatchNumber(match.matchNumber) === "knockout"
                              ? [match.teamA, match.teamB]
                              : [match.teamA, "DRAW", match.teamB]
                            ).map((res) => (
                              <button
                                key={res}
                                onClick={() => setConfirmResult({ matchId: match.id, result: res as string, goals: "" })}
                                className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-100 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 hover:text-white transition-all"
                              >
                                {res === "DRAW" ? "DRW" : res?.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {match.status !== 'completed' && (
                            <button 
                              onClick={() => handleSetStatus(match.id, match.status === 'live' ? 'upcoming' : 'live')}
                              className={`p-2 rounded-lg transition-all ${
                                match.status === 'live' ? 'bg-red-50 text-red-600' : 'bg-red-600 text-white'
                              }`}
                            >
                              {match.status === 'live' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setEditingMatch(match);
                              setMatchForm({
                                teamA: match.teamA,
                                teamB: match.teamB,
                                kickoffTime: match.kickoffTime instanceof Timestamp 
                                  ? match.kickoffTime.toDate().toISOString().slice(0, 16)
                                  : new Date(match.kickoffTime as string).toISOString().slice(0, 16)
                              });
                            }}
                            className="p-2 bg-red-50 text-red-600 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteMatch(match.id)}
                            className="p-2 bg-red-50 text-red-300 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'users' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50/50 text-[10px] font-black uppercase tracking-widest text-red-400">
                    <th className="px-8 py-4">Participant</th>
                    <th className="px-8 py-4">Contact Info</th>
                    <th className="px-8 py-4">Organization</th>
                    <th className="px-8 py-4">Performance</th>
                    <th className="px-8 py-4">Joined</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-red-50/20 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                            <Users className="w-5 h-5 text-red-400" />
                          </div>
                          <div>
                            <div className="text-sm font-black italic uppercase tracking-tighter text-red-700 font-bebas">{user.name}</div>
                            <div className="text-[10px] font-bold text-red-300 uppercase tracking-widest">{user.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-red-700">{user.email}</span>
                          <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Emp ID: {user.employeeId || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 text-[10px] font-black uppercase tracking-widest">
                            {user.department ? formatDepartmentDisplay(user.department) : 'GENERAL'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="text-lg font-black italic text-red-600 font-bebas">{user.totalPoints} PTS</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-red-700">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                          {user.createdAt && (
                            <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest">
                              {new Date(user.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleLeaderboardVisibility(user)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              user.showOnLeaderboard !== false ? 'bg-emerald-400' : 'bg-red-300'
                            }`}
                            title={user.showOnLeaderboard !== false ? 'Visible on leaderboard' : 'Hidden from leaderboard'}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              user.showOnLeaderboard !== false ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`} />
                          </button>
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'stats' && (
              <div className="p-6 md:p-8 space-y-10">

                {/* ── Section 1: Prediction Accuracy ── */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black italic tracking-[0.08em] text-red-700 font-bebas uppercase">Prediction Accuracy</h2>
                  </div>

                  {/* Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-100 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-4xl font-black italic text-red-600 font-bebas">{detailStats.winnerAccuracy}%</div>
                      <div className="text-[10px] font-bold text-red-300 uppercase tracking-widest mt-1">Winner Accuracy</div>
                      <div className="mt-2 w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-red-600 h-full rounded-full transition-all" style={{ width: `${detailStats.winnerAccuracy}%` }} />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-100 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-4xl font-black italic text-red-600 font-bebas">{detailStats.goalsAccuracy}%</div>
                      <div className="text-[10px] font-bold text-red-300 uppercase tracking-widest mt-1">Goals Accuracy</div>
                      <div className="mt-2 w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-red-600 h-full rounded-full transition-all" style={{ width: `${detailStats.goalsAccuracy}%` }} />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-100 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-4xl font-black italic text-red-600 font-bebas">{detailStats.combinedAccuracy}%</div>
                      <div className="text-[10px] font-bold text-red-300 uppercase tracking-widest mt-1">Combined Accuracy</div>
                      <div className="mt-2 w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-red-600 h-full rounded-full transition-all" style={{ width: `${detailStats.combinedAccuracy}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Accuracy Trend Line Chart */}
                  <div className="bg-white rounded-2xl border border-red-50 p-6 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-red-700 font-bebas italic mb-4">Accuracy Trend (Cumulative)</h3>
                    {detailStats.accuracyTrend.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={detailStats.accuracyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" />
                            <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#dc2626' }} axisLine={{ stroke: '#fecaca' }} tickLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 10, fill: '#fca5a5' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #fecaca', fontSize: 12, fontWeight: 700 }} />
                            <Line type="monotone" dataKey="winnerAcc" name="Winner %" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: '#dc2626' }} />
                            <Line type="monotone" dataKey="goalsAcc" name="Goals %" stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center text-red-300 text-xs font-bold uppercase tracking-widest py-12">No completed matches yet</p>
                    )}
                  </div>
                </div>

                {/* ── Section 2: Engagement ── */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black italic tracking-[0.08em] text-red-700 font-bebas uppercase">Engagement</h2>
                  </div>

                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl font-black italic text-red-600 font-bebas">{detailStats.activePct}%</div>
                      <div className="text-[9px] font-bold text-red-300 uppercase tracking-widest mt-1">Active Users</div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl font-black italic text-red-600 font-bebas">{detailStats.totalPredictions}</div>
                      <div className="text-[9px] font-bold text-red-300 uppercase tracking-widest mt-1">Total Predictions</div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl font-black italic text-red-600 font-bebas">{detailStats.avgPerUser}</div>
                      <div className="text-[9px] font-bold text-red-300 uppercase tracking-widest mt-1">Avg / User</div>
                    </div>
                    <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-3xl font-black italic text-red-600 font-bebas">{detailStats.avgPerMatch}</div>
                      <div className="text-[9px] font-bold text-red-300 uppercase tracking-widest mt-1">Avg / Match</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Activity Pie */}
                    <div className="bg-white rounded-2xl border border-red-50 p-6 shadow-sm">
                      <h3 className="text-sm font-black uppercase tracking-wider text-red-700 font-bebas italic mb-4">User Activity Distribution</h3>
                      {detailStats.userDistribution.some(d => d.count > 0) ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={detailStats.userDistribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={80} label={({ payload }) => `${payload.range}: ${payload.count}`}>
                                {detailStats.userDistribution.map((_, i) => (
                                  <Cell key={i} fill={['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'][i]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #fecaca', fontSize: 12, fontWeight: 700 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-center text-red-300 text-xs font-bold uppercase tracking-widest py-12">No data yet</p>
                      )}
                    </div>

                    {/* Department Engagement Bar */}
                    <div className="bg-white rounded-2xl border border-red-50 p-6 shadow-sm">
                      <h3 className="text-sm font-black uppercase tracking-wider text-red-700 font-bebas italic mb-4">Department Activity</h3>
                      {detailStats.deptEngagement.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={detailStats.deptEngagement} layout="vertical" barCategoryGap="25%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 10, fill: '#fca5a5' }} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fontWeight: 700, fill: '#dc2626' }} axisLine={{ stroke: '#fecaca' }} tickLine={false} width={80} />
                              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #fecaca', fontSize: 12, fontWeight: 700 }} />
                              <Bar dataKey="active" name="Active Users" fill="#dc2626" radius={[0, 6, 6, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-center text-red-300 text-xs font-bold uppercase tracking-widest py-12">No department data</p>
                      )}
                    </div>
                  </div>

                  {/* Engagement per Match Trend */}
                  <div className="bg-white rounded-2xl border border-red-50 p-6 shadow-sm mt-6">
                    <h3 className="text-sm font-black uppercase tracking-wider text-red-700 font-bebas italic mb-4">Engagement per Match</h3>
                    {detailStats.engagementTrend.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={detailStats.engagementTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" />
                            <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#dc2626' }} axisLine={{ stroke: '#fecaca' }} tickLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 10, fill: '#fca5a5' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #fecaca', fontSize: 12, fontWeight: 700 }} />
                            <Line type="monotone" dataKey="predictions" name="Predictions" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: '#dc2626' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center text-red-300 text-xs font-bold uppercase tracking-widest py-12">No match data</p>
                    )}
                  </div>
                </div>

                {/* ── Section 3: Per-Match Stats ── */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                      <LayoutGrid className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black italic tracking-[0.08em] text-red-700 font-bebas uppercase">Per-Match Stats</h2>
                  </div>

                  {/* Match Filter Tabs */}
                  <div className="flex gap-1 mb-5 bg-red-50 p-1 rounded-xl w-fit">
                    {(['all', 'upcoming', 'completed'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setStatsMatchTab(tab)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          statsMatchTab === tab ? 'bg-red-600 text-white shadow-sm' : 'text-red-400 hover:text-red-600'
                        }`}
                      >
                        {tab === 'all' ? 'All Matches' : tab === 'upcoming' ? 'Upcoming' : 'Completed'}
                      </button>
                    ))}
                  </div>

                  {/* Match Cards Grid */}
                  {detailStats.matchDetails.filter(m =>
                    statsMatchTab === 'all' ? true :
                    statsMatchTab === 'upcoming' ? m.status !== 'completed' : m.status === 'completed'
                  ).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
                      {detailStats.matchDetails
                        .filter(m => statsMatchTab === 'all' ? true :
                          statsMatchTab === 'upcoming' ? m.status !== 'completed' : m.status === 'completed'
                        )
                        .map((m, i) => {
                          const total = m.teamAPicks + m.drawPicks + m.teamBPicks || 1;
                          return (
                            <div key={i} className="bg-white rounded-2xl border border-red-50 p-5 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-black italic uppercase tracking-tighter text-red-700 font-bebas leading-tight">
                                  {m.teamA} <span className="text-red-300">vs</span> {m.teamB}
                                </span>
                                {m.matchNumber && (
                                  <span className="text-[9px] font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-full">#{m.matchNumber}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase tracking-widest mb-3">
                                <span>{m.totalPredictions} predictions</span>
                              </div>
                              {/* Winner pick distribution mini bar */}
                              <div className="h-5 w-full bg-red-50 rounded-full overflow-hidden flex mb-2">
                                <div style={{ width: `${(m.teamAPicks / total) * 100}%` }} className="bg-red-600 h-full transition-all" title={`${m.teamA}: ${m.teamAPicks}`} />
                                <div style={{ width: `${(m.drawPicks / total) * 100}%` }} className="bg-red-400 h-full transition-all" title={`Draw: ${m.drawPicks}`} />
                                <div style={{ width: `${(m.teamBPicks / total) * 100}%` }} className="bg-red-200 h-full transition-all" title={`${m.teamB}: ${m.teamBPicks}`} />
                              </div>
                              <div className="flex justify-between text-[8px] font-bold text-red-300 uppercase tracking-widest">
                                <span>{m.teamA.slice(0, 8)}: {m.teamAPicks}</span>
                                <span>Draw: {m.drawPicks}</span>
                                <span>{m.teamB.slice(0, 8)}: {m.teamBPicks}</span>
                              </div>
                              {m.scored && (
                                <div className="mt-3 pt-3 border-t border-red-50">
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className="text-red-400">Result: {m.result} ({m.totalGoalsResult})</span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px]">
                                    <span className="text-emerald-700 font-black">🟢 3pts: {m.pts3}</span>
                                    <span className="text-amber-600 font-black">🟡 2pts: {m.pts2}</span>
                                    <span className="text-blue-600 font-black">🔵 1pt: {m.pts1}</span>
                                    <span className="text-gray-400 font-black">⚪ 0pt: {m.pts0}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-center text-red-300 text-xs font-bold uppercase tracking-widest py-12">No matches found</p>
                  )}
                </div>

                {/* ── Section 4: Round Breakdown ── */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-black italic tracking-[0.08em] text-red-700 font-bebas uppercase">Round Breakdown</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {detailStats.roundStats.map((r) => (
                      <div key={r.label} className="bg-gradient-to-br from-white to-red-50 rounded-2xl border border-red-100 p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-black italic text-red-700 font-bebas">{r.label}</h3>
                          <span className="text-[9px] font-black text-red-400 bg-red-100 px-2 py-0.5 rounded-full">{r.matches} matches</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Predictions</span>
                            <span className="text-2xl font-black italic text-red-600 font-bebas">{r.predictions}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Avg / Match</span>
                            <span className="text-lg font-black italic text-red-500 font-bebas">{r.avgPerMatch}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Unique Users</span>
                            <span className="text-lg font-black italic text-red-500 font-bebas">{r.uniqueUsers}</span>
                          </div>
                          <hr className="border-red-100" />
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Winner Acc</span>
                            <span className="text-xl font-black italic text-emerald-600 font-bebas">{r.winnerAccuracy}%</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Goals Acc</span>
                            <span className="text-xl font-black italic text-emerald-600 font-bebas">{r.goalsAccuracy}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'notices' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50/50 text-[10px] font-black uppercase tracking-widest text-red-400">
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Notice Title</th>
                    <th className="px-8 py-4">Type</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {notices.map((notice) => (
                    <tr key={notice.id} className="hover:bg-red-50/20 transition-all group">
                      <td className="px-8 py-6 text-[10px] font-bold text-red-300 uppercase tracking-widest">
                        {new Date(notice.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black italic uppercase tracking-tighter text-red-700 font-bebas">{notice.title}</div>
                        <div className="text-[10px] text-red-300 line-clamp-1">{notice.content}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          notice.type === 'alert' ? 'bg-red-50 text-red-600 border-red-100' :
                          notice.type === 'update' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {notice.type}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleDeleteNotice(notice.id)}
                          className="p-2 bg-red-50 text-red-300 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {notices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-red-300 font-bold uppercase tracking-widest text-xs">
                        No notices posted yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Match Modal */}
      <AnimatePresence>
        {(showAddForm || editingMatch) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddForm(false);
                setEditingMatch(null);
                setMatchForm({ teamA: "", teamB: "", kickoffTime: "" });
              }}
              className="absolute inset-0 bg-red-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-red-100"
            >
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingMatch(null);
                  setMatchForm({ teamA: "", teamB: "", kickoffTime: "" });
                }}
                className="absolute top-6 right-6 p-2 text-red-300 hover:text-red-600"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-3xl font-black italic tracking-tighter text-red-700 font-bebas mb-6 uppercase">
                {editingMatch ? "Update Battle" : "New Battle"}
              </h2>
              
              <form onSubmit={editingMatch ? handleUpdateMatch : handleAddMatch} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block pl-1">Team A</label>
                  <input 
                    list="wc-teams"
                    type="text" 
                    placeholder="Search or type team name..."
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold placeholder:text-red-200"
                    value={matchForm.teamA}
                    onChange={(e) => setMatchForm({...matchForm, teamA: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block pl-1">Team B</label>
                  <input 
                    list="wc-teams"
                    type="text" 
                    placeholder="Search or type team name..."
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold placeholder:text-red-200"
                    value={matchForm.teamB}
                    onChange={(e) => setMatchForm({...matchForm, teamB: e.target.value})}
                  />
                </div>
                
                <datalist id="wc-teams">
                  {WORLD_CUP_2026_TEAMS.map(team => (
                    <option key={team} value={team} />
                  ))}
                </datalist>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block pl-1">Kickoff Time</label>
                  <input 
                    type="datetime-local" 
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold"
                    value={matchForm.kickoffTime}
                    onChange={(e) => setMatchForm({...matchForm, kickoffTime: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl mt-4 shadow-xl shadow-red-200"
                >
                  {editingMatch ? "Save Changes" : "Deploy Match"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-red-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-red-100"
            >
              <button 
                onClick={() => setEditingUser(null)}
                className="absolute top-6 right-6 p-2 text-red-300 hover:text-red-600"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-3xl font-black italic tracking-tighter text-red-700 font-bebas mb-6 uppercase">
                Edit Participant
              </h2>
              
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block pl-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl mt-4 shadow-xl shadow-red-200"
                >
                  Save Identity
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Notice Modal */}
      <AnimatePresence>
        {showNoticeForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNoticeForm(false)}
              className="absolute inset-0 bg-red-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-red-100"
            >
              <button 
                onClick={() => setShowNoticeForm(false)}
                className="absolute top-6 right-6 p-2 text-red-300 hover:text-red-600"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-3xl font-black italic tracking-tighter text-red-700 font-bebas mb-6 uppercase flex items-center gap-2">
                <Bell className="w-8 h-8" />
                Broadcast Notice
              </h2>
              
              <form onSubmit={handleAddNotice} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block pl-1">Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Points Updated"
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold placeholder:text-red-200"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({...noticeForm, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block pl-1">Content</label>
                  <textarea 
                    rows={3}
                    placeholder="Enter message details..."
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold placeholder:text-red-200 resize-none"
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm({...noticeForm, content: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block pl-1">Type</label>
                  <select 
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold appearance-none transition-all"
                    value={noticeForm.type}
                    onChange={(e) => setNoticeForm({...noticeForm, type: e.target.value as Notice['type']})}
                  >
                    <option value="info">Information (Green)</option>
                    <option value="update">Update (Blue)</option>
                    <option value="alert">Alert (Red)</option>
                  </select>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl mt-4 shadow-xl shadow-red-200"
                >
                  Post to Home
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Confirmation Modal */}
      <AnimatePresence>
        {confirmResult && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-900/60 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-black italic tracking-tighter text-red-700 font-bebas mb-2 uppercase">Battle Outcome</h2>
              <p className="text-sm text-red-400 font-bold uppercase tracking-wider mb-4">
                Set final results for <span className="text-red-600">{confirmResult.result}</span>
              </p>
              
              <div className="mb-8 space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block text-left pl-1">Total Goals Scored</label>
                  <select 
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold appearance-none transition-all"
                    value={confirmResult.goals}
                    onChange={(e) => setConfirmResult({...confirmResult, goals: e.target.value})}
                  >
                    <option value="" disabled>Select Total Goals</option>
                    {["0", "1", "2", "3", "4+"].map(opt => (
                      <option key={opt} value={opt}>{opt} Goals</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmResult(null)}
                  className="flex-1 py-4 bg-red-50 text-red-400 font-black uppercase tracking-widest rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveResult}
                  disabled={!confirmResult.goals}
                  className={`flex-1 py-4 font-black uppercase tracking-widest rounded-xl shadow-lg transition-all ${
                    !confirmResult.goals ? 'bg-red-200 text-white cursor-not-allowed' : 'bg-red-600 text-white shadow-red-200'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: 'red' | 'live' }) {
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border border-red-50 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        color === 'live' ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600'
      }`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black text-red-300 uppercase tracking-widest leading-none mb-1">{label}</div>
        <div className="text-2xl font-black italic font-bebas text-red-700 leading-none">{value}</div>
      </div>
    </div>
  );
}
