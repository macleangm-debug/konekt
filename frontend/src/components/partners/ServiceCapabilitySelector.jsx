import React, { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";

export default function ServiceCapabilitySelector({ value = [], onChange }) {
  const [tree, setTree] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [serviceId, setServiceId] = useState("");

  useEffect(() => {
    api.get("/api/service-catalog/tree").then((res) => setTree(res.data || []));
  }, []);

  const selectedGroup = useMemo(() => tree.find((g) => g.id === groupId), [tree, groupId]);
  const selectedService = useMemo(() => (selectedGroup?.children || []).find((s) => s.id === serviceId), [selectedGroup, serviceId]);

  const addSelection = (item) => {
    if (!item?.id) return;
    if ((value || []).some((x) => x.id === item.id)) return;
    onChange([...(value || []), item]);
  };

  const removeSelection = (id) => onChange((value || []).filter((x) => x.id !== id));

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">Service Capabilities</div>

      <div className="grid md:grid-cols-3 gap-4">
        <select className="w-full border rounded-xl px-4 py-3" value={groupId} onChange={(e) => { setGroupId(e.target.value); setServiceId(""); }}>
          <option value="">Select Service Group</option>
          {tree.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>

        <select className="w-full border rounded-xl px-4 py-3" value={serviceId} onChange={(e) => setServiceId(e.target.value)} disabled={!groupId}>
          <option value="">Select Service</option>
          {(selectedGroup?.children || []).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
        </select>

        <button type="button" onClick={() => addSelection({ id: selectedService?.id, name: selectedService?.name, type: "service" })} className="rounded-xl bg-[#20364D] text-white px-4 py-3 font-semibold" disabled={!selectedService}>
          Add Service
        </button>
      </div>

      {selectedService?.children?.length ? (
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Sub-services</div>
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedService.children.map((sub) => (
              <button key={sub.id} type="button" onClick={() => addSelection({ id: sub.id, name: sub.name, parent_service_id: selectedService.id, type: "subservice" })} className="rounded-full border px-3 py-2 text-sm font-medium text-[#20364D] bg-white">
                + {sub.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm text-slate-500">Selected capabilities</div>
        <div className="flex flex-wrap gap-2 mt-3">
          {(value || []).map((item) => (
            <button key={item.id} type="button" onClick={() => removeSelection(item.id)} className="rounded-full bg-[#F4E7BF] text-[#8B6A10] px-3 py-2 text-sm font-semibold">
              {item.name} ×
            </button>
          ))}
          {!value?.length ? <div className="text-sm text-slate-500">No service capability selected yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
