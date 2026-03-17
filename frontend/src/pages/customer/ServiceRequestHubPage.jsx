import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function ServiceRequestHubPage() {
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [activeGroup, setActiveGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [groupsRes, typesRes] = await Promise.all([
          fetch(`${API}/api/public-services/groups`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }),
          fetch(`${API}/api/public-services/types`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }),
        ]);
        const loadedGroups = groupsRes.ok ? await groupsRes.json() : [];
        setGroups(loadedGroups);
        setTypes(typesRes.ok ? await typesRes.json() : []);
        if (loadedGroups[0]?.key) setActiveGroup(loadedGroups[0].key);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load services");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = activeGroup
    ? types.filter((x) => x.group_key === activeGroup)
    : types;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="service-request-hub-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Start a Service Request</h1>
        <p className="text-slate-500 mt-1">Choose the service you want, then continue with the form.</p>
      </div>

      {/* Group Filters */}
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveGroup(group.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeGroup === group.key
                ? "bg-[#20364D] text-white"
                : "bg-white border text-slate-700 hover:bg-slate-50"
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* Service Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((item) => (
          <div key={item.id} className="rounded-xl border bg-white p-5 hover:shadow-sm transition">
            <div className="text-lg font-semibold text-[#20364D]">{item.name}</div>
            <p className="text-slate-500 text-sm mt-2 line-clamp-2">{item.short_description}</p>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/service-requests/new?service=${item.key}`)}
                className="flex-1 rounded-lg bg-[#20364D] text-white px-3 py-2 text-sm font-medium hover:bg-[#17283C] transition"
              >
                Start Request
              </button>
              <button
                type="button"
                onClick={() => window.open(`/services/${item.slug}`, "_blank")}
                className="rounded-lg border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-10 text-slate-500">
          No services found in this category.
        </div>
      )}
    </div>
  );
}
