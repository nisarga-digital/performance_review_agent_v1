import React from "react";
import { motion } from "framer-motion";
import { Zap, Activity } from "lucide-react";

export default function Navbar({ isOnline, sidebarOpen, setSidebarOpen }) {
  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass sticky top-0 z-50 flex items-center gap-4 px-5 h-[54px] border-b border-white/[0.07] shrink-0"
    >
      {/* Hamburger */}
      <button
        onClick={() => setSidebarOpen((s) => !s)}
        className="lg:hidden flex flex-col gap-1 p-1.5 rounded-md hover:bg-white/5 transition"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-4 h-[1.5px] rounded-full bg-slate-400"
          />
        ))}
      </button>

      {/* Logo mark */}
      <div className="flex items-center gap-2.5 select-none">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg glow-purple">
          <Activity size={14} className="text-white" />
        </div>
        <span className="font-semibold text-[15px] gradient-text tracking-tight hidden sm:block">
          Performance Review Intelligence
        </span>
        <span className="font-semibold text-[15px] gradient-text tracking-tight sm:hidden">
          PRI
        </span>
      </div>

      <div className="flex-1" />

      {/* Status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-500 ${
            isOnline ? "bg-emerald-400 glow-green" : "bg-red-400"
          }`}
          style={{
            boxShadow: isOnline
              ? "0 0 8px rgba(52,211,153,0.8)"
              : "0 0 8px rgba(248,113,113,0.8)",
          }}
        />
        <span className="text-xs text-slate-400 hidden sm:block">
          {isOnline ? "Backend Online" : "Backend Offline"}
        </span>
      </div>

      {/* Model badge */}
      <div className="pill bg-violet-500/10 border border-violet-500/30 text-violet-300">
        <Zap size={10} />
        <span>Gemini 2.5 Flash</span>
      </div>
    </motion.nav>
  );
}