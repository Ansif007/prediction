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
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShieldAlert, Globe, Plus, Trash2, Calendar, Trophy, X, Edit2, Play, Pause, BarChart3, AlertTriangle, Users, LayoutGrid, Settings, Activity, Star } from "lucide-react";
import Link from "next/link";

interface Match {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: any;
  result?: string;
  status?: string;
  playerOfTheMatch?: string;
  stats?: {
    teamA: number;
    draw: number;
    teamB: number;
    total: number;
  };
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ matchId: string, result: string, potm: string } | null>(null);
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    totalPredictions: 0,
    activeMatches: 0
  });
  
  // New/Edit Match Form State
  const [matchForm, setMatchForm] = useState({
    teamA: "",
    teamB: "",
    kickoffTime: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
          loadMatches();
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadMatches = async () => {
    try {
      // Load Matches
      const snapshot = await getDocs(collection(db, "matches"));
      const matchesData = await Promise.all(snapshot.docs.map(async (docItem) => {
        const data = docItem.data();
        const predQuery = query(collection(db, "predictions"), where("matchId", "==", docItem.id));
        const predSnap = await getDocs(predQuery);
        const preds = predSnap.docs.map(d => d.data());
        
        return {
          id: docItem.id,
          ...(data as Omit<Match, "id">),
          stats: {
            teamA: preds.filter(p => p.prediction === data.teamA).length,
            draw: preds.filter(p => p.prediction === "DRAW").length,
            teamB: preds.filter(p => p.prediction === data.teamB).length,
            total: preds.length
          }
        };
      }));
      setMatches(matchesData);

      // Load Global Stats
      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "user")));
      const predsSnap = await getDocs(collection(db, "predictions"));
      
      setGlobalStats({
        totalUsers: usersSnap.size,
        totalPredictions: predsSnap.size,
        activeMatches: matchesData.filter(m => m.status === 'live').length
      });
    } finally {
      setLoading(false);
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
      });
      setShowAddForm(false);
      setMatchForm({ teamA: "", teamB: "", kickoffTime: "" });
      loadMatches();
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
      loadMatches();
    } catch (error) {
      console.error("Error updating match:", error);
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

  const saveResult = async () => {
    if (!confirmResult) return;
    const { matchId, result, potm } = confirmResult;
    
    try {
      const match = matches.find((m) => m.id === matchId);
      if (match?.status === "completed") {
        alert("Points already calculated");
        return;
      }

      await updateDoc(doc(db, "matches", matchId), {
        result,
        status: "completed",
        playerOfTheMatch: potm || "N/A"
      });

      const predictionsQuery = query(
        collection(db, "predictions"),
        where("matchId", "==", matchId)
      );

      const predictionSnapshot = await getDocs(predictionsQuery);

      for (const predictionDoc of predictionSnapshot.docs) {
        const predictionData = predictionDoc.data();
        if (predictionData.prediction === result) {
          await updateDoc(doc(db, "users", predictionData.uid), {
            totalPoints: increment(3),
          });
        }
      }

      alert("Result saved and points awarded!");
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'completed', result } : m));
      setConfirmResult(null);
    } catch (error) {
      console.error(error);
      alert("Failed to save result. Check console.");
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
              <h1 className="text-xl font-black italic tracking-tighter font-bebas leading-none uppercase">Admin <span className="text-red-200">Panel</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Battle Management Console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all">Arena View</Link>
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-700 font-black uppercase tracking-widest rounded-xl text-xs shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Battle
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Global Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatBox icon={<Users className="w-5 h-5" />} label="Total Participants" value={globalStats.totalUsers} color="red" />
          <StatBox icon={<BarChart3 className="w-5 h-5" />} label="Total Predictions" value={globalStats.totalPredictions} color="red" />
          <StatBox icon={<Activity className="w-5 h-5" />} label="Live Battles" value={globalStats.activeMatches} color="live" />
          <StatBox icon={<LayoutGrid className="w-5 h-5" />} label="Total Battles" value={matches.length} color="red" />
        </div>

        {/* Command Center Layout */}
        <div className="bg-white rounded-[2rem] border border-red-50 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-red-50 flex items-center justify-between bg-red-50/30">
            <h2 className="text-2xl font-black italic tracking-tighter text-red-700 font-bebas uppercase flex items-center gap-3">
              <Settings className="w-6 h-6" />
              Battle Deployment Center
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-red-300 uppercase tracking-widest">Sort by: Kickoff Time</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-red-50/50 text-[10px] font-black uppercase tracking-widest text-red-400">
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Battle</th>
                  <th className="px-8 py-4">Kickoff</th>
                  <th className="px-8 py-4">Engagement</th>
                  <th className="px-8 py-4">Result Management</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {matches.sort((a,b) => {
                  const timeA = a.kickoffTime instanceof Timestamp ? a.kickoffTime.toDate().getTime() : new Date(a.kickoffTime).getTime();
                  const timeB = b.kickoffTime instanceof Timestamp ? b.kickoffTime.toDate().getTime() : new Date(b.kickoffTime).getTime();
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
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black italic uppercase tracking-tighter text-red-700 font-bebas">
                          {match.teamA} <span className="text-red-300 mx-1">vs</span> {match.teamB}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-red-700">
                          {match.kickoffTime instanceof Timestamp 
                            ? match.kickoffTime.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' }) 
                            : new Date(match.kickoffTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-bold text-red-300">
                          {match.kickoffTime instanceof Timestamp 
                            ? match.kickoffTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : new Date(match.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Winner: {match.result}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-3 h-3 text-red-400" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">POTM: {match.playerOfTheMatch}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          {[match.teamA, "DRAW", match.teamB].map((res) => (
                            <button
                              key={res}
                              onClick={() => setConfirmResult({ matchId: match.id, result: res as string, potm: "" })}
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
                                : new Date(match.kickoffTime).toISOString().slice(0, 16)
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
                    type="text" 
                    placeholder="e.g. Argentina"
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold placeholder:text-red-200"
                    value={matchForm.teamA}
                    onChange={(e) => setMatchForm({...matchForm, teamA: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block pl-1">Team B</label>
                  <input 
                    type="text" 
                    placeholder="e.g. France"
                    className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold placeholder:text-red-200"
                    value={matchForm.teamB}
                    onChange={(e) => setMatchForm({...matchForm, teamB: e.target.value})}
                  />
                </div>
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
              <h2 className="text-2xl font-black italic tracking-tighter text-red-700 font-bebas mb-2 uppercase">Confirm Winner</h2>
              <p className="text-sm text-red-400 font-bold uppercase tracking-wider mb-4">
                Are you sure <span className="text-red-600">{confirmResult.result}</span> won?
              </p>
              
              <div className="mb-8">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-1 block text-left pl-1">Player of the Match</label>
                <input 
                  type="text" 
                  placeholder="Enter Player Name"
                  className="w-full px-5 py-3 rounded-xl bg-red-50 border border-red-100 focus:border-red-600 outline-none text-red-700 font-bold placeholder:text-red-200"
                  value={confirmResult.potm}
                  onChange={(e) => setConfirmResult({...confirmResult, potm: e.target.value})}
                />
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
                  className="flex-1 py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-200"
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