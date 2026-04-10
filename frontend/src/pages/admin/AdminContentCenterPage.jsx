import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { Loader2, Plus, RefreshCw, Archive, Eye, Edit3, Megaphone, Users, ShoppingCart, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import StandardDrawerShell from "@/components/ui/StandardDrawerShell";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

const ROLE_BADGE = {
  sales: "bg-blue-100 text-blue-700",
  affiliate: "bg-purple-100 text-purple-700",
  admin: "bg-slate-100 text-slate-700",
};

const STATUS_BADGE = {
  active: "bg-green-100 text-green-700",
  archived: "bg-slate-100 text-slate-500",
  draft: "bg-yellow-100 text-yellow-700",
};

export default function AdminContentCenterPage() {
  const [items, setItems] = useState([]);
  const [kpis, setKpis] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => { loadContent(); }, [filterRole, filterStatus]);

  const loadContent = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole) params.set("role", filterRole);
      if (filterStatus) params.set("status", filterStatus);
      const res = await api.get(`/api/admin/content-center?${params.toString()}`);
      setItems(res.data.items || []);
      setKpis(res.data.kpis || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGenerate = async (role) => {
    setGenerating(true);
    try {
      const res = await api.post("/api/content-engine/generate-bulk", { role });
      toast.success(`Generated ${res.data.count} ${role} content items`);
      loadContent();
    } catch (err) {
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.post(`/api/admin/content-center/${id}/archive`);
      toast.success("Content archived");
      loadContent();
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      toast.error("Archive failed");
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await api.put(`/api/admin/content-center/${selected.id}`, editData);
      toast.success("Content updated");
      setEditMode(false);
      loadContent();
      setSelected(null);
    } catch (err) {
      toast.error("Update failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-content-center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Content Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate and manage promotional content for sales and affiliates</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleBulkGenerate("sales")}
            disabled={generating}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            data-testid="generate-sales-btn"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Sales Content
          </button>
          <button
            onClick={() => handleBulkGenerate("affiliate")}
            disabled={generating}
            className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50"
            data-testid="generate-affiliate-btn"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Affiliate Content
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="content-kpi-row">
        <KpiCard icon={<Megaphone className="w-5 h-5" />} label="Active Campaigns" value={kpis.active_campaigns || 0} accent="text-orange-600" />
        <KpiCard icon={<ShoppingCart className="w-5 h-5" />} label="Total Content" value={kpis.total_content || 0} accent="text-blue-600" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Sales Content" value={kpis.sales_content || 0} accent="text-emerald-600" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Affiliate Content" value={kpis.affiliate_content || 0} accent="text-purple-600" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white border rounded-xl p-3" data-testid="content-filters">
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-white">
          <option value="">All Roles</option>
          <option value="sales">Sales</option>
          <option value="affiliate">Affiliate</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-white">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={loadContent} className="p-2 hover:bg-slate-100 rounded-lg transition" data-testid="refresh-content-btn">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
        <span className="text-xs text-slate-400 ml-auto">{items.length} items</span>
      </div>

      {/* Content Table */}
      <div className="bg-white border rounded-xl overflow-hidden" data-testid="content-table-section">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Megaphone className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">No content yet</p>
            <p className="text-xs mt-1">Click "Sales Content" or "Affiliate Content" to generate</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="p-3 text-xs font-semibold text-slate-600 uppercase">Title</th>
                  <th className="p-3 text-xs font-semibold text-slate-600 uppercase">Role</th>
                  <th className="p-3 text-xs font-semibold text-slate-600 uppercase text-right">Price</th>
                  <th className="p-3 text-xs font-semibold text-slate-600 uppercase text-right">Discount</th>
                  <th className="p-3 text-xs font-semibold text-slate-600 uppercase text-right">Earning</th>
                  <th className="p-3 text-xs font-semibold text-slate-600 uppercase text-center">Promo</th>
                  <th className="p-3 text-xs font-semibold text-slate-600 uppercase text-center">Status</th>
                  <th className="p-3 text-xs font-semibold text-slate-600 uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition" data-testid={`content-row-${item.id}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate max-w-[200px]">{item.title}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{item.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[item.role] || ROLE_BADGE.admin}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">{money(item.final_price)}</td>
                    <td className="p-3 text-right text-slate-500">{item.discount_amount > 0 ? money(item.discount_amount) : "—"}</td>
                    <td className="p-3 text-right font-medium text-[#D4A843]">{item.earning_amount > 0 ? money(item.earning_amount) : "—"}</td>
                    <td className="p-3 text-center">
                      {item.has_promotion ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">PROMO</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[item.status] || STATUS_BADGE.active}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => { setSelected(item); setEditMode(false); }} className="p-1.5 hover:bg-blue-50 rounded transition" data-testid={`preview-${item.id}`}>
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button onClick={() => handleArchive(item.id)} className="p-1.5 hover:bg-red-50 rounded transition" data-testid={`archive-${item.id}`}>
                          <Archive className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview/Edit Drawer */}
      <ContentDrawer
        item={selected}
        editMode={editMode}
        editData={editData}
        onClose={() => { setSelected(null); setEditMode(false); }}
        onEdit={() => {
          setEditMode(true);
          setEditData({
            headline: selected.headline,
            captions: { ...selected.captions },
            cta: selected.cta,
          });
        }}
        onSave={handleSave}
        setEditData={setEditData}
      />
    </div>
  );
}

function ContentDrawer({ item, editMode, editData, onClose, onEdit, onSave, setEditData }) {
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const roleBadge = item ? (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[item.role] || ROLE_BADGE.admin}`}>
      {item.role}
    </span>
  ) : null;

  const footer = editMode ? (
    <div className="flex gap-2">
      <button onClick={onSave} className="flex-1 bg-[#0f172a] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1e293b] transition" data-testid="save-content-btn">Save Changes</button>
      <button onClick={() => { setEditData({}); }} className="px-4 py-2.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
    </div>
  ) : null;

  return (
    <StandardDrawerShell
      open={!!item}
      onClose={onClose}
      title={item?.title || "Content Preview"}
      subtitle="Content"
      badge={roleBadge}
      width="lg"
      testId="content-drawer"
      footer={footer}
    >
      {item && (
        <div className="space-y-5">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[item.status] || STATUS_BADGE.active}`}>
                {item.status}
              </span>
            </div>
            {!editMode && (
              <button onClick={onEdit} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <Edit3 className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>

          {/* Image */}
          {item.image_url && (
            <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover rounded-xl" />
          )}

          {/* Pricing */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Final Price</span>
              <span className="font-bold text-[#0f172a]">{money(item.final_price)}</span>
            </div>
            {item.discount_amount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Original Price</span>
                  <span className="text-slate-400 line-through">{money(item.original_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-emerald-600 font-medium">{money(item.discount_amount)} ({item.discount_pct}%)</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Earning</span>
              <span className="font-bold text-[#D4A843]">{money(item.earning_amount)}</span>
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase mb-1 block">Headline</label>
            {editMode ? (
              <input
                value={editData.headline || ""}
                onChange={e => setEditData(d => ({ ...d, headline: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#0f172a]">{item.headline}</p>
                <button onClick={() => copy(item.headline)} className="text-[10px] text-blue-500 hover:underline">Copy</button>
              </div>
            )}
          </div>

          {/* Captions */}
          {["short_social", "professional", "closing_script"].map(key => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-600 uppercase mb-1 block">
                {key.replace(/_/g, " ")}
              </label>
              {editMode ? (
                <textarea
                  value={(editData.captions || {})[key] || ""}
                  onChange={e => setEditData(d => ({ ...d, captions: { ...d.captions, [key]: e.target.value } }))}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-600">{(item.captions || {})[key] || "—"}</p>
                  <button onClick={() => copy((item.captions || {})[key] || "")} className="text-[10px] text-blue-500 hover:underline flex-shrink-0 mt-0.5">Copy</button>
                </div>
              )}
            </div>
          ))}

          {/* Share Data */}
          {(item.promo_code || item.short_link) && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              {item.promo_code && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Promo Code</span>
                  <button onClick={() => copy(item.promo_code)} className="font-mono text-sm font-bold text-[#0f172a] hover:text-blue-600">{item.promo_code}</button>
                </div>
              )}
              {item.short_link && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Short Link</span>
                  <button onClick={() => copy(item.short_link)} className="text-sm text-blue-600 hover:underline">{item.short_link}</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </StandardDrawerShell>
  );
}

function KpiCard({ icon, label, value, accent }) {
  return (
    <div className="bg-white border rounded-xl p-4" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={accent || "text-slate-400"}>{icon}</div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xl font-bold text-[#0f172a]">{value}</div>
    </div>
  );
}
