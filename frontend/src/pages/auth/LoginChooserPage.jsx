import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../lib/routes";
import { User, Building2, Briefcase } from "lucide-react";

function LoginCard({ title, desc, href, icon: Icon }) {
  return (
    <Link
      to={href}
      className="rounded-3xl border bg-white p-8 hover:shadow-lg hover:border-[#D4A843]/30 transition group"
      data-testid={`login-card-${title.toLowerCase()}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-[#D4A843]/10 flex items-center justify-center mb-5 transition">
        <Icon className="w-7 h-7 text-[#20364D]" />
      </div>
      <div className="text-2xl font-bold text-[#20364D]">{title}</div>
      <p className="text-slate-600 mt-3 leading-relaxed">{desc}</p>
      <div className="mt-6 text-[#D4A843] font-semibold">
        Continue →
      </div>
    </Link>
  );
}

export default function LoginChooserPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12" data-testid="login-chooser-page">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#20364D]">
            Welcome to Konekt
          </h1>
          <p className="text-slate-600 mt-4 text-lg max-w-2xl mx-auto">
            Choose your login based on your role in the ecosystem.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <LoginCard
            title="Customer"
            desc="For buyers, companies, contract clients — manage quotes, orders, services, and referrals."
            href={ROUTES.customerLogin}
            icon={User}
          />
          <LoginCard
            title="Staff"
            desc="For sales, operations, supervisors, and admins — manage work and monitor performance."
            href={ROUTES.staffLogin}
            icon={Briefcase}
          />
          <LoginCard
            title="Partner"
            desc="For product, service, and delivery partners — manage operations and earnings."
            href={ROUTES.partnerLogin}
            icon={Building2}
          />
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-500">
            Don't have an account?{" "}
            <Link to={ROUTES.register} className="text-[#D4A843] font-semibold hover:underline">
              Register as a customer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
