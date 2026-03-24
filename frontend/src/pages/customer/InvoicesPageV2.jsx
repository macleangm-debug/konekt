import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Receipt, Eye, Clock, Download, AlertCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import FilterBar from "../../components/ui/FilterBar";
import BrandButton from "../../components/ui/BrandButton";
import TableCardToggle from "../../components/common/TableCardToggle";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const INV_STATUS_LABELS = {
  pending_payment: "Unpaid",
  pending: "Unpaid",
  payment_proof_uploaded: "Payment Under Review",
  paid: "Paid",
  overdue: "Overdue",
  partially_paid: "Partially Paid",
  cancelled: "Cancelled",
};

const INV_STATUS_COLORS = {
  pending_payment: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  payment_proof_uploaded: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-700",
  partially_paid: "bg-orange-100 text-orange-800",
  cancelled: "bg-slate-100 text-slate-700",
};

export default function InvoicesPageV2() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState("table");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get(`${API_URL}/api/customer/invoices`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setInvoices(res.data || []))
      .catch(err => console.error("Failed to load invoices:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchValue || 
      (invoice.invoice_number || "").toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    return INV_STATUS_COLORS[status] || "bg-amber-100 text-amber-700";
  };

  const getStatusLabel = (status) => {
    return INV_STATUS_LABELS[status] || (status || "pending").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const unpaidTotal = invoices
    .filter(i => i.status !== "paid")
    .reduce((sum, i) => sum + (i.total || i.total_amount || 0), 0);

  return (
    <div data-testid="invoices-page">
      <PageHeader 
        title="My Invoices"
        subtitle="View and pay your invoices."
        actions={<TableCardToggle view={view} setView={setView} />}
      />

      {unpaidTotal > 0 && (
        <SurfaceCard className="bg-amber-50 border-amber-200 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <span className="font-medium text-amber-800">
                You have TZS {unpaidTotal.toLocaleString()} in unpaid invoices.
              </span>
            </div>
            <BrandButton href="/payment/select" variant="gold" className="text-sm">
              Pay Now
            </BrandButton>
          </div>
        </SurfaceCard>
      )}

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search invoices..."
        filters={[
          {
            name: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: "All Statuses",
            options: [
              { value: "pending", label: "Pending" },
              { value: "paid", label: "Paid" },
              { value: "overdue", label: "Overdue" },
            ],
          },
        ]}
        className="mb-6"
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredInvoices.length > 0 ? (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <SurfaceCard key={invoice.id || invoice._id} className="hover:shadow-md transition">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-[#20364D]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#20364D]">
                      Invoice #{invoice.invoice_number || invoice.id?.slice(-8)}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </div>
                    {invoice.due_date && (
                      <div className="text-sm text-slate-500">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#20364D]">
                      TZS {Number(invoice.total || 0).toLocaleString()}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusBadge(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {invoice.status !== "paid" && (
                      <BrandButton href={`/dashboard/invoices/${invoice.id || invoice._id}/pay`} variant="gold" className="text-sm py-2">
                        Pay Invoice
                      </BrandButton>
                    )}
                    {invoice.pdf_url && (
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl border hover:bg-slate-50 transition"
                      >
                        <Download className="w-5 h-5 text-slate-500" />
                      </a>
                    )}
                    <Link
                      to={`/dashboard/invoices/${invoice.id || invoice._id}`}
                      className="p-3 rounded-xl border hover:bg-slate-50 transition"
                    >
                      <Eye className="w-5 h-5 text-slate-500" />
                    </Link>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      ) : (
        <SurfaceCard className="text-center py-12">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-bold text-[#20364D] mb-2">No invoices yet</h3>
          <p className="text-slate-500 mb-6">
            Paid product orders and approved service quotes create invoices here.
          </p>
          <Link to="/account/marketplace?tab=products" className="inline-block rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition-colors">
            Continue Shopping
          </Link>
        </SurfaceCard>
      )}
    </div>
  );
}
