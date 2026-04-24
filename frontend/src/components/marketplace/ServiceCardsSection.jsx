import React, { useEffect, useState } from "react";
import {
  MapPin, Send, Loader2, CheckCircle2,
  Plus, X, ArrowUpRight, Palette, Printer, Sparkles,
  Wrench, Building2, Shirt, FileText, Paintbrush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PhoneField from "@/components/ui/PhoneField";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * ServiceCardsSection — "magazine" layout: big photographic-style tiles with
 * full-bleed gradient covers, interactive sub-service shelves, and a polished
 * quote form. A deliberate step-change from the old collapsible list.
 */

const CATEGORY_VISUAL_MAP = {
  "Printing & Stationery":   { Icon: FileText,   gradient: "from-sky-600 via-blue-600 to-indigo-700",    pattern: "dots" },
  "Printing & Branding":     { Icon: Printer,    gradient: "from-indigo-600 via-violet-600 to-purple-700", pattern: "grid" },
  "Creative & Design":       { Icon: Paintbrush, gradient: "from-rose-500 via-pink-500 to-fuchsia-600",   pattern: "waves" },
  "Facilities Services":     { Icon: Sparkles,   gradient: "from-emerald-600 via-teal-600 to-cyan-700",   pattern: "dots" },
  "Technical Support":       { Icon: Wrench,     gradient: "from-amber-500 via-orange-500 to-red-500",    pattern: "grid" },
  "Office Branding":         { Icon: Building2,  gradient: "from-slate-800 via-slate-700 to-zinc-800",    pattern: "waves" },
  "Uniforms & Workwear":     { Icon: Shirt,      gradient: "from-cyan-600 via-teal-600 to-emerald-600",   pattern: "grid" },
};

function getVisuals(name) {
  return CATEGORY_VISUAL_MAP[name] || { Icon: Palette, gradient: "from-[#17283C] via-[#20364D] to-[#355170]", pattern: "dots" };
}

// Cover pattern overlays — SVG data URIs for a textured gradient cover
const COVER_PATTERNS = {
  dots: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='1.5' fill='rgba(255,255,255,0.18)'/%3E%3C/svg%3E\")",
  grid: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M0 20h40M20 0v40' stroke='rgba(255,255,255,0.12)' stroke-width='1'/%3E%3C/svg%3E\")",
  waves: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'%3E%3Cpath d='M0 20 Q20 0 40 20 T80 20' stroke='rgba(255,255,255,0.15)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
};

export default function ServiceCardsSection({ heading, description, hideSection = false }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [expandedCat, setExpandedCat] = useState(null);
  const [showRequest, setShowRequest] = useState(false);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone_prefix: "+255", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/api/admin/catalog-workspace/stats")
      .then((r) => {
        const cats = (r.data?.categories || []).filter(
          (c) => c.category_type === "service" && c.active !== false
        );
        setCategories(cats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (hideSection) return null;

  const toggleSub = (catName, subName) => {
    const key = `${catName}::${subName}`;
    const cat = categories.find((c) => c.name === catName);
    if (selected.find((s) => s.key === key)) {
      setSelected(selected.filter((s) => s.key !== key));
    } else {
      setSelected([...selected, {
        key,
        category: catName,
        subcategory: subName,
        requires_site_visit: cat?.requires_site_visit || false,
      }]);
    }
  };

  const needsSiteVisit = selected.some((s) => s.requires_site_visit);

  const submitRequest = async () => {
    if (selected.length === 0) { toast.error("Select at least one service"); return; }
    if (!customer.name || !customer.phone) { toast.error("Name and phone are required"); return; }
    if (needsSiteVisit && !location) { toast.error("Please enter your location for site visit"); return; }

    setSubmitting(true);
    try {
      await api.post("/api/public/quote-requests", {
        items: [],
        custom_items: selected.map((s) => ({
          name: `${s.category} - ${s.subcategory}`,
          quantity: 1,
          unit_of_measurement: "Service",
          description: s.requires_site_visit ? `Site visit required. Location: ${location}` : "",
        })),
        category: selected.map((s) => s.category).join(", "),
        customer_note: [notes, needsSiteVisit ? `Site visit location: ${location}` : ""].filter(Boolean).join(". "),
        customer: {
          first_name: customer.name.split(" ")[0],
          last_name: customer.name.split(" ").slice(1).join(" "),
          phone: `${customer.phone_prefix} ${customer.phone}`.trim(),
          email: customer.email,
          company: "",
        },
        source: "service_cards",
      });
      setSuccess(true);
      toast.success("Service request submitted!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="mt-10 grid md:grid-cols-2 gap-6" data-testid="services-skeleton">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse" />
        ))}
      </div>
    );
  }
  if (categories.length === 0) return null;

  if (success) {
    return (
      <div className="mt-10 rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-12 text-center" data-testid="service-request-success">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-5">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-[#0f172a]">Request received</h3>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Our team will reach out with a detailed quote for the services you selected.
        </p>
        <button
          onClick={() => { setSuccess(false); setSelected([]); setShowRequest(false); setLocation(""); setNotes(""); setCustomer({ name: "", phone_prefix: "+255", phone: "", email: "" }); }}
          className="mt-5 text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:no-underline"
        >
          Request another service
        </button>
      </div>
    );
  }

  return (
    <section className="mt-12" data-testid="service-cards-section">
      {/* Hero header — two-column editorial layout */}
      <div className="mb-10 rounded-[28px] bg-gradient-to-br from-[#0f172a] via-[#17283C] to-[#20364D] p-8 md:p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: COVER_PATTERNS.dots }}
          aria-hidden="true"
        />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#D4A843]/20 blur-3xl" aria-hidden="true" />
        <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-6 md:gap-10 items-end">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-[#D4A843] text-[10px] font-bold uppercase tracking-[0.18em] mb-4 ring-1 ring-white/15">
              <Sparkles className="w-3 h-3" /> Konekt Services
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight">
              {heading || "Services that ship with a quote in hours."}
            </h2>
            <p className="text-sm md:text-base text-slate-300 mt-4 max-w-lg">
              {description || "Pick one or many services across printing, branding, creative, facilities, IT support, uniforms and on-site work. One quote, one point of contact."}
            </p>
          </div>
          <div className="hidden md:flex flex-col gap-3 text-white/80 text-sm">
            {[
              { k: "24h", label: "Typical quote turnaround" },
              { k: `${categories.length}`, label: "Service categories" },
              { k: `${categories.reduce((a, c) => a + (c.subcategories?.length || 0), 0)}+`, label: "Services catalogued" },
            ].map((item) => (
              <div key={item.label} className="flex items-baseline gap-3 border-t border-white/10 pt-3 first:border-0 first:pt-0">
                <span className="text-2xl md:text-3xl font-bold text-[#D4A843] tabular-nums">{item.k}</span>
                <span className="text-white/70 text-xs md:text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action bar — sticky to TOP on desktop, BOTTOM on mobile so users
          never have to scroll back up to find "Get quote". */}
      {selected.length > 0 && !showRequest && (
        <>
          {/* Desktop: pinned near top */}
          <div className="hidden md:flex sticky top-4 z-20 mb-6 rounded-2xl bg-[#0f172a] text-white p-3 pl-5 pr-3 items-center justify-between shadow-2xl shadow-slate-900/20 backdrop-blur">
            <span className="text-sm font-semibold">
              <span className="text-[#D4A843]">{selected.length}</span> service{selected.length !== 1 ? "s" : ""} selected
            </span>
            <Button
              onClick={() => setShowRequest(true)}
              className="bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] rounded-xl font-bold h-10 px-5"
              data-testid="request-services-btn-desktop"
            >
              Get quote <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
          {/* Mobile: floating footer CTA */}
          <div className="md:hidden fixed inset-x-3 bottom-3 z-40 rounded-2xl bg-[#0f172a] text-white p-3 pl-4 pr-3 flex items-center justify-between shadow-2xl shadow-slate-900/30">
            <span className="text-sm font-semibold">
              <span className="text-[#D4A843]">{selected.length}</span> selected
            </span>
            <Button
              onClick={() => setShowRequest(true)}
              className="bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] rounded-xl font-bold h-10 px-5"
              data-testid="request-services-btn-mobile"
            >
              Get quote <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </>
      )}

      {/* Card grid — 2-column on desktop, larger tiles */}
      <div className="grid md:grid-cols-2 gap-6" data-testid="service-cards-grid">
        {categories.map((cat) => {
          const { Icon, gradient, pattern } = getVisuals(cat.name);
          const isExpanded = expandedCat === cat.name;
          const subs = cat.subcategories || [];
          const selectedInCat = selected.filter((s) => s.category === cat.name).length;
          const testSlug = cat.name.replace(/\s/g, "-");

          return (
            <div
              key={cat.name}
              className={`group relative rounded-[22px] overflow-hidden bg-white border transition-all duration-500 ${
                isExpanded
                  ? "border-[#0f172a]/30 shadow-2xl shadow-slate-900/15 md:col-span-2"
                  : "border-slate-200/70 hover:shadow-xl hover:shadow-slate-900/8 hover:-translate-y-1"
              }`}
              data-testid={`service-card-${testSlug}`}
            >
              {/* Cover (full-bleed gradient with pattern overlay) */}
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat.name)}
                className={`relative w-full text-left bg-gradient-to-br ${gradient} ${isExpanded ? "h-40 md:h-48" : "h-36 md:h-44"} transition-all duration-500 overflow-hidden`}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${cat.name}`}
              >
                <div
                  className="absolute inset-0 opacity-80"
                  style={{ backgroundImage: COVER_PATTERNS[pattern] }}
                  aria-hidden="true"
                />
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition" aria-hidden="true" />

                <div className="relative h-full p-6 flex items-end justify-between">
                  <div className="text-white">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 group-hover:rotate-[-4deg] transition">
                      <Icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2} />
                    </div>
                    <h3 className="text-lg md:text-2xl font-bold leading-tight max-w-xs">{cat.name}</h3>
                    <p className="text-xs md:text-sm text-white/75 mt-1">
                      {subs.length} {subs.length === 1 ? "service" : "services"} · ready to quote
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {selectedInCat > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4A843] text-[#17283C] text-[10px] font-bold shadow-md" data-testid={`selected-count-${testSlug}`}>
                        <CheckCircle2 className="w-3 h-3" /> {selectedInCat} selected
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-semibold ring-1 ring-white/25 ${isExpanded ? "" : "group-hover:bg-white/25"} transition`}>
                      {isExpanded ? <X className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {isExpanded ? "Close" : "Explore"}
                    </span>
                  </div>
                </div>
              </button>

              {/* Meta bar */}
              <div className="px-6 py-3 flex items-center gap-2 flex-wrap text-[10px] font-semibold border-b border-slate-100">
                {cat.requires_site_visit && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-600">
                    <MapPin className="w-3 h-3" /> Site Visit
                  </span>
                )}
                {cat.fulfillment_type === "on_site" && (
                  <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700">On-site</span>
                )}
                {cat.fulfillment_type === "digital" && (
                  <span className="px-2 py-1 rounded-md bg-violet-50 text-violet-700">Digital Delivery</span>
                )}
                {cat.fulfillment_type === "delivery_pickup" && (
                  <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">Delivery / Pickup</span>
                )}
                <span className="ml-auto text-slate-400 text-[10px] font-medium">Tap to {isExpanded ? "collapse" : "view services"}</span>
              </div>

              {/* Expanded content — sub-service shelf */}
              {isExpanded && (
                <div className="p-6 bg-gradient-to-br from-white to-slate-50" data-testid={`service-subs-${testSlug}`}>
                  {subs.length > 0 ? (
                    <>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-3">
                        Pick one or more to add to your quote
                      </p>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {subs.map((sub) => {
                          const isSelected = selected.some((s) => s.key === `${cat.name}::${sub}`);
                          return (
                            <button
                              key={sub}
                              onClick={(e) => { e.stopPropagation(); toggleSub(cat.name, sub); }}
                              className={`group/sub relative flex items-center gap-2 px-3.5 py-3 rounded-xl text-left text-sm font-semibold transition-all overflow-hidden ${
                                isSelected
                                  ? `bg-gradient-to-br ${gradient} text-white shadow-lg ring-1 ring-white/30 scale-[1.01]`
                                  : "bg-white border border-slate-200 text-slate-700 hover:border-[#0f172a]/40 hover:-translate-y-0.5 hover:shadow-md"
                              }`}
                              data-testid={`service-sub-${sub.replace(/\s/g, "-")}`}
                            >
                              <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition ${
                                isSelected ? "bg-white/20" : "bg-slate-50 group-hover/sub:bg-[#0f172a]/5"
                              }`}>
                                {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400 group-hover/sub:text-[#0f172a]" />}
                              </span>
                              <span className="flex-1 min-w-0 truncate">{sub}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSub(cat.name, "General"); }}
                      className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition ${
                        selected.some((s) => s.key === `${cat.name}::General`)
                          ? `bg-gradient-to-br ${gradient} text-white shadow-lg`
                          : "bg-white border border-slate-200 text-slate-700 hover:border-[#0f172a]/40"
                      }`}
                    >
                      <Send className="w-4 h-4" /> Request {cat.name} quote
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Request form — bottom sheet on mobile, inline card on desktop */}
      {showRequest && selected.length > 0 && (
        <>
          {/* Mobile backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRequest(false)}
            data-testid="service-request-backdrop"
          />
          <div
            className="md:mt-8 md:relative fixed md:static inset-x-0 bottom-0 z-50 md:z-auto rounded-t-[28px] md:rounded-[22px] border border-slate-200 bg-white p-6 md:p-8 shadow-2xl shadow-slate-900/10 space-y-6 max-h-[92vh] md:max-h-none overflow-y-auto"
            data-testid="service-request-form"
          >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[#0f172a]">Send quote request</h3>
              <p className="text-sm text-slate-500 mt-0.5">{selected.length} service{selected.length !== 1 ? "s" : ""} selected — we'll respond within a business day</p>
            </div>
            <button onClick={() => setShowRequest(false)} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="close-service-request">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700">
                {s.category} — {s.subcategory}
                <button onClick={() => setSelected(selected.filter((x) => x.key !== s.key))} className="text-slate-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {needsSiteVisit && (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
              <label className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Site Visit Location *
              </label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter your address for the site visit…" className="mt-2 text-sm" data-testid="service-location" />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Additional details</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quantities, deadlines, branding notes…" className="mt-1.5 text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name *</label>
              <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" className="mt-1.5 text-sm" data-testid="service-customer-name" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone *</label>
              <div className="mt-1.5">
                <PhoneField
                  prefix={customer.phone_prefix}
                  phone={customer.phone}
                  onPrefixChange={(v) => setCustomer({ ...customer, phone_prefix: v })}
                  onPhoneChange={(v) => setCustomer({ ...customer, phone: v })}
                  placeholder="7XX XXX XXX"
                  required
                  testId="service-customer-phone"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Optional" className="mt-1.5 text-sm" />
            </div>
          </div>

          <Button onClick={submitRequest} disabled={submitting} className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold h-12 rounded-xl shadow-lg" data-testid="submit-service-request">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit quote request
          </Button>
          </div>
        </>
      )}
    </section>
  );
}
