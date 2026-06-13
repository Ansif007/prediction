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
  onSnapshot,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, Plus, Trash2, X, Edit2, Play, Pause, 
  BarChart3, AlertTriangle, Users, LayoutGrid, Settings, Activity, 
  Download, Search, Trophy, Target, Bell
} from "lucide-react";
import Link from "next/link";
import * as XLSX from 'xlsx';
import { Match, UserData, Prediction, DeptData, Notice } from "@/types";
import { formatKickoff, WORLD_CUP_2026_TEAMS, normalizeDepartment, formatDepartmentDisplay } from "@/lib/utils";
import { exportMasterPredictionsReport } from "@/lib/exportPredictionsReport";
import { useMobileBackToHome } from "@/hooks/useMobileBackToHome";

type AdminTab = 'matches' | 'users' | 'notices';

export default function AdminPage() {
  useMobileBackToHome();
  const [activeTab, setActiveTab] = useState<AdminTab>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [exportingPredictions, setExportingPredictions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ matchId: string, result: string, goals: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLeaderboardEnabled, setIsLeaderboardEnabled] = useState(true);
  const [togglingLeaderboard, setTogglingLeaderboard] = useState(false);
  
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    totalPredictions: 0,
    activeMatches: 0
  });
  const [incompleteCount, setIncompleteCount] = useState(0);
  
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

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (cancelled) return;

        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error verifying admin:", error);
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    setLoading(true);

    let usersData: UserData[] = [];
    let matchesRaw: Match[] = [];
    let noticesData: Notice[] = [];
    let statsFetchId = 0;

    const refreshMatchStats = (currentMatches: Match[]) => {
      const fetchId = ++statsFetchId;

      getDocs(collection(db, "predictions"))
        .then((predictionsSnap) => {
          if (cancelled || fetchId !== statsFetchId) return;

          const preds = predictionsSnap.docs.map(
            (docItem) => ({ id: docItem.id, ...docItem.data() }) as Prediction
          );

          const enrichedMatches: Match[] = currentMatches.map((data) => {
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

          setMatches(enrichedMatches);
          setGlobalStats((prev) => ({
            ...prev,
            totalPredictions: preds.length,
          }));
        })
        .catch((error) => console.error("Error fetching prediction stats:", error));
    };

    const syncState = () => {
      if (cancelled) return;

      const baseMatches: Match[] = matchesRaw.map((data) => ({
        ...data,
        stats: data.stats ?? { teamA: 0, draw: 0, teamB: 0, total: 0 },
      }));

      setUsers(
        [...usersData].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
      );
      setMatches(baseMatches);
      setNotices(
        [...noticesData].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setGlobalStats({
        totalUsers: usersData.filter((u) => u.role === "user").length,
        totalPredictions: 0,
        activeMatches: baseMatches.filter((m) => m.status === "live").length,
      });
      setIncompleteCount(
        usersData.filter((u) => u.role === "user" && (!u.employeeId || !u.department)).length
      );
      setLoading(false);
      refreshMatchStats(matchesRaw);
    };

    const unsubs = [
      onSnapshot(
        collection(db, "users"),
        (snap) => {
          usersData = snap.docs.map(
            (docItem) => ({ id: docItem.id, ...docItem.data() }) as UserData
          );
          syncState();
        },
        (error) => console.error("Users listener error:", error)
      ),
      onSnapshot(
        collection(db, "matches"),
        (snap) => {
          matchesRaw = snap.docs.map(
            (docItem) => ({ id: docItem.id, ...docItem.data() }) as Match
          );
          syncState();
        },
        (error) => console.error("Matches listener error:", error)
      ),
      onSnapshot(
        collection(db, "notices"),
        (snap) => {
          noticesData = snap.docs.map(
            (docItem) => ({ id: docItem.id, ...docItem.data() }) as Notice
          );
          syncState();
        },
        (error) => console.error("Notices listener error:", error)
      ),
      onSnapshot(
        doc(db, "config", "app_settings"),
        (snap) => {
          if (cancelled) return;
          setIsLeaderboardEnabled(
            snap.exists() ? snap.data().isLeaderboardEnabled !== false : true
          );
        },
        (error) => console.error("Settings listener error:", error)
      ),
    ];

    return () => {
      cancelled = true;
      unsubs.forEach((unsub) => unsub());
    };
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

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchForm.teamA || !matchForm.teamB || !matchForm.kickoffTime) return;
    
    try {
      await addDoc(collection(db, "matches"), {
        ...matchForm,
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
        status: "completed"
      });

      for (const predictionDoc of predictionSnapshot.docs) {
        const pred = predictionDoc.data() as Prediction;
        
        // Skip if points already awarded for this prediction
        if (pred.pointsAwarded) continue;
  
        const user = users.find(u => u.uid === pred.uid);
        
        // Skip admins
        if (user?.role === 'admin') continue;
  
        let pointsEarned = 0;
        
        // Winner Prediction (2 Points)
        if (pred.winnerPrediction === result) {
          pointsEarned += 2;
        }
        
        // Goals Prediction (1 Point)
        if (pred.goalsPrediction === goals) {
          pointsEarned += 1;
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

        {/* Tab Content */}
        <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-xl overflow-hidden">
          {/* Toolbar */}
          <div className="px-8 py-6 border-b border-red-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-50/30">
            <h2 className="text-2xl font-black italic tracking-[0.1em] text-red-700 font-bebas uppercase flex items-center gap-3">
              {activeTab === 'matches' && <><Settings className="w-6 h-6" /> Match Deployment</>}
              {activeTab === 'users' && <><Users className="w-6 h-6" /> User Roster</>}
              {activeTab === 'notices' && <><Bell className="w-6 h-6" /> Notice Management</>}
            </h2>
            
            <div className="flex items-center gap-3">
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

          <div className="overflow-x-auto">
            {activeTab === 'matches' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50/50 text-[10px] font-black uppercase tracking-widest text-red-400">
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Battle</th>
                    <th className="px-8 py-4">Kickoff</th>
                    <th className="px-8 py-4">Engagement</th>
                    <th className="px-8 py-4">Final Result</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {matches.sort((a,b) => {
                    const timeA = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime as string).getTime();
                    const timeB = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime as string).getTime();
                    return timeA - timeB;
                  }).map((match) => (
                    <tr key={match.id} className="hover:bg-red-50/20 transition-all group">
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
                            {[match.teamA, "DRAW", match.teamB].map((res) => (
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
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
