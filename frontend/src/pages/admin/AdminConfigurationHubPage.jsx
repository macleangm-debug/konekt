import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Settings, CreditCard, Percent, Users, Globe, Rocket, CheckCircle, AlertCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function ConfigCard({ title, desc, href, ready, icon: Icon }) {
  return (
    <Link
      to={href}
      className="rounded-3xl border bg-white p-6 hover:shadow-md transition block"
      data-testid={`config-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-[#20364D]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#20364D]">{title}</div>
            <p className="text-slate-600 mt-2 text-sm">{desc}</p>
          </div>
        </div>

        <div
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 ${
            ready
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {ready ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {ready ? "Ready" : "Review"}
        </div>
      </div>
    </Link>
  );
}

export default function AdminConfigurationHubPage() {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`${API}/api/admin/go-live-readiness/audit`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          setAudit(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const businessReady = audit?.business_identity?.company_name && audit?.business_identity?.support_email;
  const paymentsReady = audit?.payments?.bank_transfer_configured;
  const opsReady = (audit?.operations?.active_service_groups || 0) > 0;
  const commercialReady = audit?.commercial?.has_commission_rules;

  return (
    <div className="space-y-8 p-6" data-testid="admin-configuration-hub">
      <div>
        <h1 className="text-3xl font-bold text-[#20364D]">Configuration Hub</h1>
        <p className="text-slate-500 mt-2">
          Review all business-critical settings from one place before going live.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading configuration status...</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          <ConfigCard
            title="Business Identity"
            desc="Company name, logo, TIN, support email, phone, address, and invoice footer."
            href="/admin/business-settings"
            ready={!!businessReady}
            icon={Settings}
          />
          <ConfigCard
            title="Payment Settings"
            desc="Bank transfer instructions, KwikPay toggle, country payment options."
            href="/admin/payment-settings"
            ready={!!paymentsReady}
            icon={CreditCard}
          />
          <ConfigCard
            title="Pricing & Markups"
            desc="Group markups, minimum margin protection, country pricing overrides."
            href="/admin/group-markups"
            ready={true}
            icon={Percent}
          />
          <ConfigCard
            title="Rewards & Commissions"
            desc="Points caps, affiliate limits, commission rules, and promo settings."
            href="/admin/commission-rules"
            ready={!!commercialReady}
            icon={Users}
          />
          <ConfigCard
            title="Country & Region Setup"
            desc="Countries, regions, expansion status, demand intake, and partner applications."
            href="/admin/countries-regions"
            ready={true}
            icon={Globe}
          />
          <ConfigCard
            title="Launch Readiness"
            desc="Final launch review across identity, payments, operations, and routes."
            href="/admin/launch-readiness"
            ready={!!(businessReady && paymentsReady && opsReady)}
            icon={Rocket}
          />
        </div>
      )}

      <div className="rounded-3xl border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">Why this matters</div>
        <p className="text-slate-600 mt-4 max-w-3xl">
          Configuration should be visible and simple. Daily operations and setup
          should not compete visually. This page gives admin one place to manage
          all settings that affect launch, pricing, payments, rewards, and expansion.
        </p>
      </div>
    </div>
  );
}
