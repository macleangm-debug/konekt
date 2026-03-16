import React, { useState, useEffect } from "react";
import { CreditCard, Download, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import MetricCard from "../../components/ui/MetricCard";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function MyStatementPageV2() {
  const [statement, setStatement] = useState({
    totalSpent: 0,
    totalPaid: 0,
    balance: 0,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios.get(`${API_URL}/api/customer/statement`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { period }
    })
      .then(res => setStatement(res.data || {}))
      .catch(err => console.error("Failed to load statement:", err))
      .finally(() => setLoading(false));
  }, [period]);

  const downloadStatement = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_URL}/api/customer/statement/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `konekt-statement-${period}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download statement");
    }
  };

  return (
    <div data-testid="statement-page">
      <PageHeader 
        title="My Statement"
        subtitle="View your account activity and payment history."
        actions={
          <BrandButton onClick={downloadStatement} variant="ghost">
            <Download className="w-5 h-5 mr-2" />
            Download PDF
          </BrandButton>
        }
      />

      {/* Period Selector */}
      <SurfaceCard className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-medium text-slate-600">Period:</span>
          {[
            { value: "all", label: "All Time" },
            { value: "month", label: "This Month" },
            { value: "quarter", label: "This Quarter" },
            { value: "year", label: "This Year" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-2 rounded-xl transition ${
                period === opt.value
                  ? "bg-[#20364D] text-white"
                  : "border hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SurfaceCard>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <MetricCard 
          label="Total Spent" 
          value={`TZS ${Number(statement.totalSpent || 0).toLocaleString()}`} 
          icon={TrendingUp}
        />
        <MetricCard 
          label="Total Paid" 
          value={`TZS ${Number(statement.totalPaid || 0).toLocaleString()}`} 
          icon={CreditCard}
        />
        <MetricCard 
          label="Outstanding Balance" 
          value={`TZS ${Number(statement.balance || 0).toLocaleString()}`} 
          icon={statement.balance > 0 ? TrendingDown : TrendingUp}
        />
      </div>

      {/* Transactions */}
      <SurfaceCard>
        <h2 className="text-lg font-bold text-[#20364D] mb-4">Transaction History</h2>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : statement.transactions?.length > 0 ? (
          <div className="space-y-3">
            {statement.transactions.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl border">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === "payment" ? "bg-green-100" : "bg-blue-100"
                  }`}>
                    {tx.type === "payment" ? (
                      <CreditCard className="w-5 h-5 text-green-600" />
                    ) : (
                      <Calendar className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{tx.description || tx.type}</div>
                    <div className="text-sm text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={`font-bold ${tx.type === "payment" ? "text-green-600" : "text-[#20364D]"}`}>
                  {tx.type === "payment" ? "-" : "+"} TZS {Number(tx.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            No transactions found for this period.
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
