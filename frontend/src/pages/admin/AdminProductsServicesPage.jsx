import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Package, Layers, Tag, FolderTree, Clock, CheckCircle2, XCircle, Plus, Eye, Search, ChevronRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function authHeaders() {
  const token = localStorage.getItem("konekt_token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

const reviewStatusColors = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  changes_requested: "bg-purple-100 text-purple-700",
};

export default function AdminProductsServicesPage() {
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState(null);

  // Taxonomy state
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [subsFilter, setSubsFilter] = useState("");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);
  const [drawerType, setDrawerType] = useState(""); // "submission" | "group" | "category"
  const [marginPercent, setMarginPercent] = useState(20);
  const [rejectNotes, setRejectNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Forms
  const [newGroupName, setNewGroupName] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatGroupId, setNewCatGroupId] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCatId, setNewSubCatId] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/catalog/summary", { headers: authHeaders() });
      setSummary(res.data);
    } catch {}
  }, []);

  const loadTaxonomy = useCallback(async () => {
    try {
      const [gRes, cRes, sRes] = await Promise.all([
        api.get("/api/admin/catalog/groups", { headers: authHeaders() }),
        api.get("/api/admin/catalog/categories", { headers: authHeaders() }),
        api.get("/api/admin/catalog/subcategories", { headers: authHeaders() }),
      ]);
      setGroups(gRes.data || []);
      setCategories(cRes.data || []);
      setSubcategories(sRes.data || []);
    } catch {}
  }, []);

  const loadSubmissions = useCallback(async () => {
    try {
      const params = subsFilter ? `?status=${subsFilter}` : "";
      const res = await api.get(`/api/admin/catalog/submissions${params}`, { headers: authHeaders() });
      setSubmissions(res.data || []);
    } catch {}
  }, [subsFilter]);

  useEffect(() => {
    loadSummary();
    loadTaxonomy();
  }, [loadSummary, loadTaxonomy]);

  useEffect(() => {
    if (tab === "submissions") loadSubmissions();
  }, [tab, loadSubmissions]);

  const openSubmissionDrawer = (sub) => {
    setDrawerItem(sub);
    setDrawerType("submission");
    setDrawerOpen(true);
    setMarginPercent(20);
    setRejectNotes("");
  };

  const approveSubmission = async () => {
    if (!drawerItem) return;
    setSaving(true);
    try {
      await api.post(`/api/admin/catalog/submissions/${drawerItem.id}/approve`, { margin_percent: marginPercent }, { headers: authHeaders() });
      setDrawerOpen(false);
      loadSubmissions();
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to approve");
    } finally {
      setSaving(false);
    }
  };

  const rejectSubmission = async () => {
    if (!drawerItem) return;
    setSaving(true);
    try {
      await api.post(`/api/admin/catalog/submissions/${drawerItem.id}/reject`, { notes: rejectNotes }, { headers: authHeaders() });
      setDrawerOpen(false);
      loadSubmissions();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reject");
    } finally {
      setSaving(false);
    }
  };

  const requestChanges = async () => {
    if (!drawerItem) return;
    setSaving(true);
    try {
      await api.post(`/api/admin/catalog/submissions/${drawerItem.id}/request-changes`, { notes: rejectNotes }, { headers: authHeaders() });
      setDrawerOpen(false);
      loadSubmissions();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.post("/api/admin/catalog/groups", { name: newGroupName }, { headers: authHeaders() });
      setNewGroupName("");
      loadTaxonomy();
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create group");
    }
  };

  const addCategory = async () => {
    if (!newCatName.trim() || !newCatGroupId) return;
    try {
      await api.post("/api/admin/catalog/categories", { name: newCatName, group_id: newCatGroupId }, { headers: authHeaders() });
      setNewCatName("");
      loadTaxonomy();
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create category");
    }
  };

  const addSubcategory = async () => {
    if (!newSubName.trim() || !newSubCatId) return;
    const cat = categories.find((c) => c.id === newSubCatId);
    try {
      await api.post("/api/admin/catalog/subcategories", {
        name: newSubName,
        category_id: newSubCatId,
        group_id: cat?.group_id || "",
      }, { headers: authHeaders() });
      setNewSubName("");
      loadTaxonomy();
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create subcategory");
    }
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: Layers },
    { key: "taxonomy", label: "Taxonomy", icon: FolderTree },
    { key: "submissions", label: "Vendor Submissions", icon: Clock },
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="admin-products-services">
      <div className="max-w-none w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8 text-[#D4A843]" />
            Products & Services
          </h1>
          <p className="text-slate-600 mt-1">Manage catalog, taxonomy, and vendor submissions.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition ${
                tab === t.key ? "bg-white border-b-2 border-[#D4A843] text-[#20364D]" : "text-slate-500 hover:text-[#20364D]"
              }`}
              data-testid={`tab-${t.key}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: "Groups", value: summary.groups, icon: Layers },
              { label: "Categories", value: summary.categories, icon: FolderTree },
              { label: "Subcategories", value: summary.subcategories, icon: Tag },
              { label: "Products", value: summary.products, icon: Package },
              { label: "Submissions", value: summary.vendor_submissions, icon: Clock },
              { label: "Pending Review", value: summary.pending_submissions, icon: Eye, highlight: true },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl border p-5 ${stat.highlight && stat.value > 0 ? "bg-amber-50 border-amber-200" : "bg-white"}`}
              >
                <stat.icon className={`w-5 h-5 mb-2 ${stat.highlight && stat.value > 0 ? "text-amber-600" : "text-slate-400"}`} />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Taxonomy Tab */}
        {tab === "taxonomy" && (
          <div className="space-y-6">
            {/* Add Group */}
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Groups</h2>
              <div className="flex gap-3 mb-4">
                <input className="flex-1 border rounded-xl px-4 py-2.5 text-sm" placeholder="New group name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} data-testid="new-group-input" />
                <button onClick={addGroup} className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 text-sm font-semibold" data-testid="add-group-btn">
                  <Plus className="w-4 h-4 inline mr-1" /> Add
                </button>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                {groups.filter((g) => g.is_active !== false).map((g) => (
                  <div key={g.id} className="rounded-xl border bg-slate-50 p-3">
                    <div className="font-medium text-sm">{g.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{categories.filter((c) => c.group_id === g.id).length} categories</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Category */}
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Categories</h2>
              <div className="flex gap-3 mb-4">
                <select className="border rounded-xl px-3 py-2.5 text-sm bg-white" value={newCatGroupId} onChange={(e) => setNewCatGroupId(e.target.value)} data-testid="cat-group-select">
                  <option value="">Select group</option>
                  {groups.filter((g) => g.is_active !== false).map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                </select>
                <input className="flex-1 border rounded-xl px-4 py-2.5 text-sm" placeholder="New category name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} data-testid="new-cat-input" />
                <button onClick={addCategory} className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 text-sm font-semibold" data-testid="add-cat-btn">
                  <Plus className="w-4 h-4 inline mr-1" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {groups.filter((g) => g.is_active !== false).map((g) => {
                  const gCats = categories.filter((c) => c.group_id === g.id && c.is_active !== false);
                  if (!gCats.length) return null;
                  return (
                    <div key={g.id}>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{g.name}</div>
                      <div className="flex flex-wrap gap-2">
                        {gCats.map((c) => (
                          <span key={c.id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium">{c.name}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Subcategory */}
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-bold text-[#20364D] mb-4">Subcategories</h2>
              <div className="flex gap-3 mb-4">
                <select className="border rounded-xl px-3 py-2.5 text-sm bg-white" value={newSubCatId} onChange={(e) => setNewSubCatId(e.target.value)} data-testid="sub-cat-select">
                  <option value="">Select category</option>
                  {categories.filter((c) => c.is_active !== false).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <input className="flex-1 border rounded-xl px-4 py-2.5 text-sm" placeholder="New subcategory name" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} data-testid="new-sub-input" />
                <button onClick={addSubcategory} className="rounded-xl bg-[#20364D] text-white px-5 py-2.5 text-sm font-semibold" data-testid="add-sub-btn">
                  <Plus className="w-4 h-4 inline mr-1" /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {tab === "submissions" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <select className="rounded-xl border px-4 py-2.5 text-sm bg-white" value={subsFilter} onChange={(e) => setSubsFilter(e.target.value)} data-testid="submission-filter">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="changes_requested">Changes Requested</option>
              </select>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden">
              <table className="min-w-full text-left" data-testid="submissions-table">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Product Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Base Cost</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Visibility</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No submissions found</td></tr>
                  ) : submissions.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => openSubmissionDrawer(sub)}>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(sub.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-4 py-3 text-sm font-medium">{sub.product_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{sub.vendor_id?.substring(0, 8) || "—"}</td>
                      <td className="px-4 py-3 text-sm">{sub.currency_code} {Number(sub.base_cost).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{sub.visibility_mode}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${reviewStatusColors[sub.review_status] || "bg-slate-100"}`}>
                          {sub.review_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); openSubmissionDrawer(sub); }}
                          className="text-sm text-slate-600 font-medium hover:text-[#20364D] flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Submission Review Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) setDrawerOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0" data-testid="submission-review-drawer">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-lg font-bold">
              {drawerType === "submission" ? "Review Submission" : "Details"}
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-500">
              {drawerItem?.product_name || ""}
            </SheetDescription>
          </SheetHeader>

          {drawerItem && drawerType === "submission" && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Product Name" value={drawerItem.product_name} />
                <InfoCard label="Base Cost" value={`${drawerItem.currency_code} ${Number(drawerItem.base_cost).toLocaleString()}`} />
                <InfoCard label="Visibility" value={drawerItem.visibility_mode} />
                <InfoCard label="Min Quantity" value={drawerItem.min_quantity} />
                <InfoCard label="Status" value={drawerItem.review_status} />
                <InfoCard label="Vendor" value={drawerItem.vendor_id?.substring(0, 12) || "—"} />
              </div>

              {drawerItem.description && (
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500 mb-1 uppercase">Description</div>
                  <div className="text-sm text-slate-700">{drawerItem.description}</div>
                </div>
              )}

              {drawerItem.review_status === "pending" && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm text-[#20364D]">Approve & Publish</h3>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Margin %</label>
                    <input
                      type="number"
                      className="border rounded-xl px-3 py-2.5 text-sm w-32"
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(Number(e.target.value))}
                      min={0}
                      max={100}
                      data-testid="margin-input"
                    />
                    <span className="text-xs text-slate-400 ml-2">
                      Sell price: {drawerItem.currency_code} {Math.round(drawerItem.base_cost * (1 + marginPercent / 100)).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={approveSubmission}
                    disabled={saving}
                    className="w-full rounded-xl bg-green-600 text-white py-3 font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="approve-btn"
                  >
                    <CheckCircle2 className="w-5 h-5" /> {saving ? "Publishing..." : "Approve & Publish"}
                  </button>

                  <div className="border-t pt-4 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase block">Notes for vendor</label>
                    <textarea
                      className="w-full border rounded-xl px-3 py-2 text-sm min-h-[60px]"
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Optional notes for rejection or change request"
                      data-testid="review-notes-input"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={requestChanges}
                        disabled={saving}
                        className="flex-1 rounded-xl border border-purple-300 text-purple-700 py-2.5 text-sm font-semibold hover:bg-purple-50 disabled:opacity-50"
                        data-testid="request-changes-btn"
                      >
                        Request Changes
                      </button>
                      <button
                        onClick={rejectSubmission}
                        disabled={saving}
                        className="flex-1 rounded-xl border border-red-300 text-red-700 py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                        data-testid="reject-btn"
                      >
                        <XCircle className="w-4 h-4 inline mr-1" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {drawerItem.review_status !== "pending" && drawerItem.review_notes && (
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500 mb-1 uppercase">Review Notes</div>
                  <div className="text-sm text-slate-700">{drawerItem.review_notes}</div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-sm mt-1">{String(value || "—")}</div>
    </div>
  );
}
