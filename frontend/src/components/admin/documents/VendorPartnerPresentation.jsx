import React from "react";
import {
  Package, Truck, CreditCard, Shield, Users, Zap,
  CheckCircle, ArrowRight, Globe, Clock, Lock,
  BarChart3, Handshake, Building2, FileText, Star,
} from "lucide-react";
import { useBranding } from "../../../contexts/BrandingContext";

/*
 * VendorPartnerPresentation — Print-ready, state-of-the-art 8-slide deck.
 * Uses @media print CSS for clean page breaks.
 * Each .slide div = one printed page (A4 landscape).
 */

function Slide({ children, className = "", bg = "bg-white" }) {
  return (
    <div className={`slide relative overflow-hidden ${bg} ${className}`} style={{ pageBreakAfter: "always", minHeight: "680px" }}>
      {children}
    </div>
  );
}

function SlideNumber({ n, total = 8 }) {
  return (
    <div className="absolute bottom-6 right-8 text-xs font-medium text-slate-300 print:text-slate-400">
      {n} / {total}
    </div>
  );
}

export default function VendorPartnerPresentation() {
  const { brand_name, primary_logo_url } = useBranding();
  return (
    <div className="vendor-presentation mx-auto" style={{ maxWidth: "1100px" }}>
      <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .slide { width: 100vw; height: 100vh; page-break-after: always; page-break-inside: avoid; overflow: hidden; }
          .print\\:hidden { display: none !important; }
          .vendor-presentation { max-width: none !important; }
        }
        @media screen {
          .slide { border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        }
        .slide { padding: 56px 64px; display: flex; flex-direction: column; justify-content: center; }
        .gradient-bar { height: 5px; background: linear-gradient(90deg, #D4A843, #20364D, #0d9488); }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE 1 — COVER
          ═══════════════════════════════════════════════════════════════════ */}
      <Slide bg="bg-[#20364D]" className="relative">
        <div className="gradient-bar absolute top-0 left-0 right-0" />
        <img
          src="/branding/vendor-hero-banner.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        <div className="relative z-10 flex flex-col justify-between h-full">
          {primary_logo_url
            ? <img src={primary_logo_url} alt={brand_name} className="h-14 w-auto object-contain brightness-0 invert" />
            : <div className="text-3xl font-extrabold text-white">{brand_name}</div>
          }
          <div className="my-auto">
            <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight">
              Vendor & Partner<br />
              <span className="text-[#D4A843]">Partnership Program</span>
            </h1>
            <p className="mt-6 text-xl text-white/70 max-w-[640px] leading-relaxed font-light">
              Grow your business with East Africa's unified B2B commerce platform.<br />
              Access verified customers, automated order routing, and flexible payment terms.
            </p>
            <div className="mt-8 flex gap-4">
              {[
                { label: "Tanzania", flag: "\u{1F1F9}\u{1F1FF}", status: "Live" },
                { label: "Kenya", flag: "\u{1F1F0}\u{1F1EA}", status: "2026" },
                { label: "Uganda", flag: "\u{1F1FA}\u{1F1EC}", status: "2026" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                  <span className="text-lg">{c.flag}</span>
                  <div>
                    <div className="text-xs font-semibold text-white">{c.label}</div>
                    <div className="text-[9px] text-white/50">{c.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <span>Confidential</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>April 2026</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>konekt.co.tz</span>
          </div>
        </div>
        <SlideNumber n={1} />
      </Slide>

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE 2 — WHY KONEKT
          ═══════════════════════════════════════════════════════════════════ */}
      <Slide>
        <div className="gradient-bar absolute top-0 left-0 right-0" />
        <div className="flex items-start justify-between gap-12 h-full">
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A843]">Why Partner With Us</p>
            <h2 className="mt-3 text-4xl font-extrabold text-[#20364D] leading-tight">
              The Platform Built for<br />African Business Operations
            </h2>
            <p className="mt-5 text-base text-slate-500 leading-relaxed max-w-[480px]">
              {brand_name} connects businesses to trusted vendors through a unified commerce platform. 
              We handle customer acquisition, billing, and collections — so you can focus on what you do best.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: "Verified Business Buyers", desc: "Pre-vetted, paying companies only" },
                { icon: Zap, label: "Auto Order Routing", desc: "Orders auto-split to your categories" },
                { icon: Shield, label: "Category Exclusivity", desc: "Preferred vendors get guaranteed flow" },
                { icon: Globe, label: "East Africa Expansion", desc: "Tanzania live, Kenya & Uganda 2026" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#20364D]/5 flex-shrink-0">
                    <Icon className="h-4.5 w-4.5 text-[#20364D]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#20364D]">{label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[340px] flex-shrink-0 flex items-center">
            <img
              src="/branding/vendor-trust.png"
              alt="Trust & Security"
              className="w-full rounded-2xl shadow-lg"
            />
          </div>
        </div>
        <SlideNumber n={2} />
      </Slide>

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE 3 — THREE COMMERCIAL LANES
          ═══════════════════════════════════════════════════════════════════ */}
      <Slide>
        <div className="gradient-bar absolute top-0 left-0 right-0" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A843]">What We Source</p>
        <h2 className="mt-3 text-3xl font-extrabold text-[#20364D]">Three Commercial Lanes</h2>
        <p className="mt-3 text-base text-slate-500 max-w-[600px]">
          {brand_name} operates across three distinct categories. Your expertise fits into one or more of these lanes.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-6 flex-1">
          {[
            {
              icon: Package,
              title: "Products",
              color: "from-[#20364D] to-[#2a5070]",
              items: ["Office Equipment", "Stationery & Supplies", "IT Hardware", "Furniture & Fixtures", "Cleaning & Hygiene", "Safety & PPE"],
            },
            {
              icon: Star,
              title: "Promotional Materials",
              color: "from-[#D4A843] to-[#c49930]",
              items: ["Custom Branded Items", "Corporate Merchandise", "Event Materials", "Printed Collateral", "Uniforms & Apparel", "Signage & Displays"],
            },
            {
              icon: Building2,
              title: "Business Services",
              color: "from-teal-600 to-teal-700",
              items: ["Printing & Design", "Office Branding", "Cleaning Services", "Technical Support", "Creative & Design", "Facilities Management"],
              note: "Services use our 2-stage site visit workflow — assessment first, then accurate pricing",
            },
          ].map(({ icon: Icon, title, color, items, note }) => (
            <div key={title} className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className={`bg-gradient-to-br ${color} px-6 py-5 text-white`}>
                <Icon className="h-8 w-8 mb-3 opacity-80" />
                <h3 className="text-xl font-extrabold">{title}</h3>
              </div>
              <div className="px-6 py-5 space-y-2.5">
                {items.map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
                {note && <p className="text-[10px] text-slate-400 italic mt-3 pt-2 border-t">{note}</p>}
              </div>
            </div>
          ))}
        </div>
        <SlideNumber n={3} />
      </Slide>

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE 4 — VENDOR JOURNEY
          ═══════════════════════════════════════════════════════════════════ */}
      <Slide>
        <div className="gradient-bar absolute top-0 left-0 right-0" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A843]">How It Works</p>
        <h2 className="mt-3 text-3xl font-extrabold text-[#20364D]">Your Vendor Journey</h2>
        <p className="mt-3 text-base text-slate-500 max-w-[600px]">
          A clear, structured workflow from order receipt to payment settlement. No ambiguity, no guesswork.
        </p>

        <div className="mt-8 flex-1 flex items-center">
          <div className="grid grid-cols-5 gap-3 w-full">
            {[
              { step: "01", title: "Receive Order", desc: "Automated assignment based on your capabilities and availability", icon: FileText, color: "bg-blue-50 border-blue-200 text-blue-700" },
              { step: "02", title: "Set Your ETA", desc: `Commit to a delivery date. ${brand_name} manages customer expectations`, icon: Clock, color: "bg-amber-50 border-amber-200 text-amber-700" },
              { step: "03", title: "Execute & Update", desc: "Update production status through your vendor portal in real-time", icon: Zap, color: "bg-violet-50 border-violet-200 text-violet-700" },
              { step: "04", title: "Mark Ready", desc: `Notify ${brand_name} when product/service is ready for pickup or delivery`, icon: Package, color: "bg-teal-50 border-teal-200 text-teal-700" },
              { step: "05", title: "Get Paid", desc: "Payment settlement per agreed terms — on time, every time", icon: CreditCard, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            ].map(({ step, title, desc, icon: Icon, color }, idx) => (
              <div key={step} className="relative">
                <div className={`rounded-2xl border p-5 h-full flex flex-col ${color}`}>
                  <div className="text-3xl font-extrabold opacity-20 mb-2">{step}</div>
                  <Icon className="h-7 w-7 mb-3" />
                  <h4 className="text-sm font-extrabold">{title}</h4>
                  <p className="mt-2 text-xs leading-relaxed opacity-70">{desc}</p>
                </div>
                {idx < 4 && (
                  <div className="absolute top-1/2 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-slate-400">
          <Lock className="h-4 w-4" />
          <span>{brand_name} handles all logistics after "Mark Ready" — you never touch last-mile delivery</span>
        </div>
        <SlideNumber n={4} />
      </Slide>

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE 5 — PAYMENT STRUCTURE (KEY SLIDE)
          ═══════════════════════════════════════════════════════════════════ */}
      <Slide>
        <div className="gradient-bar absolute top-0 left-0 right-0" />
        <div className="flex gap-10 h-full">
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A843]">Payment Structure</p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#20364D]">
              Flexible Payment<br />Terms That Work For You
            </h2>
            <p className="mt-4 text-base text-slate-500 leading-relaxed max-w-[480px]">
              We understand that different product categories and vendor sizes require different payment approaches. 
              {brand_name} offers multiple settlement models to match your cash flow needs.
            </p>

            <div className="mt-8 space-y-4">
              {/* Pre-Paid Model */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                    <CreditCard className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-emerald-800">Pre-Paid Model</h4>
                    <p className="text-xs text-emerald-600">Payment before order fulfillment</p>
                  </div>
                  <span className="ml-auto inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Recommended</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ideal for <strong>Office Equipment, Stationery, IT Hardware, and high-value items</strong>. 
                  Full payment or deposit is processed before the vendor begins fulfillment — ensuring zero financial risk for the vendor.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Office Equipment", "Stationery", "IT Hardware", "Furniture"].map(cat => (
                    <span key={cat} className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">{cat}</span>
                  ))}
                </div>
              </div>

              {/* Weekly Settlement */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <BarChart3 className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-blue-800">Weekly Settlement</h4>
                    <p className="text-xs text-blue-600">Aggregated weekly payment cycle</p>
                  </div>
                  <span className="ml-auto inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold text-blue-700 uppercase tracking-wider">Flexible</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  For <strong>recurring services, promotional materials, and high-frequency orders</strong>. 
                  All completed orders within the week are aggregated and settled every <strong>Friday</strong> — predictable cash flow for your business.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Services", "Promo Materials", "Cleaning", "Maintenance"].map(cat => (
                    <span key={cat} className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">{cat}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-[300px] flex-shrink-0 flex items-center">
            <img
              src="/branding/vendor-payment.png"
              alt="Payment Structure"
              className="w-full rounded-2xl shadow-lg"
            />
          </div>
        </div>
        <SlideNumber n={5} />
      </Slide>

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE 6 — ADDITIONAL PAYMENT OPTIONS
          ═══════════════════════════════════════════════════════════════════ */}
      <Slide>
        <div className="gradient-bar absolute top-0 left-0 right-0" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A843]">Payment Flexibility</p>
        <h2 className="mt-3 text-3xl font-extrabold text-[#20364D]">More Ways We Settle</h2>
        <p className="mt-3 text-base text-slate-500 max-w-[600px]">
          Beyond Pre-Paid and Weekly Settlement, {brand_name} accommodates custom arrangements for strategic partners.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-5 flex-1">
          {/* Milestone-Based */}
          <div className="rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 mb-4">
              <CheckCircle className="h-6 w-6 text-violet-600" />
            </div>
            <h4 className="text-base font-extrabold text-[#20364D]">Milestone-Based</h4>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed flex-1">
              For large or complex projects. Payment released at pre-agreed milestones — 
              e.g., 50% on order confirmation, 50% on delivery.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Best for</div>
              <div className="mt-1 text-sm font-semibold text-[#20364D]">Custom manufacturing, large installations</div>
            </div>
          </div>

          {/* Monthly Account */}
          <div className="rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 mb-4">
              <FileText className="h-6 w-6 text-amber-600" />
            </div>
            <h4 className="text-base font-extrabold text-[#20364D]">Monthly Account</h4>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed flex-1">
              For established partners with proven track records. Monthly invoicing with 
              net-15 or net-30 terms — ideal for high-volume, repeat vendors.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Best for</div>
              <div className="mt-1 text-sm font-semibold text-[#20364D]">Strategic partners, high-volume vendors</div>
            </div>
          </div>

          {/* Escrow Protection */}
          <div className="rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 mb-4">
              <Shield className="h-6 w-6 text-teal-600" />
            </div>
            <h4 className="text-base font-extrabold text-[#20364D]">Escrow Protection</h4>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed flex-1">
              For new partnerships. Customer funds held in escrow and released to vendor 
              upon confirmed delivery — protecting both parties.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Best for</div>
              <div className="mt-1 text-sm font-semibold text-[#20364D]">New vendor relationships, high-value orders</div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-[#20364D]/5 p-5 flex items-center gap-4">
          <Handshake className="h-8 w-8 text-[#20364D] flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-[#20364D]">Custom Arrangements Welcome</div>
            <div className="text-sm text-slate-500">Every vendor relationship is different. We work with you to find the payment structure that supports your growth.</div>
          </div>
        </div>
        <SlideNumber n={6} />
      </Slide>

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE 7 — VENDOR PORTAL & PRIVACY
          ═══════════════════════════════════════════════════════════════════ */}
      <Slide>
        <div className="gradient-bar absolute top-0 left-0 right-0" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D4A843]">Your Vendor Portal</p>
        <h2 className="mt-3 text-3xl font-extrabold text-[#20364D]">Built for Clarity and Simplicity</h2>
        <p className="mt-3 text-base text-slate-500 max-w-[600px]">
          Your dedicated portal shows only what you need — orders, delivery dates, and payment status. No noise, no clutter.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-6 flex-1">
          {/* What You See */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-6">
            <h4 className="text-base font-extrabold text-emerald-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> What You See
            </h4>
            <div className="mt-5 space-y-3.5">
              {[
                "Your vendor order number and work details",
                "Product specifications and quantities",
                "Your base price (tax-inclusive)",
                "Delivery deadline and ETA management",
                "Production status controls",
                `Direct ${brand_name} Sales contact for support`,
                "Payment status and settlement history",
                "Performance metrics and ratings",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* What Stays Confidential */}
          <div className="rounded-2xl border-2 border-red-200 bg-red-50/30 p-6">
            <h4 className="text-base font-extrabold text-red-800 flex items-center gap-2">
              <Lock className="h-5 w-5" /> What Stays Confidential
            </h4>
            <div className="mt-5 space-y-3.5">
              {[
                "Customer identity and contact information",
                "Customer company details",
                `${brand_name}'s margin or markup`,
                "Other vendor pricing or assignments",
                "Customer's payment amount or method",
                `Internal ${brand_name} operations data`,
                "Customer account history",
                "Sales team internal communications",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <Lock className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 text-xs text-slate-400 text-center italic">
          {brand_name} acts as the operational buffer between customers and vendors — protecting both parties at all times.
        </div>
        <SlideNumber n={7} />
      </Slide>

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE 8 — CLOSING / CONTACT
          ═══════════════════════════════════════════════════════════════════ */}
      <Slide bg="bg-[#20364D]" className="relative">
        <div className="gradient-bar absolute top-0 left-0 right-0" />
        <img
          src="/branding/vendor-hero-banner.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-luminosity"
        />
        <div className="relative z-10 flex flex-col justify-between h-full">
          {primary_logo_url
            ? <img src={primary_logo_url} alt={brand_name} className="h-14 w-auto object-contain brightness-0 invert" />
            : <div className="text-3xl font-extrabold text-white">{brand_name}</div>
          }

          <div className="my-auto text-center">
            <h2 className="text-5xl font-extrabold text-white leading-tight">
              Let's Build<br />
              <span className="text-[#D4A843]">Something Great Together</span>
            </h2>
            <p className="mt-6 text-xl text-white/60 max-w-[640px] mx-auto leading-relaxed font-light">
              Join East Africa's fastest-growing B2B commerce platform.<br />
              Automated order routing, verified buyers, and flexible payments — across Tanzania, Kenya, and Uganda.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-[660px] mx-auto">
              {[
                { label: "Website", value: "konekt.co.tz" },
                { label: "Email", value: "partners@konekt.co.tz" },
                { label: "Phone", value: "+255 715 222 132" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{label}</div>
                  <div className="mt-2 text-base font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-white/30">
            <span>Confidential — For intended recipients only</span>
            <span>April 2026</span>
          </div>
        </div>
        <SlideNumber n={8} />
      </Slide>
    </div>
  );
}
