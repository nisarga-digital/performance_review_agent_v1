import axios from "axios";

const BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300000, // 5 minutes
  headers: { "Content-Type": "application/json" },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      "An unknown error occurred";
    return Promise.reject(new Error(message));
  }
);

export const healthCheck = async () => {
  const res = await api.get("/api/health");
  return res.data;
};

export const getDataSources = async () => {
  const res = await api.get("/api/data-sources");
  const sources = (res.data.data_sources || []).map(s => ({
    name: s.name,
    size: s.size_kb ? s.size_kb * 1024 : undefined,
    type: s.type
  }));
  return { sources };
};

export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/upload-data", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return res.data;
};

export const analyzeQuery = async (
  query,
  conversationHistory = [],
  sessionId = null
) => {
  const res = await api.post("/api/analyze", {
    query,
    history: conversationHistory,
    sessionId,
  });
  return res.data; // expected: { answer: string, sources: [] }
};

export const getCSVPreview = async (filename) => {
  const res = await api.get(`/api/preview/${encodeURIComponent(filename)}`);
  return res.data; // expected: { headers: [], rows: [[]] }
};

export const getLogs = async () => {
  const res = await api.get("/api/query-log");
  const logs = (res.data.entries || []).map(e => ({
    ...e,
    query: e.question,
    response: e.answer
  }));
  return { logs };
};

export const getStats = async () => {
  const res = await api.get("/api/stats");
  return res.data;
};

export const deleteDataSource = async (filename) => {
  const res = await api.delete(`/api/data-sources/${encodeURIComponent(filename)}`);
  return res.data;
};

export default api;
