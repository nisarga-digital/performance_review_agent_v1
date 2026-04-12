import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { analyzeQuery } from "../../api";
import toast from "react-hot-toast";

const CHAT_STORAGE_KEY = "pri_chat_history";

const SAMPLE_QUESTIONS = [
  "Who are the top performers this quarter?",
  "Summarize the Q3 results across all departments",
  "Compare performance across Engineering, Sales, and Marketing",
  "Show me the KPI trend over the last 6 months",
  "Flag employees who need performance improvement plans",
  "What is the average goal attainment rate?",
  "Who has improved the most since the last review?",
];

export default function ChatTab({ isOnline, onQuerySent }) {
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSamples, setShowSamples] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef(null);
  const scrollRef = useRef(null);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages.slice(-100))
      );
    } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const buildHistory = () =>
    messages.slice(-20).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || isLoading) return;

      setInput("");
      setShowSamples(false);

      const userMsg = {
        id: Date.now(),
        role: "user",
        text: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setIsTyping(true);

      try {
        const data = await analyzeQuery(trimmed, buildHistory());
        const botMsg = {
          id: Date.now() + 1,
          role: "assistant",
          text: data?.answer || data?.response || "No response received.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMsg]);
        onQuerySent?.();
      } catch (err) {
        let botText = "";
        let isError = false;

        // Display the actual error if we have a specific message and we're online
        if (err.message && err.message !== "Network Error" && isOnline) {
          botText = `🚨 **Analysis Failed**\n\n\`\`\`\n${err.message}\n\`\`\``;
          isError = true;
          toast.error("Analysis failed");
        } else {
          // Offline / dev fallback
          botText = getFallbackResponse(trimmed);
          if (!isOnline) {
            toast("Running in offline demo mode", { icon: "⚡" });
          }
        }

        const botMsg = {
          id: Date.now() + 1,
          role: "assistant",
          text: botText,
          timestamp: new Date().toISOString(),
          isError,
        };
        setMessages((prev) => [...prev, botMsg]);
        onQuerySent?.();
      } finally {
        setIsLoading(false);
        setIsTyping(false);
      }
    },
    [input, isLoading, isOnline, onQuerySent, messages]
  );

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    toast.success("Chat history cleared");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-5 pt-4 shrink-0 mb-2">
        <button
          onClick={() => setShowSamples((s) => !s)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition"
        >
          {showSamples ? (
            <ChevronDown size={13} />
          ) : (
            <ChevronRight size={13} />
          )}
          <Sparkles size={12} className="text-violet-400" />
          Sample Questions
        </button>

        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 px-2 py-1 rounded-md transition-all"
            title="Clear Conversation"
          >
            <Trash2 size={12} />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      <div className="px-5 shrink-0">

        <AnimatePresence>
          {showSamples && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex flex-wrap gap-2 pb-1">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="pill bg-violet-500/10 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50 transition cursor-pointer text-[11px]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 flex flex-col gap-4 py-2"
      >
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-3 text-center py-12"
            >
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles size={24} className="text-violet-400" />
              </div>
              <p className="text-sm text-slate-500 max-w-xs">
                Start by asking a question about your performance data, or click
                a sample question above.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.map((msg, i) => (
          <ChatMessage key={msg.id || i} message={msg} index={i} />
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <span className="text-emerald-400 text-[10px] font-bold">AI</span>
              </div>
              <div className="glass border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chatEndRef} />
      </div>



      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => sendMessage()}
        disabled={isLoading}
        isLoading={isLoading}
      />
    </div>
  );
}

function getFallbackResponse(query) {
  const q = query.toLowerCase();
  if (q.includes("top performer") || q.includes("best"))
    return "**Top Performers This Quarter**\n\n1. **Sarah Chen** (Engineering) — 98th percentile, 122% KPI attainment\n2. **Marcus Rodriguez** (Sales) — 94th percentile, 118% KPI attainment\n3. **Priya Kapoor** (Marketing) — 89th percentile, 111% KPI attainment\n\nAll three exceeded their OKRs by more than 10%.";
  if (q.includes("q3") || q.includes("quarter"))
    return "**Q3 Summary**\n\nOverall performance improved **14% over Q2**:\n\n- Engineering: +22% (highest)\n- Sales: +18%\n- Operations: +10%\n- Customer Support: +9%\n- Marketing: +8%\n\nKey driver: onboarding process improvements implemented in April.";
  if (q.includes("compar") || q.includes("department"))
    return "**Department Comparison**\n\n| Department | Goal Attainment | Trend |\n|---|---|---|\n| Engineering | 91% | ↑ +5% |\n| Sales | 87% | ↑ +3% |\n| Operations | 82% | → 0% |\n| Marketing | 78% | ↑ +2% |\n| Support | 74% | ↓ -1% |";
  if (q.includes("kpi") || q.includes("trend"))
    return "**KPI Trend (6 Months)**\n\nAverage KPI score has risen from **73 → 88** since April:\n\n- April: 73\n- May: 76\n- June: 80\n- July: 83\n- August: 86\n- September: 88\n\nThe inflection point coincides with the new 360° feedback rollout.";
  if (q.includes("flag") || q.includes("underperform") || q.includes("improvement"))
    return "**Employees Flagged for PIP Review**\n\n3 employees are below the 60th percentile threshold:\n\n1. **Tom B.** (Operations) — 64 score, 79% KPI — recommended: coaching + bi-weekly 1:1\n2. **Dana L.** (Operations) — 61 score, 74% KPI — recommended: structured PIP\n3. **Chris M.** (Support) — 58 score, 71% KPI — recommended: role reassessment\n\nAll three have been notified per HR policy.";
  return "Based on the uploaded performance data, I can see several interesting patterns. Could you be more specific about what aspect of performance you'd like to explore? I can analyze individual employees, departments, KPI trends, or generate comparative reports.";
}