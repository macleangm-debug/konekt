import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function SalesProviderFollowUpPanel({ opportunityId, serviceRequestId, providerId }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    const query = new URLSearchParams();
    if (opportunityId) query.set("opportunity_id", opportunityId);
    if (serviceRequestId) query.set("service_request_id", serviceRequestId);
    const res = await api.get(`/api/sales-provider-coordination/follow-ups?${query.toString()}`);
    setRows(res.data || []);
  };

  useEffect(() => { load(); }, [opportunityId, serviceRequestId]);

  const addFollowUp = async () => {
    await api.post("/api/sales-provider-coordination/follow-ups", {
      opportunity_id: opportunityId,
      service_request_id: serviceRequestId,
      provider_id: providerId,
      message,
    });
    setMessage("");
    await load();
  };

  const sendNudge = async () => {
    await api.post("/api/sales-provider-coordination/nudges", {
      provider_id: providerId,
      service_request_id: serviceRequestId,
      message: "Please update the progress for this request.",
    });
    alert("Nudge sent.");
  };

  return (
    <div className="rounded-[2rem] border bg-white p-8">
      <div className="text-2xl font-bold text-[#20364D]">Sales Follow-Up</div>
      <div className="mt-4 flex gap-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 border rounded-xl px-4 py-3"
          placeholder="Add an internal follow-up note..."
        />
        <button onClick={addFollowUp} className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold">Save</button>
        <button onClick={sendNudge} className="rounded-xl border px-4 py-3 font-semibold text-[#20364D]">Nudge Provider</button>
      </div>

      <div className="space-y-3 mt-6">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">{r.created_at}</div>
            <div className="text-slate-700 mt-1">{r.message}</div>
          </div>
        ))}
        {!rows.length ? <div className="text-slate-600">No follow-up notes yet.</div> : null}
      </div>
    </div>
  );
}
