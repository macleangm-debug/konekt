import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  DollarSign, TrendingUp, Copy, ExternalLink, Download, 
  CreditCard, Clock, CheckCircle2, Users, Share2, LogOut,
  ChevronRight
} from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";

export default function AffiliatePortalPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadDashboard = async () => {
      const token = localStorage.getItem("affiliate_token") || localStorage.getItem("token");
      if (!token) {
        navigate("/auth?redirect=/affiliate/portal");
        return;
      }
      
      try {
        setLoading(true);
        const res = await api.get("/api/affiliate-portal/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboard(res.data);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/auth?redirect=/affiliate/portal");
        } else {
          setError(err.response?.data?.detail || "Failed to load dashboard");
        }
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [navigate]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("affiliate_token");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/auth?redirect=/affiliate/portal" className="text-[#D4A843] font-medium">
            Try logging in again
          </Link>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const { profile, stats, tracking_link, recent_conversions, payout_requests } = dashboard;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="affiliate-portal">
      {/* Header */}
      <header className="bg-[#2D3E50] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Partner Portal</h1>
            <p className="text-sm text-slate-300">Welcome back, {profile.full_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-[#D4A843]/20 text-[#D4A843] text-sm font-medium capitalize">
              {profile.tier} Partner
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-white border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-slate-500">Total Commission</span>
            </div>
            <p className="text-2xl font-bold">{formatMoney(stats.total_commission)}</p>
          </div>
          
          <div className="rounded-2xl bg-white border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-slate-500">Pending</span>
            </div>
            <p className="text-2xl font-bold">{formatMoney(stats.pending_commission)}</p>
          </div>
          
          <div className="rounded-2xl bg-white border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-slate-500">Paid Out</span>
            </div>
            <p className="text-2xl font-bold">{formatMoney(stats.paid_commission)}</p>
          </div>
          
          <div className="rounded-2xl bg-white border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-slate-500">Conversions</span>
            </div>
            <p className="text-2xl font-bold">{stats.conversion_count}</p>
          </div>
        </div>

        {/* Tracking Link & Promo Code */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl bg-[#2D3E50] text-white p-6">
            <h3 className="font-semibold mb-3">Your Tracking Link</h3>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3">
              <span className="flex-1 text-sm truncate">{tracking_link}</span>
              <button
                onClick={() => copyToClipboard(tracking_link, "link")}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Copy link"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={tracking_link}
                target="_blank"
                rel="noreferrer"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Open link"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            {copySuccess === "link" && (
              <p className="text-sm text-green-400 mt-2">Copied to clipboard!</p>
            )}
          </div>
          
          <div className="rounded-2xl bg-[#D4A843]/10 border border-[#D4A843]/30 p-6">
            <h3 className="font-semibold mb-3 text-[#9a6d00]">Your Promo Code</h3>
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-[#D4A843]/30">
              <span className="flex-1 text-2xl font-bold tracking-wider">{profile.promo_code}</span>
              <button
                onClick={() => copyToClipboard(profile.promo_code, "code")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Copy code"
              >
                <Copy className="w-4 h-4 text-[#9a6d00]" />
              </button>
            </div>
            {copySuccess === "code" && (
              <p className="text-sm text-green-600 mt-2">Copied to clipboard!</p>
            )}
            <p className="text-sm text-[#9a6d00] mt-3">
              Commission Rate: <strong>{profile.commission_rate}%</strong>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {["overview", "commissions", "resources"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-[#2D3E50] text-white"
                  : "bg-white border hover:bg-slate-50"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Conversions */}
            <div className="rounded-2xl bg-white border p-6">
              <h3 className="font-bold mb-4">Recent Conversions</h3>
              {recent_conversions.length === 0 ? (
                <p className="text-slate-500 text-sm">No conversions yet. Share your link to start earning!</p>
              ) : (
                <div className="space-y-3">
                  {recent_conversions.slice(0, 5).map((conv, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium text-sm">{conv.order_number || `Order ${idx + 1}`}</p>
                        <p className="text-xs text-slate-500">
                          {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatMoney(conv.commission_amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          conv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {conv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout Requests */}
            <div className="rounded-2xl bg-white border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Payout Requests</h3>
                {stats.pending_commission >= 50000 && (
                  <button className="text-sm text-[#D4A843] font-medium hover:underline">
                    Request Payout
                  </button>
                )}
              </div>
              {payout_requests.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No payout requests yet. Minimum payout: TZS 50,000
                </p>
              ) : (
                <div className="space-y-3">
                  {payout_requests.map((req, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium text-sm">{formatMoney(req.amount)}</p>
                        <p className="text-xs text-slate-500">
                          {req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        req.status === "paid" ? "bg-green-100 text-green-700" :
                        req.status === "pending" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "commissions" && (
          <div className="rounded-2xl bg-white border overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-bold">Commission History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-sm font-semibold">Date</th>
                    <th className="px-5 py-3 text-sm font-semibold">Order</th>
                    <th className="px-5 py-3 text-sm font-semibold">Sale Amount</th>
                    <th className="px-5 py-3 text-sm font-semibold">Commission</th>
                    <th className="px-5 py-3 text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_conversions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        No commissions yet
                      </td>
                    </tr>
                  ) : (
                    recent_conversions.map((conv, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="px-5 py-3 text-sm">
                          {conv.created_at ? new Date(conv.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-3 font-medium">{conv.order_number || `#${idx + 1}`}</td>
                        <td className="px-5 py-3">{formatMoney(conv.order_total || 0)}</td>
                        <td className="px-5 py-3 font-semibold text-green-600">
                          {formatMoney(conv.commission_amount)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            conv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {conv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "resources" && (
          <div className="space-y-6">
            {/* Share Tools */}
            <div className="rounded-2xl bg-white border p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#D4A843]" />
                Quick Share
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <a
                  href={`https://wa.me/?text=Check out Konekt for professional business branding! Use code ${profile.promo_code}: ${tracking_link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                >
                  Share on WhatsApp
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=Looking for business branding? Check out @Konekt! Use code ${profile.promo_code}&url=${tracking_link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-600 transition-colors"
                >
                  Share on Twitter
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${tracking_link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  Share on LinkedIn
                </a>
              </div>
            </div>

            {/* Commission Info */}
            <div className="rounded-2xl bg-slate-100 p-6">
              <h3 className="font-bold mb-3">Commission Structure</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Your Rate</p>
                  <p className="text-2xl font-bold text-[#D4A843]">{profile.commission_rate}%</p>
                </div>
                <div>
                  <p className="text-slate-500">Minimum Payout</p>
                  <p className="text-lg font-semibold">TZS 50,000</p>
                </div>
                <div>
                  <p className="text-slate-500">Payout Schedule</p>
                  <p className="text-lg font-semibold">Weekly</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl bg-[#2D3E50] text-white p-6">
              <h3 className="font-bold mb-4">Tips to Maximize Earnings</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-[#D4A843] flex-shrink-0 mt-0.5" />
                  <span>Share your link on Instagram Stories with a swipe-up or link sticker</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-[#D4A843] flex-shrink-0 mt-0.5" />
                  <span>Include your promo code in your bio and content descriptions</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-[#D4A843] flex-shrink-0 mt-0.5" />
                  <span>Create unboxing videos or reviews of Konekt products</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-[#D4A843] flex-shrink-0 mt-0.5" />
                  <span>Target businesses that need branding services (new companies, events)</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
