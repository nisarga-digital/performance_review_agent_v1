import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Play, ClipboardList, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analyzeQuery, uploadFile } from "./api";
import { useBackend } from "./hooks/useBackend";

function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const sessionIdRef = useRef(createSessionId());

  const { dataSources, refresh, queriesRun, memoryTurns, stats } = useBackend();

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    
    setInput("");
    
    const userMsg = { role: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    
    const history = messages.map(m => ({
      role: m.role,
      content: m.text
    }));
    
    try {
      const data = await analyzeQuery(trimmed, history, sessionIdRef.current);
      setMessages(prev => [...prev, { role: "assistant", text: data?.answer || data?.response || "No response received." }]);
      refresh(); // <-- dynamically update stats!
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "⚠️ Error connecting to server." }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, refresh]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleDragOver = (e) => e.preventDefault();
  
  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setUploadProgress(0);
      await uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      refresh();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await handleUpload(file);
  };
  
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) await handleUpload(file);
  };
  
  const resetApp = () => {
    setMessages([]);
    sessionIdRef.current = createSessionId();
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9F8F5] text-[#2C3530] font-sans">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-[#E5E7EB] shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-[#295745] flex items-center justify-center text-white">
                <CheckCircle2 size={24} />
             </div>
             <div>
                <h1 className="font-serif text-[22px] font-bold tracking-wide leading-tight text-[#2C3530]">Performance Review Agent</h1>
                <p className="text-[11px] text-[#8AA095] uppercase tracking-widest font-semibold mt-0.5">POWERED BY GEMINI AI</p>
             </div>
        </div>
        <div className="flex items-center gap-4">
           {dataSources?.length > 0 ? (
             <div className="badge">
               <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
               {dataSources.length} file{dataSources.length !== 1 ? 's' : ''} loaded
             </div>
           ) : (
             <div className="badge">
               <div className="w-2 h-2 rounded-full bg-[#D1D5DB]"></div>
               No data loaded
             </div>
           )}
           <button onClick={resetApp} className="pill-button font-medium">Reset</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <div className="w-[340px] bg-white border-r border-[#E5E7EB] flex flex-col pt-8 pb-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
          <div className="px-6 pb-6 overflow-y-auto">
            
            {/* Employee Data */}
            <div className="mb-10">
              <h3 className="text-[11px] font-bold text-[#8AA095] tracking-widest uppercase mb-4">EMPLOYEE DATA</h3>
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-[#D1D5DB] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition relative overflow-hidden"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileSelect} 
                  accept=".csv,.xlsx"
                />
                {uploadProgress !== null ? (
                  <div className="flex flex-col items-center w-full relative z-10">
                    <p className="text-sm font-semibold text-[#295745] mb-2">Uploading... {uploadProgress}%</p>
                    <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#295745] transition-all" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <ClipboardList size={32} className="text-[#8AA095] mb-4 opacity-50 relative z-10" />
                    <p className="text-sm text-[#4B5563] leading-relaxed relative z-10">Drop <span className="font-semibold text-[#295745]">employees.csv</span> here or click<br/>to browse</p>
                  </>
                )}
              </div>
            </div>

            {/* Session Stats */}
            <div className="mb-10">
               <h3 className="text-[11px] font-bold text-[#8AA095] tracking-widest uppercase mb-4">SESSION STATS</h3>
               <div className="grid grid-cols-2 gap-3">
                  {[ 
                    {label: "EMPLOYEES", val: stats?.employees || "0"}, 
                    {label: "SELF REVIEWS", val: stats?.self_reviews || "0"}, 
                    {label: "MGR REVIEWS", val: stats?.manager_reviews || "0"}, 
                    {label: "COMPLETE", val: stats?.complete || "0"} 
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#F3F4F6] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-serif font-bold text-[#2C3530] mb-1.5">{stat.val}</span>
                      <span className="text-[10px] tracking-widest text-[#8AA095] font-semibold">{stat.label}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* CSV Format */}
            <div>
              <h3 className="text-[11px] font-bold text-[#8AA095] tracking-widest uppercase mb-4">CSV FORMAT</h3>
              <div className="bg-[#F3F4F6] rounded-2xl p-5 text-[13px] text-[#4B5563]">
                <p className="mb-4">Required columns:</p>
                <ul className="space-y-2.5 font-mono text-[12px] leading-relaxed">
                  <li><span className="bg-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">employee_id</span> <span className="font-sans text-[#6B7280]">— unique ID</span></li>
                  <li><span className="bg-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">name</span> <span className="font-sans text-[#6B7280]">— full name</span></li>
                  <li><span className="bg-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">role</span> <span className="font-sans text-[#6B7280]">— job title</span></li>
                  <li><span className="bg-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">department</span> <span className="font-sans text-[#6B7280]">— dept name</span></li>
                  <li><span className="bg-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">review_period</span> <span className="font-sans text-[#6B7280]">— e.g. Q1 2024</span></li>
                  <li><span className="bg-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">past_ratings</span> <span className="font-sans text-[#6B7280]">— e.g. 3.8,4.0</span></li>
                  <li><span className="bg-[#E5E7EB] px-1.5 py-0.5 rounded text-[#374151]">past_years</span> <span className="font-sans text-[#6B7280]">— e.g. 2022,2023</span></li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#F9F8F5]">
          
          {messages.length === 0 ? (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto"
              >
                <div className="w-[104px] h-[104px] bg-[#295745] rounded-3xl flex items-center justify-center text-white mb-8 shadow-md">
                  <Play fill="white" size={40} className="ml-2" />
                </div>
                <h2 className="font-serif text-[42px] font-bold text-[#2C3530] mb-5 tracking-tight">Ready to Begin</h2>
                <p className="text-[17px] text-[#6B7280] leading-relaxed mb-10 max-w-lg">
                  Upload your employee CSV, then start a conversation. The agent guides you through self-assessments and manager reviews step by step.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                   <button onClick={() => sendMessage("Employee login")} className="pill-button px-6 py-2.5 shadow-sm text-base">Employee login</button>
                   <button onClick={() => sendMessage("Manager login")} className="pill-button px-6 py-2.5 shadow-sm text-base">Manager login</button>
                   <button onClick={() => sendMessage("View report")} className="pill-button px-6 py-2.5 shadow-sm text-base">View report</button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-4xl mx-auto w-full">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-5 rounded-3xl max-w-[85%] ${m.role === 'user' ? 'bg-[#295745] text-white rounded-tr-sm shadow-sm' : 'bg-white shadow-sm border border-[#E5E7EB] text-[#2C3530] rounded-tl-sm chat-markdown'}`}>
                     {m.role === 'user' ? m.text : (
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>
                         {m.text}
                       </ReactMarkdown>
                     )}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                 <div className="flex justify-start">
                    <div className="p-5 rounded-3xl bg-white shadow-sm border border-[#E5E7EB] rounded-tl-sm flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-[#D1D5DB] animate-bounce"></div>
                       <div className="w-2 h-2 rounded-full bg-[#D1D5DB] animate-bounce delay-100"></div>
                       <div className="w-2 h-2 rounded-full bg-[#D1D5DB] animate-bounce delay-200"></div>
                    </div>
                 </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input Bar */}
          <div className="p-6 pb-8 shrink-0 relative">
             {/* Gradient overlay for smooth scroll fade */}
             <div className="absolute top-0 left-0 right-0 h-8 -translate-y-full bg-gradient-to-t from-[#F9F8F5] to-transparent pointer-events-none" />
             
             <div className="max-w-4xl mx-auto relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isTyping}
                  placeholder="Type your message..."
                  className="w-full bg-[#F3F4F6] border border-[#E5E7EB] text-[#2C3530] rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-[#295745] focus:bg-white transition-all shadow-sm disabled:opacity-50 text-base"
                />
                <button 
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-2 bottom-2 w-12 bg-[#295745] disabled:opacity-50 hover:bg-[#1D4333] transition-colors rounded-xl flex items-center justify-center text-white"
                >
                  <Send size={18} className="translate-x-[1px]" />
                </button>
             </div>
             <p className="text-center text-[12px] text-[#9CA3AF] mt-4 font-medium">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}