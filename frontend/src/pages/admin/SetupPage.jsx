import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function SetupPage() {
  const [industries, setIndustries] = useState([]);
  const [sources, setSources] = useState([]);
  const [industryName, setIndustryName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [industriesRes, sourcesRes] = await Promise.all([
        api.get("/api/admin/setup/industries"),
        api.get("/api/admin/setup/sources"),
      ]);
      setIndustries(industriesRes.data || []);
      setSources(sourcesRes.data || []);
    } catch (error) {
      console.error("Failed to load setup data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addIndustry = async (e) => {
    e.preventDefault();
    if (!industryName.trim()) return;
    try {
      await api.post("/api/admin/setup/industries", { name: industryName });
      setIndustryName("");
      load();
    } catch (error) {
      console.error("Failed to add industry:", error);
    }
  };

  const addSource = async (e) => {
    e.preventDefault();
    if (!sourceName.trim()) return;
    try {
      await api.post("/api/admin/setup/sources", { name: sourceName });
      setSourceName("");
      load();
    } catch (error) {
      console.error("Failed to add source:", error);
    }
  };

  const deleteIndustry = async (id) => {
    try {
      await api.delete(`/api/admin/setup/industries/${id}`);
      load();
    } catch (error) {
      console.error("Failed to delete industry:", error);
    }
  };

  const deleteSource = async (id) => {
    try {
      await api.delete(`/api/admin/setup/sources/${id}`);
      load();
    } catch (error) {
      console.error("Failed to delete source:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto grid xl:grid-cols-2 gap-8">
        <div className="rounded-3xl border bg-white p-6" data-testid="industries-section">
          <h1 className="text-2xl font-bold">Industries</h1>
          <form onSubmit={addIndustry} className="flex gap-3 mt-5">
            <input
              className="flex-1 border rounded-xl px-4 py-3"
              placeholder="Add industry"
              value={industryName}
              onChange={(e) => setIndustryName(e.target.value)}
              data-testid="industry-input"
            />
            <button 
              className="rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-medium"
              data-testid="add-industry-btn"
            >
              Add
            </button>
          </form>

          <div className="space-y-3 mt-5">
            {industries.map((item) => (
              <div key={item.id} className="rounded-2xl border p-4 flex items-center justify-between" data-testid={`industry-${item.id}`}>
                <span>{item.name}</span>
                <button 
                  onClick={() => deleteIndustry(item.id)}
                  className="text-red-500 text-sm hover:underline"
                  data-testid={`delete-industry-${item.id}`}
                >
                  Delete
                </button>
              </div>
            ))}
            {!industries.length && (
              <div className="text-sm text-slate-500">No industries configured yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6" data-testid="sources-section">
          <h1 className="text-2xl font-bold">Lead Sources</h1>
          <form onSubmit={addSource} className="flex gap-3 mt-5">
            <input
              className="flex-1 border rounded-xl px-4 py-3"
              placeholder="Add source"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              data-testid="source-input"
            />
            <button 
              className="rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-medium"
              data-testid="add-source-btn"
            >
              Add
            </button>
          </form>

          <div className="space-y-3 mt-5">
            {sources.map((item) => (
              <div key={item.id} className="rounded-2xl border p-4 flex items-center justify-between" data-testid={`source-${item.id}`}>
                <span>{item.name}</span>
                <button 
                  onClick={() => deleteSource(item.id)}
                  className="text-red-500 text-sm hover:underline"
                  data-testid={`delete-source-${item.id}`}
                >
                  Delete
                </button>
              </div>
            ))}
            {!sources.length && (
              <div className="text-sm text-slate-500">No sources configured yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
