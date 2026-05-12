import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import toast from "react-hot-toast";

export default function ExportLog({ logs }) {
  const [expanded, setExpanded] = useState({});

  const toggleEntry = (i) =>
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error("No logs to export");
      return;
    }
    const header = ["Query", "Response", "Timestamp"];
    const rows = logs.map((l) => [
      `"${(l.query || "").replace(/"/g, '""')}"`,
      `"${(l.response || l.answer || "").replace(/"/g, '""')}"`,
      `"${l.timestamp || ""}"`,
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-review-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported successfully!");
  };

  // If backend logs are empty, pull from localStorage chat history as fallback
  const displayLogs = logs.length > 0 ? logs : getLocalLogs();

  return (
    <div className="flex flex-col h-full px-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <ScrollText size={16} className="text-violet-400" />
          <span className="text-sm text-slate-300 font-medium">
            Query History
          </span>
          <span className="pill bg-white/5 border border-white/10 text-slate-500 text-[10px]">
            {displayLogs.length} entries
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition"
        >
          <Download size={12} />
          Export CSV
        </motion.button>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {displayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/[0.06] flex items-center justify-center">
              <ScrollText size={24} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-400">No queries yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Start chatting to build your query history.
              </p>
            </div>
          </div>
        ) : (
          displayLogs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass border border-white/[0.07] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleEntry(i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/4 transition"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-slate-600 mt-0.5 shrink-0">
                    #{String(displayLogs.length - i).padStart(3, "0")}
                  </span>
                  <span className="text-xs text-violet-300 truncate">
                    {log.query}
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-2 shrink-0">
                  {log.timestamp && (
                    <span className="text-[10px] text-slate-600">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {expanded[i] ? (
                    <ChevronUp size={13} className="text-slate-500" />
                  ) : (
                    <ChevronDown size={13} className="text-slate-500" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expanded[i] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-0 border-t border-white/[0.05]">
                      <p className="text-xs text-slate-400 leading-relaxed mt-2 whitespace-pre-wrap">
                        {log.response || log.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function getLocalLogs() {
  try {
    const stored = localStorage.getItem("pri_chat_history");
    if (!stored) return [];
    const msgs = JSON.parse(stored);
    const paired = [];
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].role === "user" && msgs[i + 1]?.role === "assistant") {
        paired.unshift({
          query: msgs[i].text,
          response: msgs[i + 1].text,
          timestamp: msgs[i].timestamp,
        });
        i++;
      }
    }
    return paired;
  } catch {
    return [];
  }
}