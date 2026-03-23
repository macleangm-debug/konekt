import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

/**
 * Hook for fetching dashboard metrics from the backend
 * @param {string} scope - The dashboard type: "customer", "sales", "admin", "affiliate", "partner"
 * @param {object} params - Optional query parameters like user_id, partner_id, etc.
 * @returns {{ data: object|null, loading: boolean, error: string|null, reload: function }}
 */
export default function useDashboardMetrics(scope, params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const search = new URLSearchParams(params).toString();
      const url = `${API_URL}/api/dashboard-metrics/${scope}${search ? `?${search}` : ""}`;
      
      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setData(res.data || null);
    } catch (err) {
      console.error(`Failed to load ${scope} dashboard metrics:`, err);
      setError(err.response?.data?.detail || err.message || "Failed to load metrics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scope, JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
