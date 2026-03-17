import React, { useEffect, useState } from "react";
import {
  Banknote, Users, Check, Clock, AlertTriangle, Loader2, Search,
  Download, Eye, CheckCircle2, XCircle, PauseCircle, DollarSign
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function PartnerSettlementsAdminPage() {
  const [settlements, setSettlements] = useState([]);
  const [payoutProfiles, setPayoutProfiles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("settlements");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const token = localStorage.getItem("admin_token");

  const loadData = async () => {
    try {
      const [settlementsRes, profilesRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/admin/partner-settlements/settlements`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/partner-settlements/payout-profiles`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/admin/partner-settlements/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (settlementsRes.ok) setSettlements(await settlementsRes.json());
      if (profilesRes.ok) setPayoutProfiles(await profilesRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error(error);
      toast.error("Failed to load settlement data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateSettlementStatus = async (settlementId, action) => {
    try {
      const res = await fetch(`${API}/api/admin/partner-settlements/settlements/${settlementId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast.success(`Settlement ${action.replace("-", " ")}`);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to update settlement");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      eligible: "bg-blue-100 text-blue-700",
      approved: "bg-green-100 text-green-700",
      paid: "bg-emerald-100 text-emerald-700",
      held: "bg-red-100 text-red-700",
      disputed: "bg-orange-100 text-orange-700",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-600"}`}>
        {status}
      </span>
    );
  };

  const filteredSettlements = settlements.filter((s) => {
    const matchesFilter = !filter || 
      s.partner_name?.toLowerCase().includes(filter.toLowerCase()) ||
      s.partner_id?.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesFilter && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="partner-settlements-admin-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Partner Settlements</h1>
        <p className="text-slate-500">Manage partner payouts, profiles, and settlement workflows.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        <SummaryCard
          icon={<Clock className="w-5 h-5" />}
          label="Pending"
          value={summary?.pending_count || 0}
          color="amber"
        />
        <SummaryCard
          icon={<Check className="w-5 h-5" />}
          label="Eligible"
          value={summary?.eligible_count || 0}
          color="blue"
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Approved"
          value={summary?.approved_count || 0}
          color="green"
        />
        <SummaryCard
          icon={<Banknote className="w-5 h-5" />}
          label="Paid"
          value={summary?.paid_count || 0}
          color="emerald"
        />
        <SummaryCard
          icon={<PauseCircle className="w-5 h-5" />}
          label="Held"
          value={summary?.held_count || 0}
          color="red"
        />
      </div>

      {/* Totals */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-amber-600">Total Pending Payout</div>
              <div className="text-2xl font-bold text-amber-700">
                TZS {Number(summary?.total_pending_amount || 0).toLocaleString()}
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-amber-400" />
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-600">Total Paid Out</div>
              <div className="text-2xl font-bold text-green-700">
                TZS {Number(summary?.total_paid_amount || 0).toLocaleString()}
              </div>
            </div>
            <Banknote className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("settlements")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "settlements" ? "border-[#D4A843] text-[#D4A843]" : "border-transparent text-slate-500"
          }`}
          data-testid="tab-settlements"
        >
          Settlements ({settlements.length})
        </button>
        <button
          onClick={() => setActiveTab("profiles")}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === "profiles" ? "border-[#D4A843] text-[#D4A843]" : "border-transparent text-slate-500"
          }`}
          data-testid="tab-profiles"
        >
          Payout Profiles ({payoutProfiles.length})
        </button>
      </div>

      {activeTab === "settlements" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by partner..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                data-testid="search-settlements"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2"
              data-testid="filter-status"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="eligible">Eligible</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="held">Held</option>
            </select>
          </div>

          {/* Settlements Table */}
          {filteredSettlements.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <Banknote className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No settlements found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="settlements-table">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Partner</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Period</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Jobs</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Gross</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Net</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredSettlements.map((settlement) => (
                      <tr key={settlement.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <div className="font-medium">{settlement.partner_name}</div>
                          <div className="text-xs text-slate-500">{settlement.partner_id}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {settlement.period_start} - {settlement.period_end}
                        </td>
                        <td className="p-4 text-sm">{settlement.total_jobs}</td>
                        <td className="p-4 text-right text-sm">
                          TZS {Number(settlement.gross_amount || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-medium">
                          TZS {Number(settlement.net_amount || 0).toLocaleString()}
                        </td>
                        <td className="p-4">{getStatusBadge(settlement.status)}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {settlement.status === "pending" && (
                              <button
                                onClick={() => updateSettlementStatus(settlement.id, "mark-eligible")}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                data-testid={`eligible-${settlement.id}`}
                              >
                                Eligible
                              </button>
                            )}
                            {settlement.status === "eligible" && (
                              <button
                                onClick={() => updateSettlementStatus(settlement.id, "approve")}
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                data-testid={`approve-${settlement.id}`}
                              >
                                Approve
                              </button>
                            )}
                            {settlement.status === "approved" && (
                              <button
                                onClick={() => updateSettlementStatus(settlement.id, "mark-paid")}
                                className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                                data-testid={`paid-${settlement.id}`}
                              >
                                Mark Paid
                              </button>
                            )}
                            {["pending", "eligible"].includes(settlement.status) && (
                              <button
                                onClick={() => updateSettlementStatus(settlement.id, "hold")}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                data-testid={`hold-${settlement.id}`}
                              >
                                Hold
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "profiles" && (
        <>
          {payoutProfiles.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No payout profiles configured yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {payoutProfiles.map((profile) => (
                <div key={profile.id || profile.partner_id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold">{profile.account_name || "Unnamed"}</div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile.is_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {profile.is_verified ? "Verified" : "Unverified"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div>Method: <span className="font-medium">{profile.preferred_method}</span></div>
                    {profile.bank_name && <div>Bank: {profile.bank_name}</div>}
                    {profile.bank_account_number && <div>Account: ***{profile.bank_account_number.slice(-4)}</div>}
                    {profile.mobile_money_number && <div>Mobile: {profile.mobile_money_number}</div>}
                    <div>Country: {profile.country_code} · {profile.currency}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }) {
  const colors = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color] || "bg-slate-100 text-slate-600"}`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}
