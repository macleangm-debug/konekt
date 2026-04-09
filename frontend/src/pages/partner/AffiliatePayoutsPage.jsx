import React, { useEffect, useState, useCallback } from "react";
import partnerApi from "../../lib/partnerApi";
import KpiCard from "../../components/dashboard/KpiCard";
import SectionCard from "../../components/dashboard/SectionCard";
import CountryAwarePhoneField from "../../components/vendors/CountryAwarePhoneField";
import { Loader2, Plus, Trash2, Smartphone, Building2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-800",
  approved: "bg-blue-100 text-blue-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
};
const statusLabels = { paid: "Paid", approved: "Approved", pending: "Pending", rejected: "Rejected" };

export default function AffiliatePayoutsPage() {
  const [wallet, setWallet] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("mobile_money");
  const [withdrawAccountId, setWithdrawAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMethod, setAddMethod] = useState("mobile_money");
  const [addForm, setAddForm] = useState({});

  const loadAll = useCallback(async () => {
    try {
      const [walletRes, accountsRes, historyRes] = await Promise.all([
        partnerApi.get("/api/affiliate/wallet").catch(() => ({ data: {} })),
        partnerApi.get("/api/affiliate/payout-accounts").catch(() => ({ data: { accounts: [] } })),
        partnerApi.get("/api/affiliate/payout-history").catch(() => ({ data: { payouts: [] } })),
      ]);
      setWallet(walletRes.data);
      setAccounts(accountsRes.data?.accounts || []);
      setHistory(historyRes.data?.payouts || []);
    } catch (err) {
      console.error("Failed to load payout data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (wallet && amt < wallet.minimum_payout) { toast.error(`Minimum payout is ${money(wallet.minimum_payout)}`); return; }
    if (wallet && amt > wallet.available) { toast.error(`Amount exceeds available balance (${money(wallet.available)})`); return; }

    setSubmitting(true);
    try {
      await partnerApi.post("/api/affiliate/me/payout-request", {
        amount: amt,
        payout_method: withdrawMethod,
        payout_account_id: withdrawAccountId || null,
      });
      toast.success("Withdrawal request submitted!");
      setWithdrawAmount("");
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      await partnerApi.post("/api/affiliate/payout-accounts", {
        method: addMethod,
        is_default: accounts.length === 0,
        ...addForm,
      });
      toast.success("Payout account added!");
      setShowAddForm(false);
      setAddForm({});
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add account");
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm("Delete this payout account?")) return;
    try {
      await partnerApi.delete(`/api/affiliate/payout-accounts/${id}`);
      toast.success("Account removed");
      loadAll();
    } catch (err) {
      toast.error("Failed to delete account");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="payouts-loading">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const canWithdraw = wallet?.can_withdraw && parseFloat(withdrawAmount) >= (wallet?.minimum_payout || 50000);

  return (
    <div className="space-y-6" data-testid="affiliate-payouts-page">
      {/* Section 1: Wallet Summary */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending" value={money(wallet?.pending)} helper="Commissions not yet approved" accent="amber" />
        <KpiCard label="Available" value={money(wallet?.available)} helper="Ready for withdrawal" accent="emerald" />
        <KpiCard label="Pending Withdrawal" value={money(wallet?.pending_withdrawal)} helper="Requested, awaiting payout" accent="blue" />
        <KpiCard label="Paid Out" value={money(wallet?.paid_out)} helper="Already paid to you" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Section 2: Withdraw */}
        <SectionCard
          title="Request Withdrawal"
          subtitle={`Minimum payout: ${money(wallet?.minimum_payout)}. Payout cycle: ${wallet?.payout_cycle || "monthly"}.`}
        >
          <div className="space-y-4">
            {!wallet?.can_withdraw && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" data-testid="min-payout-warning">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <strong>Not enough available balance.</strong> You need at least {money(wallet?.minimum_payout)} available to withdraw. Current available: {money(wallet?.available)}.
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (TZS)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Min: ${Number(wallet?.minimum_payout || 50000).toLocaleString()}`}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                data-testid="withdraw-amount-input"
                disabled={!wallet?.can_withdraw}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payout Method</label>
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                data-testid="withdraw-method-select"
                disabled={!wallet?.can_withdraw}
              >
                {(wallet?.payout_methods || ["mobile_money", "bank_transfer"]).map((m) => (
                  <option key={m} value={m}>{m === "mobile_money" ? "Mobile Money" : "Bank Transfer"}</option>
                ))}
              </select>
            </div>

            {accounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payout Account</label>
                <select
                  value={withdrawAccountId}
                  onChange={(e) => setWithdrawAccountId(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-testid="withdraw-account-select"
                >
                  <option value="">Select account</option>
                  {accounts.filter(a => a.method === withdrawMethod).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.method === "mobile_money" ? `${a.provider} - ${a.phone_number}` : `${a.bank_name} - ${a.account_number}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={submitting || !canWithdraw}
              className="w-full rounded-xl bg-[#20364D] text-white px-5 py-3 text-sm font-semibold hover:bg-[#1a2d40] disabled:opacity-50 transition-colors"
              data-testid="withdraw-submit-btn"
            >
              {submitting ? "Submitting..." : "Request Withdrawal"}
            </button>
          </div>
        </SectionCard>

        {/* Section 3: Payout Accounts */}
        <SectionCard
          title="Payout Accounts"
          subtitle="Manage your payout methods."
          action={
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              data-testid="add-account-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          }
        >
          {showAddForm && (
            <div className="mb-4 space-y-3 rounded-xl border bg-slate-50 p-4" data-testid="add-account-form">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
                <select
                  value={addMethod}
                  onChange={(e) => { setAddMethod(e.target.value); setAddForm({}); }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {addMethod === "mobile_money" ? (
                <>
                  <input placeholder="Provider (e.g. M-Pesa, Tigo Pesa)" className="w-full rounded-lg border px-3 py-2 text-sm" value={addForm.provider || ""} onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })} data-testid="add-provider-input" />
                  <input placeholder="Account Name" className="w-full rounded-lg border px-3 py-2 text-sm" value={addForm.account_name || ""} onChange={(e) => setAddForm({ ...addForm, account_name: e.target.value })} data-testid="add-account-name-input" />
                  <CountryAwarePhoneField
                    prefix={addForm.phone_prefix || "+255"}
                    onPrefixChange={(val) => setAddForm({ ...addForm, phone_prefix: val })}
                    phone={addForm.phone_number || ""}
                    onPhoneChange={(val) => setAddForm({ ...addForm, phone_number: val })}
                    label="Phone Number"
                    testIdPrefix="add-payout-phone"
                  />
                </>
              ) : (
                <>
                  <input placeholder="Bank Name" className="w-full rounded-lg border px-3 py-2 text-sm" value={addForm.bank_name || ""} onChange={(e) => setAddForm({ ...addForm, bank_name: e.target.value })} data-testid="add-bank-name-input" />
                  <input placeholder="Account Name" className="w-full rounded-lg border px-3 py-2 text-sm" value={addForm.account_name || ""} onChange={(e) => setAddForm({ ...addForm, account_name: e.target.value })} data-testid="add-bank-account-name-input" />
                  <input placeholder="Account Number" className="w-full rounded-lg border px-3 py-2 text-sm" value={addForm.account_number || ""} onChange={(e) => setAddForm({ ...addForm, account_number: e.target.value })} data-testid="add-account-number-input" />
                  <input placeholder="Branch (optional)" className="w-full rounded-lg border px-3 py-2 text-sm" value={addForm.branch_name || ""} onChange={(e) => setAddForm({ ...addForm, branch_name: e.target.value })} />
                  <input placeholder="SWIFT Code (optional)" className="w-full rounded-lg border px-3 py-2 text-sm" value={addForm.swift_code || ""} onChange={(e) => setAddForm({ ...addForm, swift_code: e.target.value })} />
                </>
              )}
              <button onClick={handleAddAccount} className="w-full rounded-lg bg-emerald-600 text-white py-2 text-sm font-semibold hover:bg-emerald-700 transition" data-testid="save-account-btn">
                Save Account
              </button>
            </div>
          )}

          {accounts.length === 0 && !showAddForm && (
            <div className="text-center py-6 text-sm text-slate-500" data-testid="no-accounts">
              No payout accounts set up yet. Add one to withdraw.
            </div>
          )}

          <div className="space-y-3">
            {accounts.map((acct) => (
              <div key={acct.id} className="flex items-center justify-between rounded-xl border p-4" data-testid={`payout-account-${acct.id}`}>
                <div className="flex items-center gap-3">
                  {acct.method === "mobile_money" ? (
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Building2 className="w-5 h-5 text-slate-600" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {acct.method === "mobile_money" ? `${acct.provider} - ${acct.phone_number}` : `${acct.bank_name} - ${acct.account_number}`}
                    </div>
                    <div className="text-xs text-slate-500">{acct.account_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {acct.is_default && <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">Default</span>}
                  <button onClick={() => handleDeleteAccount(acct.id)} className="text-slate-400 hover:text-red-500 transition" data-testid={`delete-account-${acct.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Payout History */}
      <SectionCard title="Payout History" subtitle="Your withdrawal requests and their status.">
        {history.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500" data-testid="no-payout-history">
            No payout requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" data-testid="payout-history-table">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Amount</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Method</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Requested</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Reference</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{money(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-700 capitalize">{(p.payout_method || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusStyles[p.status] || statusStyles.pending}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.payment_reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
