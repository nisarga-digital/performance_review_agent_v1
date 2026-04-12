import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
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
  return res.data; // expected: { sources: [{name, size, type, uploadedAt}] }
};

export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return res.data;
};

export const analyzeQuery = async (query, conversationHistory = []) => {
  const res = await api.post("/api/analyze", {
    query,
    history: conversationHistory,
  });
  return res.data; // expected: { answer: string, sources: [] }
};

export const getCSVPreview = async (filename) => {
  const res = await api.get(`/api/preview/${encodeURIComponent(filename)}`);
  return res.data; // expected: { headers: [], rows: [[]] }
};

export const getLogs = async () => {
  const res = await api.get("/api/logs");
  return res.data; // expected: { logs: [{query, response, timestamp}] }
};

export default api;