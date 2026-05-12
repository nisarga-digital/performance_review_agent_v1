import React from "react";
import { Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatInput({ value, onChange, onSend, disabled, isLoading }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-5 pb-4 pt-2 bg-navy-900/40 backdrop-blur-md shrink-0">
      <div className="relative flex items-center glass border border-white/[0.08] rounded-2xl overflow-hidden focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about employee performance..."
          className="w-full bg-transparent pl-4 pr-12 py-3.5 outline-none text-sm text-slate-200 placeholder:text-slate-500 resize-none min-h-[52px] max-h-32 overflow-y-auto"
          disabled={disabled}
          rows={1}
        />
        <div className="absolute right-2 bottom-2 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:bg-slate-700/50 disabled:text-slate-500 disabled:hover:bg-slate-700/50 disabled:scale-100 flex items-center justify-center text-white transition-colors"
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} className="ml-0.5" />}
          </motion.button>
        </div>
      </div>
      <div className="text-center mt-2">
        <span className="text-[10px] text-slate-500/70">AI can make mistakes. Verify important performance metrics.</span>
      </div>
    </div>
  );
}
