import React, { useEffect, useState } from "react";
import {
  ChevronDown, MapPin, Send, Loader2, CheckCircle2,
  Plus, X, ArrowRight, Palette, Printer, Sparkles,
  Wrench, Building2, Shirt, FileText, Paintbrush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * ServiceCardsSection — redesigned premium service-catalog view.
 *
 * Design language:
 *   • Large tile cards with a coloured gradient accent strip and lucide icon disc
 *   • Category tag pills (site-visit / fulfilment) at the top-right
 *   • Expand-in-place reveals subcategories with +chips
 *   • Selection bucket fades in a sticky footer for the Request-Quote action
 *
 * Props:
 *   heading       — overrides the default section heading
 *   description   — overrides the subheading text
 *   hideSection   — hide the whole section (used by marketplace product view)
 */

const CATEGORY_ICON_MAP = {
  "Printing & Stationery": { Icon: FileText, tone: "from-blue-500 to-sky-400", ring: "ring-blue-100" },
  "Printing & Branding": { Icon: Printer, tone: "from-indigo-500 to-violet-400", ring: "ring-indigo-100" },
  "Creative & Design": { Icon: Paintbrush, tone: "from-rose-500 to-fuchsia-400", ring: "ring-rose-100" },
  "Facilities Services": { Icon: Sparkles, tone: "from-emerald-500 to-teal-400", ring: "ring-emerald-100" },
  "Technical Support": { Icon: Wrench, tone: "from-amber-500 to-orange-400", ring: "ring-amber-100" },
  "Office Branding": { Icon: Building2, tone: "from-slate-700 to-slate-500", ring: "ring-slate-100" },
  "Uniforms & Workwear": { Icon: Shirt, tone: "from-cyan-600 to-teal-400", ring: "ring-cyan-100" },
};

function getCategoryVisuals(name) {
  return CATEGORY_ICON_MAP[name] || { Icon: Palette, tone: "from-[#20364D] to-[#355170]", ring: "ring-slate-100" };
}

export default function ServiceCardsSection({ heading, description, hideSection = false }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [expandedCat, setExpandedCat] = useState(null);
  const [showRequest, setShowRequest] = useState(false);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
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
        customer_note: [
          notes,
          needsSiteVisit ? `Site visit location: ${location}` : "",
        ].filter(Boolean).join(". "),
        customer: {
          first_name: customer.name.split(" ")[0],
          last_name: customer.name.split(" ").slice(1).join(" "),
          phone: customer.phone,
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
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="services-skeleton">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
        ))}
      </div>
    );
  }
  if (categories.length === 0) return null;

  if (success) {
    return (
      <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center" data-testid="service-request-success">
        <div className="w-14 h-14 mx-auto rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-emerald-700">Request received</h3>
        <p className="text-sm text-emerald-600 mt-1.5 max-w-md mx-auto">
          Our team will reach out with a detailed quote for the services you selected.
        </p>
        <button
          onClick={() => { setSuccess(false); setSelected([]); setShowRequest(false); setLocation(""); setNotes(""); setCustomer({ name: "", phone: "", email: "" }); }}
          className="mt-4 text-sm text-emerald-700 underline underline-offset-4"
        >
          Request another service
        </button>
      </div>
    );
  }

  return (
    <section className="mt-12" data-testid="service-cards-section">
      {/* Hero header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A843]/12 text-[#8a6b16] text-[10px] font-bold uppercase tracking-[0.14em] mb-3">
            <Sparkles className="w-3 h-3" /> Konekt Services
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a] leading-tight">
            {heading || "Tell us what you need — we'll quote it in hours."}
          </h2>
          <p className="text-sm md:text-base text-slate-500 mt-1.5 max-w-xl">
            {description || "Pick one or more services below. Our sales team follows up with a unified quote — including delivery, print, branding, or on-site work."}
          </p>
        </div>
        {selected.length > 0 && (
          <Button
            onClick={() => setShowRequest(true)}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl font-semibold h-11 px-5 shadow-lg shadow-slate-900/10"
            data-testid="request-services-btn"
          >
            Continue with {selected.length} service{selected.length !== 1 ? "s" : ""}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Card grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="service-cards-grid">
        {categories.map((cat) => {
          const { Icon, tone, ring } = getCategoryVisuals(cat.name);
          const isExpanded = expandedCat === cat.name;
          const subs = cat.subcategories || [];
          const selectedInCat = selected.filter((s) => s.category === cat.name).length;
          const testSlug = cat.name.replace(/\s/g, "-");

          return (
            <div
              key={cat.name}
              className={`relative rounded-2xl border bg-white overflow-hidden transition-all duration-300 ${
                isExpanded
                  ? "border-[#0f172a]/20 shadow-2xl shadow-slate-900/5 scale-[1.01]"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5"
              }`}
              data-testid={`service-card-${testSlug}`}
            >
              {/* Accent strip */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${tone}`} aria-hidden="true" />

              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat.name)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tone} flex items-center justify-center text-white shadow-md ring-4 ${ring}`}>
                    <Icon className="w-5 h-5" strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-[#0f172a] leading-tight">{cat.name}</h3>
                      {selectedInCat > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4A843]/12 text-[#8a6b16] text-[10px] font-bold" data-testid={`selected-count-${testSlug}`}>
                          {selectedInCat} selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {subs.length} {subs.length === 1 ? "service" : "services"} available
                    </p>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {cat.requires_site_visit && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 text-[10px] font-semibold">
                          <MapPin className="w-2.5 h-2.5" /> Site Visit
                        </span>
                      )}
                      {cat.fulfillment_type === "on_site" && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-semibold">On-site</span>
                      )}
                      {cat.fulfillment_type === "digital" && (
                        <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 text-[10px] font-semibold">Digital</span>
                      )}
                      {cat.fulfillment_type === "delivery_pickup" && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-semibold">Delivery/Pickup</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 bg-slate-50/40" data-testid={`service-subs-${testSlug}`}>
                  {subs.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {subs.map((sub) => {
                        const isSelected = selected.some((s) => s.key === `${cat.name}::${sub}`);
                        return (
                          <button
                            key={sub}
                            onClick={(e) => { e.stopPropagation(); toggleSub(cat.name, sub); }}
                            className={`group inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-[#0f172a] text-white shadow-md"
                                : "bg-white border border-slate-200 text-slate-700 hover:border-[#0f172a] hover:text-[#0f172a]"
                            }`}
                            data-testid={`service-sub-${sub.replace(/\s/g, "-")}`}
                          >
                            {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3 h-3" />}
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSub(cat.name, "General"); }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-[#0f172a] text-xs font-semibold transition"
                    >
                      <Send className="w-3.5 h-3.5" /> Request {cat.name} Quote
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Request form */}
      {showRequest && selected.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#D4A843]/30 bg-white p-6 shadow-xl space-y-5" data-testid="service-request-form">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#0f172a]">Send quote request</h3>
              <p className="text-xs text-slate-500 mt-0.5">{selected.length} service{selected.length !== 1 ? "s" : ""} selected — we'll respond within a business day</p>
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
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
              <label className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Site Visit Location *
              </label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter your address for the site visit…" className="mt-1.5 text-sm" data-testid="service-location" />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Additional details</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quantities, deadlines, branding notes…" className="mt-1 text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name *</label>
              <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" className="mt-1 text-sm" data-testid="service-customer-name" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone *</label>
              <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="+255 7XX…" className="mt-1 text-sm" data-testid="service-customer-phone" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Optional" className="mt-1 text-sm" />
            </div>
          </div>

          <Button onClick={submitRequest} disabled={submitting} className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold h-11 rounded-xl" data-testid="submit-service-request">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit quote request
          </Button>
        </div>
      )}
    </section>
  );
}
