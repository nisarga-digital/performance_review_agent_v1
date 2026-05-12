import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TableProperties, ChevronDown, Loader2 } from "lucide-react";
import { getCSVPreview } from "../../api";

export default function CSVPreview({ dataSources }) {
  const [selectedFile, setSelectedFile] = useState(() =>
    localStorage.getItem("pri_selected_csv") || ""
  );
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persist selected file
  useEffect(() => {
    localStorage.setItem("pri_selected_csv", selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) return;
    fetchPreview(selectedFile);
  }, [selectedFile]);

  const fetchPreview = async (filename) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCSVPreview(filename);
      setPreviewData(data);
    } catch {
      // Fallback demo data when backend is offline
      setPreviewData(getDemoData(filename));
    } finally {
      setLoading(false);
    }
  };

  const fileOptions = dataSources.map((s) => (typeof s === "string" ? s : s.name));

  return (
    <div className="flex flex-col h-full px-5 py-4">
      {/* File selector */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <TableProperties size={16} className="text-violet-400" />
        <div className="relative flex-1 max-w-xs">
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="w-full glass border border-white/10 text-sm text-slate-300 rounded-xl px-3 py-2 pr-8 appearance-none outline-none focus:border-violet-500/50 transition cursor-pointer bg-transparent"
          >
            <option value="" disabled className="bg-navy-900">
              Select a file…
            </option>
            {fileOptions.map((f) => (
              <option key={f} value={f} className="bg-navy-900 text-slate-200">
                {f}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
        </div>
        {selectedFile && (
          <span className="text-xs text-slate-600">
            {previewData?.rows?.length || 0} rows
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!selectedFile ? (
          <EmptyState
            title="No file selected"
            subtitle="Upload a CSV or Excel file and select it above to preview the data."
          />
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-violet-400" />
          </div>
        ) : previewData ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full overflow-auto"
          >
            <table className="data-table w-full border-collapse">
              <thead className="sticky top-0">
                <tr>
                  {previewData.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap">
                        {formatCell(cell, previewData.headers[j])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <EmptyState title="No data" subtitle="Could not load file preview." />
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/[0.06] flex items-center justify-center">
        <TableProperties size={24} className="text-slate-600" />
      </div>
      <div>
        <p className="text-sm text-slate-400">{title}</p>
        <p className="text-xs text-slate-600 mt-1 max-w-xs">{subtitle}</p>
      </div>
    </div>
  );
}

function formatCell(val, header) {
  if (val === null || val === undefined) return "—";
  if (header?.toLowerCase().includes("score") || header?.toLowerCase().includes("rate")) {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const color =
        num >= 90
          ? "text-emerald-400"
          : num >= 75
          ? "text-yellow-400"
          : "text-red-400";
      return <span className={color}>{val}</span>;
    }
  }
  return String(val);
}

function getDemoData(filename) {
  return {
    headers: ["Name", "Department", "Score", "KPI Attainment", "Goal %", "Status", "Review Date"],
    rows: [
      ["Sarah Chen", "Engineering", "98", "122%", "100%", "Exceeds", "2024-09-30"],
      ["Marcus Rodriguez", "Sales", "94", "118%", "100%", "Exceeds", "2024-09-30"],
      ["Priya Kapoor", "Marketing", "89", "111%", "95%", "Meets", "2024-09-30"],
      ["James Wilson", "Engineering", "85", "106%", "90%", "Meets", "2024-09-30"],
      ["Lin Wei", "Support", "77", "96%", "82%", "Meets", "2024-09-30"],
      ["Aisha Johnson", "Sales", "82", "102%", "88%", "Meets", "2024-09-30"],
      ["Tom Barker", "Operations", "64", "79%", "68%", "Below", "2024-09-30"],
      ["Dana Lee", "Operations", "61", "74%", "65%", "Below", "2024-09-30"],
      ["Chris Morgan", "Support", "58", "71%", "60%", "Below", "2024-09-30"],
      ["Sophie Nguyen", "Marketing", "91", "114%", "97%", "Exceeds", "2024-09-30"],
    ],
  };
}