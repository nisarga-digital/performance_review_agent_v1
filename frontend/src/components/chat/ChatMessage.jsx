import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { User } from "lucide-react";

export default function ChatMessage({ message, index }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`flex gap-3 max-w-[85%] ${isUser ? "self-end flex-row-reverse" : "self-start"}`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isUser
            ? "bg-violet-500/15 border border-violet-500/25 text-violet-400"
            : message.isError 
              ? "bg-red-500/15 border border-red-500/25 text-red-400" 
              : "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400"
          }`}
      >
        {isUser ? <User size={14} /> : <span className="text-[10px] font-bold">AI</span>}
      </div>

      <div
        className={`px-4 py-3 text-sm leading-relaxed ${isUser
            ? "bg-violet-600 border border-violet-500 rounded-2xl rounded-tr-sm text-white shadow-sm shadow-violet-500/20"
            : message.isError
              ? "glass border border-red-500/30 bg-red-500/5 rounded-2xl rounded-tl-sm text-red-200"
              : "glass border border-white/[0.07] rounded-2xl rounded-tl-sm text-slate-200"
          }`}
      >
        <div className="chat-markdown break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => (
                <a {...props} className="text-cyan-300 underline underline-offset-4" />
              ),
              code: ({ node, inline, className, children, ...props }) => (
                <code
                  {...props}
                  className={`rounded px-1.5 py-0.5 text-[12px] ${inline
                      ? "bg-white/10 text-slate-200"
                      : "bg-white/5 text-slate-200 block p-3 overflow-x-auto"
                    } ${className || ""}`}
                >
                  {children}
                </code>
              ),
            }}
          >
            {message.text || ""}
          </ReactMarkdown>
        </div>

        {message.timestamp && (
          <div className={`text-[9px] mt-1.5 ${isUser ? "text-violet-200/70 text-right" : "text-slate-500"}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
