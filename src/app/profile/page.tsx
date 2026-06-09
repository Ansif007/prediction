"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import { collection, doc, getDoc, getDocs, updateDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion } from "framer-motion";
import { User as UserIcon, Save, ArrowLeft, BadgeCheck, Star, CheckCircle2, Target, Timer, XCircle, Factory } from "lucide-react";
import Link from "next/link";

interface UserProfile {
  name: string;
  employeeId: string;
  department: string;
  plant: string;
  email: string;
  totalPoints: number;
}

interface MatchStats {
  completed: number;
  predicted: number;
  pending: number;
  missed: number;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    employeeId: "",
    department: "",
    plant: "",
    email: "",
    totalPoints: 0
  });
  const [stats, setStats] = useState<MatchStats>({
    completed: 0,
    predicted: 0,
    pending: 0,
    missed: 0
  });

  const departments = [
    "TUBE", "TYRE", "MIXING", "PCTR", "OTHER (SAFETY, SECURITY, HR)"
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch Profile
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserProfile);
        }

        // Fetch Stats
        try {
          const matchesSnap = await getDocs(collection(db, "matches"));
          const predsSnap = await getDocs(query(collection(db, "predictions"), where("uid", "==", user.uid)));
          
          const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const predictions = predsSnap.docs.map(d => d.data());
          const predictedMatchIds = new Set(predictions.map(p => p.matchId));

          const newStats = {
            completed: 0,
            predicted: 0,
            pending: 0,
            missed: 0
          };

          matches.forEach((match) => {
            const matchData = match as { id: string, status?: string };
            const isPredicted = predictedMatchIds.has(matchData.id);
            const isCompleted = matchData.status === 'completed';

            if (isCompleted) {
              if (isPredicted) newStats.completed++;
              else newStats.missed++;
            } else {
              if (isPredicted) newStats.predicted++;
              else newStats.pending++;
            }
          });

          setStats(newStats);
        } catch (error) {
          console.error("Error fetching stats:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setMessage(null);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        name: profile.name.trim(),
        department: profile.department
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-8 md:py-12">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-red-300 hover:text-red-600 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-8 transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Arena
      </Link>

      <header className="mb-12 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-red-200 relative group overflow-hidden">
            <UserIcon className="w-10 h-10 md:w-16 md:h-16 text-white" />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest">
              <BadgeCheck className="w-3 h-3" />
              Official Participant
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-red-700 font-bebas leading-none uppercase">
              USER <span className="text-red-600">PROFILE</span>
            </h1>
            <p className="text-[10px] md:text-xs text-red-400 font-bold uppercase tracking-[0.2em]">
              Manage your arena identity
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        {/* Points Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600 p-8 rounded-[2.5rem] shadow-xl shadow-red-200 text-white flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-red-100 mb-1">Total Points</div>
            <div className="text-5xl font-black italic font-bebas">{profile.totalPoints}</div>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Star className="w-8 h-8 text-white fill-white" />
          </div>
        </motion.div>

        {/* Prediction Stats Dashboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard 
            label="Completed" 
            value={stats.completed} 
            icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} 
            bgColor="bg-green-50" 
            borderColor="border-green-100"
            textColor="text-green-700"
          />
          <StatCard 
            label="Predicted" 
            value={stats.predicted} 
            icon={<Target className="w-4 h-4 text-blue-600" />} 
            bgColor="bg-blue-50" 
            borderColor="border-blue-100"
            textColor="text-blue-700"
          />
          <StatCard 
            label="Pending" 
            value={stats.pending} 
            icon={<Timer className="w-4 h-4 text-yellow-600" />} 
            bgColor="bg-yellow-50" 
            borderColor="border-yellow-100"
            textColor="text-yellow-700"
          />
          <StatCard 
            label="Missed" 
            value={stats.missed} 
            icon={<XCircle className="w-4 h-4 text-red-600" />} 
            bgColor="bg-red-50" 
            borderColor="border-red-100"
            textColor="text-red-700"
          />
        </motion.div>

        {/* Edit Form */}
        <motion.form 
          onSubmit={handleSave}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-red-50 card-shadow space-y-6"
        >
          {message && (
            <div className={`p-4 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest text-center ${
              message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-2 block pl-1">Full Name</label>
              <input 
                type="text" 
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="w-full px-6 py-4 rounded-2xl bg-red-50 border-2 border-transparent focus:border-red-600 outline-none text-red-700 font-bold transition-all"
                placeholder="Your official name"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-2 block pl-1">Group</label>
              <div className="relative group">
                <select
                  className="w-full px-6 py-4 rounded-2xl bg-red-50 border-2 border-transparent focus:border-red-600 outline-none text-red-700 font-bold appearance-none transition-all"
                  value={profile.department}
                  onChange={(e) => setProfile({...profile, department: e.target.value})}
                >
                  <option value="" disabled>Select Group</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-red-300">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-2 block pl-1">Plant (Private & Locked)</label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-red-200">
                  <Factory className="w-4 h-4" />
                </div>
                <input 
                  type="text" 
                  value={profile.plant}
                  disabled
                  className="w-full pl-14 pr-6 py-4 rounded-2xl bg-red-50/50 border-2 border-red-50 text-red-200 font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300 mb-2 block pl-1">Employee Number (Private & Locked)</label>
              <input 
                type="text" 
                value={profile.employeeId}
                disabled
                className="w-full px-6 py-4 rounded-2xl bg-red-50/50 border-2 border-red-50 text-red-200 font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={saving}
            className={`w-full flex items-center justify-center gap-3 py-4 md:py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all active:scale-95 text-sm shadow-xl ${
              saving 
                ? "bg-red-50 text-red-200 cursor-not-allowed" 
                : "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
            }`}
          >
            {saving ? "Updating..." : "Save Identity"}
            {!saving && <Save className="w-4 h-4" />}
          </button>
        </motion.form>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, bgColor, borderColor, textColor }: { label: string, value: number, icon: React.ReactNode, bgColor: string, borderColor: string, textColor: string }) {
  return (
    <div className={`${bgColor} ${borderColor} border p-4 rounded-3xl flex flex-col items-center justify-center text-center space-y-1`}>
      <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm mb-1">
        {icon}
      </div>
      <div className={`text-xl font-black font-bebas leading-none ${textColor}`}>{value}</div>
      <div className="text-[8px] font-bold uppercase tracking-widest text-red-300">{label}</div>
    </div>
  );
}
