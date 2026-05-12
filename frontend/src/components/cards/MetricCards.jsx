import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Database, Brain, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

const cards = [
  {
    key: "index",
    label: "Index Status",
    icon: Cpu,
    color: "violet",
    iconColor: "text-violet-400",
    bgColor: "from-violet-500/10 to-purple-500/5",
    borderColor: "border-violet-500/20",
    glowColor: "rgba(124,107,255,0.15)",
  },
  {
    key: "sources",
    label: "Sources Loaded",
    icon: Database,
    color: "cyan",
    iconColor: "text-cyan-400",
    bgColor: "from-cyan-500/10 to-teal-500/5",
    borderColor: "border-cyan-500/20",
    glowColor: "rgba(34,211,238,0.15)",
  },
  {
    key: "turns",
    label: "Memory Turns",
    icon: Brain,
    color: "pink",
    iconColor: "text-pink-400",
    bgColor: "from-pink-500/10 to-rose-500/5",
    borderColor: "border-pink-500/20",
    glowColor: "rgba(244,114,182,0.15)",
  },
  {
    key: "queries",
    label: "Queries Run",
    icon: BarChart3,
    color: "green",
    iconColor: "text-emerald-400",
    bgColor: "from-emerald-500/10 to-teal-500/5",
    borderColor: "border-emerald-500/20",
    glowColor: "rgba(16,217,160,0.15)",
  },
];

function AnimatedCounter({ value, isString }) {
  const [display, setDisplay] = useState(isString ? value : 0);

  useEffect(() => {
    if (isString) {
      setDisplay(value);
      return;
    }
    const target = Number(value) || 0;
    const start = 0;
    const duration = 600;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [value, isString]);

  return <span className="count-animate">{display}</span>;
}

export default function MetricCards({ isOnline, sourcesCount, memoryTurns, queriesRun }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const values = {
    index: isOnline ? "Online" : "Offline",
    sources: sourcesCount,
    turns: memoryTurns,
    queries: queriesRun,
  };

  const statusColors = {
    index: isOnline
      ? "text-emerald-400"
      : "text-red-400",
  };

  return (
    <div className="px-5 pb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Metrics Dashboard
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
        >
          {isExpanded ? "Hide" : "Show"}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {cards.map((card, i) => {
        const Icon = card.icon;
        const val = values[card.key];
        const isStr = typeof val === "string";

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
            whileHover={{
              scale: 1.03,
              boxShadow: `0 8px 30px ${card.glowColor}`,
            }}
            className={`glass bg-gradient-to-br ${card.bgColor} border ${card.borderColor} rounded-2xl p-4 cursor-default transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-medium">
                {card.label}
              </span>
              <div
                className={`w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center`}
              >
                <Icon size={14} className={card.iconColor} />
              </div>
            </div>

            <div
              className={`text-2xl font-semibold tracking-tight ${
                card.key === "index"
                  ? statusColors.index
                  : "text-slate-100"
              }`}
            >
              <AnimatedCounter value={val} isString={isStr} />
            </div>

            {/* Subtle bar decoration */}
            <div className="mt-3 h-0.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${
                  card.key === "index" && !isOnline
                    ? "from-red-500 to-red-400"
                    : card.key === "index"
                    ? "from-emerald-500 to-teal-400"
                    : card.key === "sources"
                    ? "from-cyan-500 to-teal-400"
                    : card.key === "turns"
                    ? "from-pink-500 to-rose-400"
                    : "from-emerald-500 to-teal-400"
                } rounded-full`}
                initial={{ width: "0%" }}
                animate={{
                  width: isStr
                    ? isOnline ? "100%" : "30%"
                    : `${Math.min(100, (Number(val) / 50) * 100)}%`,
                }}
                transition={{ duration: 0.8, delay: i * 0.1 + 0.3 }}
              />
            </div>
          </motion.div>
        );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}