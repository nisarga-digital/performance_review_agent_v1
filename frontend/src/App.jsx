import React, { useState, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { MessageSquare, TableProperties, ScrollText, Loader2 } from "lucide-react";

import { useBackend } from "./hooks/useBackend";
import Navbar from "./components/navbar/Navbar";
import Sidebar from "./components/sidebar/Sidebar";
import MetricCards from "./components/cards/MetricCards";

// Lazy load heavy tabs
const ChatTab = lazy(() => import("./components/chat/ChatTab"));
const CSVPreview = lazy(() => import("./components/CSVPreview/CSVPreview"));
const ExportLog = lazy(() => import("./components/ExportLog/ExportLog"));

const TABS = [
  { id: "chat", label: "Chat & Analysis", icon: MessageSquare, color: "text-violet-400" },
  { id: "csv", label: "CSV Preview", icon: TableProperties, color: "text-emerald-400" },
  { id: "logs", label: "Export Log", icon: ScrollText, color: "text-cyan-400" },
];

const TAB_STORAGE_KEY = "pri_active_tab";

function TabSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin text-violet-400" />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem(TAB_STORAGE_KEY) || "chat"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    isOnline,
    dataSources,
    setDataSources,
    logs,
    setLogs,
    queriesRun,
    memoryTurns,
    loading,
    refresh,
    incrementQuery,
  } = useBackend();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem(TAB_STORAGE_KEY, tabId);
    setSidebarOpen(false);
  };

  const handleUploadSuccess = useCallback(
    (result) => {
      const newSource = result?.name
        ? { name: result.name, size: result.size }
        : result;
      setDataSources((prev) => {
        const exists = prev.some(
          (s) => (s.name || s) === (newSource?.name || newSource)
        );
        if (exists) return prev;
        return [...prev, newSource];
      });
      refresh();
    },
    [setDataSources, refresh]
  );

  const handleQuerySent = useCallback(() => {
    incrementQuery();
    // Also persist logs update from chat
    refresh();
  }, [incrementQuery, refresh]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-navy-950 relative">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div
          className="orb w-96 h-96 opacity-[0.12]"
          style={{
            background: "radial-gradient(circle, #7c6bff, transparent 70%)",
            top: "-6rem",
            left: "-4rem",
            animationDuration: "9s",
          }}
        />
        <div
          className="orb w-80 h-80 opacity-[0.08]"
          style={{
            background: "radial-gradient(circle, #22d3ee, transparent 70%)",
            bottom: "-4rem",
            right: "5rem",
            animationDuration: "11s",
            animationDelay: "-3s",
          }}
        />
        <div
          className="orb w-64 h-64 opacity-[0.07]"
          style={{
            background: "radial-gradient(circle, #a855f7, transparent 70%)",
            top: "40%",
            right: "-3rem",
            animationDuration: "13s",
            animationDelay: "-6s",
          }}
        />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Navbar */}
      <div className="relative z-10">
        <Navbar
          isOnline={isOnline}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isOnline={isOnline}
          dataSources={dataSources}
          onUploadSuccess={handleUploadSuccess}
          logs={logs}
        />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Hero + feature badges */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="px-5 pt-5 pb-3 text-center shrink-0"
          >
            <h1 className="text-2xl font-semibold gradient-text tracking-tight mb-1">
              Performance Review Intelligence
            </h1>
            <p className="text-[11px] text-slate-600 tracking-[2px] uppercase mb-3">
              AI-Powered · Conversational Memory · CSV & Excel Analysis
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { label: "RAG", color: "bg-violet-500" },
                { label: "Memory", color: "bg-pink-500" },
                { label: "PDF + CSV", color: "bg-amber-500" },
                { label: "Gemini 2.5 Flash", color: "bg-emerald-500" },
              ].map((f) => (
                <span
                  key={f.label}
                  className="pill bg-white/5 border border-white/[0.08] text-slate-400"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${f.color} inline-block`} />
                  {f.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Metric Cards */}
          <MetricCards
            isOnline={isOnline}
            sourcesCount={dataSources.length}
            memoryTurns={memoryTurns}
            queriesRun={queriesRun}
          />

          {/* Tab bar */}
          <div className="px-5 shrink-0 border-b border-white/[0.06]">
            <div className="flex gap-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "text-slate-200"
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    <Icon size={13} className={isActive ? tab.color : ""} />
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-purple-500 rounded-t-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab panels */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Suspense fallback={<TabSpinner />}>
                  {activeTab === "chat" && (
                    <ChatTab isOnline={isOnline} onQuerySent={handleQuerySent} />
                  )}
                  {activeTab === "csv" && (
                    <CSVPreview dataSources={dataSources} />
                  )}
                  {activeTab === "logs" && <ExportLog logs={logs} />}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#111827",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            fontSize: "13px",
            backdropFilter: "blur(12px)",
          },
          success: {
            iconTheme: { primary: "#10d9a0", secondary: "#111827" },
          },
          error: {
            iconTheme: { primary: "#f87171", secondary: "#111827" },
          },
        }}
      />
    </div>
  );
}