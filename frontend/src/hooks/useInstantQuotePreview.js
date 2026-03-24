import { useState } from "react";
import api from "../lib/api";

export default function useInstantQuotePreview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const preview = async (payload) => {
    setLoading(true);
    const res = await api.post("/api/instant-quote/preview", payload);
    setData(res.data || null);
    setLoading(false);
    return res.data;
  };

  return { data, loading, preview };
}
