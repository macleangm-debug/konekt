import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, MapPin, Send, Loader2, CheckCircle, Plus, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * ServiceCardsSection — Collapsible service category cards for marketplace.
 * Shows all service categories from Settings Hub with subcategories.
 * Users can select multiple services, enter location if site visit needed, and request quote.
 */
export default function ServiceCardsSection() {
  const navigate = useNavigate();
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
        site_visit_optional: cat?.site_visit_optional || false,
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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>;
  if (categories.length === 0) return null;

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center" data-testid="service-request-success">
        <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
        <h3 className="text-lg font-bold text-emerald-700">Request Received!</h3>
        <p className="text-sm text-emerald-600 mt-1">Our team will contact you shortly with a quote for your selected services.</p>
        <button onClick={() => { setSuccess(false); setSelected([]); setShowRequest(false); setLocation(""); setNotes(""); }} className="text-sm text-emerald-600 underline mt-3">Request another service</button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="service-cards-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#20364D]">Services</h2>
          <p className="text-sm text-slate-500">Select services you need — we'll get you a quote</p>
        </div>
        {selected.length > 0 && (
          <Button onClick={() => setShowRequest(true)} className="bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C]" data-testid="request-services-btn">
            Request Quote ({selected.length} service{selected.length !== 1 ? "s" : ""})
          </Button>
        )}
      </div>

      {/* Service Category Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-enter" data-testid="service-cards-grid">
        {categories.map((cat) => {
          const isExpanded = expandedCat === cat.name;
          const subs = cat.subcategories || [];
          const selectedInCat = selected.filter((s) => s.category === cat.name).length;
          const iconMap = {
            "Printing & Branding": "🖨️",
            "Creative & Design": "🎨",
            "Facilities Services": "🧹",
            "Technical Support": "🔧",
            "Office Branding": "🏢",
            "Uniforms & Workwear": "👔",
          };

          return (
            <div key={cat.name} className={`rounded-xl border transition overflow-hidden card-lift ${isExpanded ? "border-[#D4A843]/40 shadow-md" : "hover:shadow-sm"}`} data-testid={`service-card-${cat.name.replace(/\s/g, "-")}`}>
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat.name)}
                className="w-full p-4 text-left flex items-center gap-3 bg-white hover:bg-slate-50/50 transition"
              >
                <span className="text-2xl">{iconMap[cat.name] || "📋"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#20364D]">{cat.name}</h3>
                    {selectedInCat > 0 && <Badge className="bg-[#D4A843] text-[#17283C] text-[9px]">{selectedInCat} selected</Badge>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{subs.length} service{subs.length !== 1 ? "s" : ""} available</p>
                  <div className="flex gap-1 mt-1">
                    {cat.requires_site_visit && <Badge className="text-[8px] bg-orange-50 text-orange-600">Site Visit</Badge>}
                    {cat.fulfillment_type === "on_site" && <Badge className="text-[8px] bg-blue-50 text-blue-600">On-site</Badge>}
                    {cat.fulfillment_type === "digital" && <Badge className="text-[8px] bg-violet-50 text-violet-600">Digital</Badge>}
                    {cat.fulfillment_type === "delivery_pickup" && <Badge className="text-[8px] bg-emerald-50 text-emerald-600">Delivery/Pickup</Badge>}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {isExpanded && subs.length > 0 && (
                <div className="border-t bg-slate-50/50 p-3 space-y-1" data-testid={`service-subs-${cat.name.replace(/\s/g, "-")}`}>
                  {subs.map((sub) => {
                    const isSelected = selected.some((s) => s.key === `${cat.name}::${sub}`);
                    return (
                      <button
                        key={sub}
                        onClick={() => toggleSub(cat.name, sub)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between ${isSelected ? "bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#20364D] font-medium" : "hover:bg-white border border-transparent text-slate-600"}`}
                        data-testid={`service-sub-${sub.replace(/\s/g, "-")}`}
                      >
                        <span>{sub}</span>
                        {isSelected ? <CheckCircle className="w-4 h-4 text-[#D4A843]" /> : <Plus className="w-3.5 h-3.5 text-slate-300" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {isExpanded && subs.length === 0 && (
                <div className="border-t bg-slate-50/50 p-4 text-center" data-testid={`service-empty-${cat.name.replace(/\s/g, "-")}`}>
                  <p className="text-xs text-slate-500 mb-2">No specific sub-services listed yet</p>
                  <button
                    onClick={() => toggleSub(cat.name, "General")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${selected.some((s) => s.key === `${cat.name}::General`) ? "bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#20364D]" : "bg-white border text-slate-600 hover:border-[#D4A843]/30"}`}
                  >
                    <Send className="w-3.5 h-3.5" /> Request {cat.name} Quote
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Request Form Modal */}
      {showRequest && selected.length > 0 && (
        <div className="rounded-xl border border-[#D4A843]/30 bg-white p-5 shadow-lg space-y-4" data-testid="service-request-form">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#20364D]">Request Quote for {selected.length} Service{selected.length !== 1 ? "s" : ""}</h3>
            <button onClick={() => setShowRequest(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>

          {/* Selected services summary */}
          <div className="space-y-1">
            {selected.map((s) => (
              <div key={s.key} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                <span>{s.category} — {s.subcategory}</span>
                <button onClick={() => setSelected(selected.filter((x) => x.key !== s.key))} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          {/* Site visit location */}
          {needsSiteVisit && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <label className="text-xs font-semibold text-orange-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Site Visit Location *</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter your address for site visit..." className="mt-1 text-sm" data-testid="service-location" />
              <p className="text-[10px] text-orange-600 mt-1">Some services require an on-site assessment. A site visit quote will be sent first.</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Additional Details</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requirements, sizes, quantities..." className="mt-0.5 text-sm" />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-[10px] font-semibold text-slate-500 uppercase">Name *</label><Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" className="mt-0.5 text-sm" data-testid="service-customer-name" /></div>
            <div><label className="text-[10px] font-semibold text-slate-500 uppercase">Phone *</label><Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="+255 7XX..." className="mt-0.5 text-sm" data-testid="service-customer-phone" /></div>
            <div><label className="text-[10px] font-semibold text-slate-500 uppercase">Email</label><Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Optional" className="mt-0.5 text-sm" /></div>
          </div>

          <Button onClick={submitRequest} disabled={submitting} className="w-full bg-[#D4A843] hover:bg-[#c49a3d] text-[#17283C] font-semibold py-3" data-testid="submit-service-request">
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Request Quote
          </Button>
        </div>
      )}
    </div>
  );
}
