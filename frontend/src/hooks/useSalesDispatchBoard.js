import { useEffect, useState } from "react";
import api from "../lib/api";

export default function useSalesDispatchBoard(salesOwnerId = "") {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const suffix = salesOwnerId ? `?sales_owner_id=${encodeURIComponent(salesOwnerId)}` : "";
    const res = await api.get(`/api/sales-command/dispatch-summary${suffix}`);
    setData(res.data || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [salesOwnerId]);

  return { data, loading, reload: load };
}
