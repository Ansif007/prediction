"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, Bell } from "lucide-react";
import { useState, useEffect, createContext, useContext } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 w-full max-w-[90vw] md:max-w-md pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] shadow-2xl border backdrop-blur-xl pointer-events-auto ${
                toast.type === "success" 
                  ? "bg-white/90 border-green-100 text-green-700 shadow-green-200/30" 
                  : toast.type === "error"
                  ? "bg-white/90 border-red-100 text-red-600 shadow-red-200/30"
                  : "bg-white/90 border-blue-100 text-blue-700 shadow-blue-200/30"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === "success" ? "bg-green-600 text-white" :
                toast.type === "error" ? "bg-red-600 text-white" :
                "bg-blue-600 text-white"
              }`}>
                {toast.type === "success" && <CheckCircle2 className="w-5 h-5" />}
                {toast.type === "error" && <XCircle className="w-5 h-5" />}
                {toast.type === "info" && <Bell className="w-5 h-5" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-0.5">Arena Notification</span>
                <span className="text-sm font-black uppercase tracking-tight leading-tight">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
