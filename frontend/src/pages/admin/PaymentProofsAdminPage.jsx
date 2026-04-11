import React, { useEffect, useState } from "react";
import {
  FileCheck, Clock, CheckCircle, XCircle, Loader2, Search,
  Eye, Download, Image, DollarSign, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import StandardDrawerShell from "../../components/ui/StandardDrawerShell";

const API = process.env.REACT_APP_BACKEND_URL;

export default function PaymentProofsAdminPage() {
  const [proofs, setProofs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedProof, setSelectedProof] = useState(null);
  const token = localStorage.getItem("admin_token");

  const loadData = async () => {
    try {
      const [proofsRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/payment-proofs/admin`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/payment-proofs/admin/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (proofsRes.ok) setProofs(await proofsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error(error);
      toast.error("Failed to load payment proofs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (proofId) => {
    try {
      const res = await fetch(`${API}/api/payment-proofs/admin/${proofId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved_by: "admin", notes: "" }),
      });
      if (res.ok) {
        toast.success("Payment proof approved and allocated to invoice");
        setSelectedProof(null);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to approve payment proof");
    }
  };

  const handleReject = async (proofId, reason) => {
    try {
      const res = await fetch(`${API}/api/payment-proofs/admin/${proofId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rejected_by: "admin", reason }),
      });
      if (res.ok) {
        toast.success("Payment proof rejected");
        setSelectedProof(null);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to reject payment proof");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    const icons = {
      pending: <Clock className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-600"}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const filteredProofs = proofs.filter((p) => {
    const matchesFilter = !filter ||
      p.customer_email?.toLowerCase().includes(filter.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(filter.toLowerCase()) ||
      p.bank_reference?.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
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
    <div className="p-6 space-y-6" data-testid="payment-proofs-admin-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Payment Proof Submissions</h1>
        <p className="text-slate-500">Review and approve customer payment proof submissions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-700">{summary?.pending_count || 0}</div>
              <div className="text-sm text-amber-600">Pending Review</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{summary?.approved_count || 0}</div>
              <div className="text-sm text-green-600">Approved</div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">{summary?.rejected_count || 0}</div>
              <div className="text-sm text-red-600">Rejected</div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700">
                TZS {Number(summary?.total_pending_amount || 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Pending Amount</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Alert */}
      {(summary?.pending_count || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="text-amber-800">
              <strong>{summary?.pending_count} payment proofs</strong> are waiting for your review.
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, email, or reference..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            data-testid="search-proofs"
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
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Proofs Table */}
      {filteredProofs.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <FileCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">No payment proofs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="proofs-table">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Customer</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Invoice/Order</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Method</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Reference</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-600">Submitted</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProofs.map((proof) => (
                  <tr key={proof.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-medium">{proof.customer_name}</div>
                      <div className="text-xs text-slate-500">{proof.customer_email}</div>
                    </td>
                    <td className="p-4 text-sm">
                      {proof.invoice_id ? (
                        <span className="text-blue-600">INV: {proof.invoice_id.slice(-8)}</span>
                      ) : proof.order_id ? (
                        <span className="text-purple-600">ORD: {proof.order_id.slice(-8)}</span>
                      ) : "-"}
                    </td>
                    <td className="p-4 text-right font-medium">
                      {proof.currency} {Number(proof.amount_paid || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm capitalize">
                      {proof.payment_method?.replace("_", " ")}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {proof.bank_reference || "-"}
                    </td>
                    <td className="p-4">{getStatusBadge(proof.status)}</td>
                    <td className="p-4 text-sm text-slate-500">
                      {new Date(proof.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedProof(proof)}
                          className="p-2 hover:bg-slate-100 rounded-lg"
                          data-testid={`view-proof-${proof.id}`}
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                        {proof.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(proof.id)}
                              className="p-2 hover:bg-green-100 rounded-lg"
                              data-testid={`approve-proof-${proof.id}`}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => {
                                const reason = window.prompt("Enter rejection reason:");
                                if (reason) handleReject(proof.id, reason);
                              }}
                              className="p-2 hover:bg-red-100 rounded-lg"
                              data-testid={`reject-proof-${proof.id}`}
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </button>
                          </>
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

      {/* Detail Drawer */}
      <StandardDrawerShell
        open={!!selectedProof}
        onClose={() => setSelectedProof(null)}
        title="Payment Proof Details"
        subtitle={selectedProof?.customer_name || ""}
        testId="proof-detail-drawer"
        footer={selectedProof?.status === "pending" ? (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                const reason = window.prompt("Enter rejection reason:");
                if (reason) handleReject(selectedProof.id, reason);
              }}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-semibold"
              data-testid="drawer-reject-btn"
            >
              Reject
            </button>
            <button
              onClick={() => handleApprove(selectedProof.id)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
              data-testid="drawer-approve-btn"
            >
              Approve & Allocate
            </button>
          </div>
        ) : null}
      >
        {selectedProof && (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Customer</div>
                  <div className="font-medium text-sm">{selectedProof.customer_name}</div>
                  <div className="text-xs text-slate-600">{selectedProof.customer_email}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Amount</div>
                  <div className="text-xl font-bold text-green-600">
                    {selectedProof.currency} {Number(selectedProof.amount_paid || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Payment Method</div>
                  <div className="font-medium text-sm capitalize">{selectedProof.payment_method?.replace("_", " ")}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Payment Date</div>
                  <div className="font-medium text-sm">{selectedProof.payment_date || "-"}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Bank Reference</div>
                <div className="font-medium text-sm font-mono">{selectedProof.bank_reference || "-"}</div>
              </div>

              {selectedProof.notes && (
                <div>
                  <div className="text-xs text-slate-500">Customer Notes</div>
                  <div className="text-sm text-slate-700">{selectedProof.notes}</div>
                </div>
              )}

              {selectedProof.proof_file_url && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">Proof Document</div>
                  <a
                    href={selectedProof.proof_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    <Image className="w-4 h-4" />
                    {selectedProof.proof_file_name || "View Document"}
                  </a>
                </div>
              )}

              <div>
                <div className="text-xs text-slate-500">Status</div>
                <div className="mt-1">{getStatusBadge(selectedProof.status)}</div>
              </div>

              {selectedProof.status === "approved" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-green-700">
                    Approved on {new Date(selectedProof.approved_at).toLocaleString()}
                    {selectedProof.approved_by && ` by ${selectedProof.approved_by}`}
                  </div>
                </div>
              )}

              {selectedProof.status === "rejected" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm text-red-700">
                    Rejected on {new Date(selectedProof.rejected_at).toLocaleString()}
                    {selectedProof.rejection_reason && (
                      <div className="mt-1">Reason: {selectedProof.rejection_reason}</div>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
      </StandardDrawerShell>
    </div>
  );
}
