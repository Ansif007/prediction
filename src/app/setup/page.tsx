"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";
import { ShieldCheck, User as UserIcon, Send, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DEPARTMENT_OTHER } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function SetupPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departments: { value: string; label: string }[] = [
    { value: "TUBE", label: "TUBE" },
    { value: "TYRE", label: "TYRE" },
    { value: "MIXING", label: "MIXING" },
    { value: "PCTR", label: "PCTR" },
    { value: DEPARTMENT_OTHER, label: "others" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.replace("/");
    return null;
  }

  if (userData?.employeeId && userData?.department) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = employeeId.trim();
    if (!cleanId || !user?.uid || !department) return;

    setSubmitting(true);
    setError(null);
    try {
      const q = query(collection(db, "users"), where("employeeId", "==", cleanId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const duplicate = querySnapshot.docs.find(d => d.id !== user!.uid);
        if (duplicate) {
          setError("This Employee Number is already registered.");
          setSubmitting(false);
          return;
        }
      }

      const userRef = doc(db, "users", user!.uid);
      await setDoc(userRef, {
        employeeId: cleanId,
        department: department,
        profileSetup: true,
      }, { merge: true });

      router.replace("/dashboard");
    } catch (error) {
      console.error("Error saving employee ID:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-red-100 text-center"
      >
        <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl shadow-red-200">
          <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-white" />
        </div>

        <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter text-red-700 font-bebas mb-3 uppercase leading-none">
          VERIFY YOUR <span className="text-red-600">IDENTITY</span>
        </h2>

        <p className="text-xs md:text-sm text-red-400 font-bold uppercase tracking-widest mb-8 md:mb-10 leading-relaxed">
          To join the contest, please enter your <span className="text-red-600">Details</span>. You only need to do this once.
        </p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] md:text-xs font-black uppercase tracking-widest"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-red-200 group-focus-within:text-red-600 transition-colors">
                <UserIcon className="w-5 h-5" />
              </div>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="Enter Employee Number"
                className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl bg-red-50 border-2 border-transparent focus:border-red-600 focus:bg-white outline-none text-red-700 font-black placeholder:text-red-200 transition-all text-sm md:text-base"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-red-200 group-focus-within:text-red-600 transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <select
                required
                className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl bg-red-50 border-2 border-transparent focus:border-red-600 focus:bg-white outline-none text-red-700 font-black appearance-none transition-all text-sm md:text-base"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="" disabled>Select Group</option>
                {departments.map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-red-300">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !employeeId.trim() || !department}
            className={`w-full flex items-center justify-center gap-3 py-4 md:py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all active:scale-95 text-sm md:text-base shadow-xl ${
              submitting || !employeeId.trim() || !department
                ? "bg-red-50 text-red-200 shadow-none cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
            }`}
          >
            {submitting ? "Verifying..." : "Join the Arena"}
            {!submitting && <Send className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
