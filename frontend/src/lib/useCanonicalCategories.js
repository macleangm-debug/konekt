import { useState, useEffect } from "react";
import api from "./api";

/**
 * Hook to fetch canonical categories from /api/categories.
 * Returns { categories, subcategoriesFor, loading }
 */
export function useCanonicalCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/categories").then((res) => {
      if (!cancelled) {
        setCategories(res.data?.categories || []);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const subcategoriesFor = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId || c.name === categoryId);
    return cat?.subcategories || [];
  };

  return { categories, subcategoriesFor, loading };
}
