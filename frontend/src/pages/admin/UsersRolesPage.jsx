import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import StatusBadge from "../../components/admin/shared/StatusBadge";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { Users, Shield, ToggleLeft, ToggleRight } from "lucide-react";

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : "-"; }

const ROLES = ["admin", "sales", "finance", "marketing", "production", "customer", "user"];

export default function UsersRolesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getUsersList({ search: search || undefined, role: roleFilter || undefined })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true);
    try {
      await adminApi.assignUserRole(userId, { role: newRole });
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  const handleToggleStatus = async (userId) => {
    setActionLoading(true);
    try {
      await adminApi.toggleUserStatus(userId);
      setSelected(null);
      load();
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || err.message)); }
    setActionLoading(false);
  };

  return (
    <div data-testid="users-roles-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Users & Roles</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage user accounts, assign roles, and control access.</p>
      </div>

      <FilterBar search={search} onSearchChange={setSearch}
        filters={[{
          key: "role", value: roleFilter, onChange: setRoleFilter,
          options: [{ value: "", label: "All Roles" }, ...ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))],
        }]}
      />

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="users-table">
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} onClick={() => setSelected(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`user-row-${row.id || idx}`}>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{row.full_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.email || "-"}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-100 text-indigo-700 capitalize">{row.role || "-"}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={row.status || "active"} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{fmtDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Users} title="No users found" description="User accounts will appear here." />
      )}

      <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title="User Detail" subtitle={selected?.full_name}>
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-semibold text-[#20364D] mt-1">{selected.full_name || "-"}</p>
                <p className="text-xs text-slate-500 mt-1">{selected.email}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Role</p>
                <p className="font-semibold text-[#20364D] mt-1 capitalize">{selected.role || "-"}</p>
                <StatusBadge status={selected.status || "active"} />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Assign Role</p>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.filter(r => !["customer","user"].includes(r)).map(r => (
                  <button key={r} onClick={() => handleRoleChange(selected.id, r)} disabled={actionLoading || selected.role === r}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold capitalize text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    data-testid={`role-btn-${r}`}>{r}</button>
                ))}
              </div>
            </div>
            <button onClick={() => handleToggleStatus(selected.id)} disabled={actionLoading} data-testid="toggle-user-status-btn"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold text-[#20364D] hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2">
              {(selected.status || "active") === "active" ? <><ToggleLeft size={16} /> Deactivate User</> : <><ToggleRight size={16} /> Activate User</>}
            </button>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
