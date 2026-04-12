import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, HardDrive, FileText, Upload, X, Trash2, Loader2 } from "lucide-react";
import { deleteDataSource } from "../../api";
import toast from "react-hot-toast";
import FileUploader from "../fileuploader/Fileuploader";

export default function Sidebar({
  isOpen,
  onClose,  
  isOnline,
  dataSources,
  onUploadSuccess,
  onDeleteSuccess,
  logs,
}) {
  const [deletingFile, setDeletingFile] = useState(null);

  const handleDelete = async (filename) => {
    try {
      setDeletingFile(filename);
      await deleteDataSource(filename);
      toast.success(`${filename} deleted`);
      onDeleteSuccess?.();
    } catch (e) {
      toast.error(`Failed to delete: ${e.message}`);
    } finally {
      setDeletingFile(null);
    }
  };

  const storedOutputs = logs.slice(0, 5);

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Control Panel
        </span>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* System Status */}
        <section>
          <SectionLabel icon={<HardDrive size={11} />} label="System" />
          <div
            className={`mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
              isOnline
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-red-500/10 border-red-500/25 text-red-400"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? "bg-emerald-400" : "bg-red-400"
              }`}
              style={{
                boxShadow: isOnline
                  ? "0 0 6px rgba(52,211,153,0.9)"
                  : "0 0 6px rgba(248,113,113,0.9)",
              }}
            />
            {isOnline ? "Backend Online" : "Backend Offline"}
          </div>
        </section>

        {/* Data Sources */}
        <section>
          <SectionLabel icon={<Database size={11} />} label="Data Sources" />
          <div className="mt-2 flex flex-col gap-1">
            {dataSources.length === 0 ? (
              <p className="text-xs text-slate-600 italic px-1">
                No data files found.
              </p>
            ) : (
              dataSources.map((src, i) => (
                <motion.div
                  key={src.name || i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="sidebar-item group relative"
                >
                  <FileText size={12} className="text-violet-400 shrink-0" />
                  <span className="truncate pr-5">{src.name || src}</span>
                  {src.size && (
                    <span className="ml-auto text-[10px] text-slate-600 shrink-0 group-hover:hidden pr-1">
                      {formatBytes(src.size)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(src.name || src)}
                    disabled={deletingFile === (src.name || src)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-500/0 hover:text-red-400 group-hover:text-red-400/60 transition-all rounded hover:bg-red-500/10 hidden group-hover:flex items-center justify-center -mr-1"
                    title="Delete file"
                  >
                    {deletingFile === (src.name || src) ? (
                      <Loader2 size={12} className="animate-spin text-red-400" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* File Uploader */}
        <section>
          <SectionLabel icon={<Upload size={11} />} label="Upload" />
          <div className="mt-2">
            <FileUploader onSuccess={onUploadSuccess} />
          </div>
        </section>

        {/* Stored Outputs */}
        <section>
          <SectionLabel icon={<FileText size={11} />} label="Stored Outputs" />
          <div className="mt-2 flex flex-col gap-1">
            {storedOutputs.length === 0 ? (
              <p className="text-xs text-slate-600 italic px-1">
                No saved answers yet.
              </p>
            ) : (
              storedOutputs.map((log, i) => (
                <div
                  key={i}
                  className="sidebar-item flex-col items-start gap-0.5"
                >
                  <span className="text-violet-400 text-[11px] truncate w-full">
                    Q: {log.query?.substring(0, 36)}
                    {log.query?.length > 36 ? "…" : ""}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleTimeString()
                      : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="hidden lg:flex shrink-0 border-r border-white/[0.06] flex-col h-full overflow-hidden glass"
          >
            <div className="w-64 h-full shrink-0">
              {sidebarContent}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 glass border-r border-white/[0.06] z-50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SectionLabel({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-600">{icon}</span>
      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
