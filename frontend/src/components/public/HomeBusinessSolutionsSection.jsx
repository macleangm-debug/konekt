import React from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Megaphone, Wrench, Globe, ArrowRight } from "lucide-react";

const items = [
  {
    title: "Marketplace Products",
    desc: "Office equipment, stationery, furniture, and operational products ready for order or bulk quote requests.",
    href: "/marketplace?tab=products",
    badge: "Operational Buying",
    icon: ShoppingBag,
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Promotional Materials",
    desc: "Branded merchandise, uniforms, signage, print collateral, and sample-first promotional workflows.",
    href: "/marketplace?tab=promo",
    badge: "Brand Growth",
    icon: Megaphone,
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    title: "Business Services",
    desc: "Printing, branding, deep cleaning, technical support, installations, and project-based service execution.",
    href: "/marketplace?tab=services",
    badge: "Sales Assisted",
    icon: Wrench,
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Country Expansion",
    desc: "Launch in your country through a strong local operating partner model.",
    href: "/launch-country",
    badge: "Africa Growth",
    icon: Globe,
    color: "from-amber-500 to-orange-600",
  },
];

export default function HomeBusinessSolutionsSection() {
  return (
    <section className="bg-slate-50 py-20" data-testid="home-business-solutions">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-start">
          <div>
            <div className="text-xs tracking-[0.22em] uppercase text-slate-500 font-semibold">
              Everything businesses need
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#20364D] mt-4 leading-tight">
              Products, promotional materials, and services — in one coordinated platform
            </h2>
            <p className="text-slate-600 mt-5 text-lg max-w-2xl">
              We help businesses order ready products, request custom promotional materials,
              and engage service teams through one structured commercial flow.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <div className="rounded-3xl bg-white border p-5 hover:shadow-lg transition">
                <div className="text-3xl font-bold text-[#20364D]">1</div>
                <div className="font-semibold text-[#20364D] mt-2">Choose a lane</div>
                <p className="text-sm text-slate-600 mt-2">
                  Start with products, promotional materials, or services.
                </p>
              </div>
              <div className="rounded-3xl bg-white border p-5 hover:shadow-lg transition">
                <div className="text-3xl font-bold text-[#20364D]">2</div>
                <div className="font-semibold text-[#20364D] mt-2">Request or order</div>
                <p className="text-sm text-slate-600 mt-2">
                  Buy directly or request a quote, sample, or scoped service.
                </p>
              </div>
              <div className="rounded-3xl bg-white border p-5 hover:shadow-lg transition">
                <div className="text-3xl font-bold text-[#20364D]">3</div>
                <div className="font-semibold text-[#20364D] mt-2">Track execution</div>
                <p className="text-sm text-slate-600 mt-2">
                  Follow progress from request to quote, order, and delivery.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to="/request-quote?primary=services"
                className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold hover:bg-[#2a4a66] transition flex items-center justify-center gap-2"
                data-testid="request-quote-cta"
              >
                Start a Request <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/marketplace?tab=promo"
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-[#20364D] hover:bg-slate-50 transition text-center"
                data-testid="explore-promo-cta"
              >
                Explore Promotional Materials
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`group rounded-[2rem] border bg-white p-7 hover:shadow-xl transition hover:-translate-y-1 ${
                    idx === 3 ? "md:col-span-2" : ""
                  }`}
                  data-testid={`solution-card-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="rounded-full bg-[#F4E7BF] text-[#8B6A10] border border-[#E9D59B] px-3 py-1 text-xs font-semibold">
                      {item.badge}
                    </div>
                  </div>

                  <div className="text-2xl font-bold text-[#20364D] mt-6">{item.title}</div>
                  <p className="text-slate-600 mt-3 text-base">{item.desc}</p>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#20364D]">Explore now</span>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#20364D] group-hover:translate-x-1 transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
