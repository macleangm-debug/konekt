import { useEffect, useState } from "react";
import api from "../lib/api";

export default function useCustomerProfile(customerId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!customerId) return;
    setLoading(true);
    const res = await api.get(`/api/customer-account/profile?customer_id=${customerId}`);
    setData(res.data || null);
    setLoading(false);
  };

  const save = async (payload) => {
    const res = await api.put("/api/customer-account/profile", payload);
    setData(res.data?.value || payload);
    return res.data;
  };

  useEffect(() => { load(); }, [customerId]);

  return { data, loading, reload: load, save };
}
