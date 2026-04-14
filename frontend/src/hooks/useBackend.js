import { useState, useEffect, useCallback, useRef } from "react";
import { healthCheck, getDataSources, getLogs, getStats } from "../api";

const POLL_INTERVAL = 5000; // 5 seconds

export function useBackend() {
  const [isOnline, setIsOnline] = useState(false);
  const [dataSources, setDataSources] = useState([]);
  const [logs, setLogs] = useState([]);
  const [queriesRun, setQueriesRun] = useState(0);
  const [memoryTurns, setMemoryTurns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ employees: 0, self_reviews: 0, manager_reviews: 0, complete: 0 });

  const isMounted = useRef(true);
  const pollRef = useRef(null);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await healthCheck();
      if (!isMounted.current) return;
      setIsOnline(data?.status === "ok" || data?.online === true);
      if (data?.queries_run !== undefined) setQueriesRun(data.queries_run);
      if (data?.memory_turns !== undefined) setMemoryTurns(data.memory_turns);
    } catch {
      if (isMounted.current) setIsOnline(false);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const data = await getDataSources();
      if (!isMounted.current) return;
      setDataSources(data?.sources || []);
    } catch {
      // Keep stale data on error
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getLogs();
      if (!isMounted.current) return;
      setLogs(data?.logs || []);
    } catch {
      // Keep stale data on error
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      if (!isMounted.current) return;
      setStats(data || { employees: 0, self_reviews: 0, manager_reviews: 0, complete: 0 });
    } catch {
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.allSettled([fetchHealth(), fetchSources(), fetchLogs(), fetchStats()]);
    if (isMounted.current) setLoading(false);
  }, [fetchHealth, fetchSources, fetchLogs, fetchStats]);

  // Increment queries/turns locally (optimistic update while offline)
  const incrementQuery = useCallback(() => {
    setQueriesRun((q) => q + 1);
    setMemoryTurns((t) => t + 2); // user + assistant turn
  }, []);

  useEffect(() => {
    isMounted.current = true;
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      isMounted.current = false;
      clearInterval(pollRef.current);
    };
  }, [refresh]);

  return {
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
    stats,
    fetchStats,
  };
}