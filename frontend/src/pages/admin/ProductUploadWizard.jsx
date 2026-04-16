import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Image as ImageIcon, DollarSign, Layers, BarChart3,
  CheckCircle, ArrowLeft, ArrowRight, Loader2, Upload, X, Star,
  Plus, Trash2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";
import api from "../../lib/api";

const API = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { key: "info", label: "Basic Info", icon: Package },
  { key: "images", label: "Images", icon: ImageIcon },
  { key: "pricing", label: "Pricing", icon: DollarSign },
  { key: "variants", label: "Variants", icon: Layers },
  { key: "stock", label: "Stock & Vendor", icon: BarChart3 },
  { key: "review", label: "Review", icon: CheckCircle },
];

function money(v) { return `TZS ${Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`; }

export default function ProductUploadWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({ units: [], categories: [], variant_types: [] });

  const [form, setForm] = useState({
    name: "", description: "", category: "", subcategory: "", brand: "",
    images: [], selling_price: "", original_price: "", vendor_cost: "",
    unit_of_measurement: "Piece", sku: "",
    stock: "", vendor_id: "", vendor_name: "", status: "draft",
  });
  const [variants, setVariants] = useState([]);
  const [variantTypes, setVariantTypes] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/api/vendor-ops/catalog-config").catch(() => ({ data: {} })),
      api.get("/api/vendor-ops/vendors").catch(() => ({ data: { vendors: [] } })),
    ]).then(([configRes, vendorRes]) => {
      setConfig(configRes.data || {});
      setVendors(vendorRes.data?.vendors || []);
    });
  }, []);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validateStep = () => {
    if (step === 0 && (!form.name || !form.category)) { toast.error("Name and category required"); return false; }
    if (step === 1 && form.images.length === 0) { toast.error("At least 1 image required"); return false; }
    if (step === 2 && !form.selling_price) { toast.error("Selling price required"); return false; }
    return true;
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 5)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const publish = async (status = "draft") => {
    setSaving(true);
    try {
      const imageUrls = form.images.map((img) => img.card || img.original || img.url);
      const payload = {
        ...form,
        images: imageUrls,
        selling_price: parseFloat(form.selling_price) || 0,
        original_price: parseFloat(form.original_price) || 0,
        vendor_cost: parseFloat(form.vendor_cost) || 0,
        stock: parseInt(form.stock) || 0,
        variants: variants.map((v) => ({
          attributes: v.attributes,
          stock: parseInt(v.stock) || 0,
          price_override: v.price_override ? parseFloat(v.price_override) : null,
          sku: v.sku || "",
        })),
        status,
      };
      await api.post("/api/vendor-ops/products", payload);
      toast.success(status === "active" ? "Product published!" : "Draft saved!");
      navigate("/admin/vendor-ops");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6" data-testid="product-wizard">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/vendor-ops")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-xl font-bold text-[#20364D]">New Product</h1>
          <p className="text-xs text-slate-500">Step {step + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8" data-testid="wizard-progress">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && <div className={`flex-1 h-0.5 ${step >= i ? "bg-[#D4A843]" : "bg-slate-200"}`} />}
            <button
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition ${
                step === i ? "bg-[#20364D] text-white" : step > i ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > i ? <CheckCircle className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[300px]">
        {step === 0 && <StepInfo form={form} update={update} config={config} />}
        {step === 1 && <StepImages form={form} update={update} />}
        {step === 2 && <StepPricing form={form} update={update} config={config} />}
        {step === 3 && <StepVariants variants={variants} setVariants={setVariants} variantTypes={variantTypes} setVariantTypes={setVariantTypes} config={config} />}
        {step === 4 && <StepStock form={form} update={update} vendors={vendors} variants={variants} setVariants={setVariants} />}
        {step === 5 && <StepReview form={form} variants={variants} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        {step > 0 ? <Button variant="outline" onClick={back}><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back</Button> : <div />}
        <div className="flex gap-2">
          {step === 5 ? (
            <>
              <Button variant="outline" onClick={() => publish("draft")} disabled={saving} data-testid="save-draft">Save Draft</Button>
              <Button className="bg-[#20364D] hover:bg-[#1a2d40]" onClick={() => publish("active")} disabled={saving} data-testid="publish-btn">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />} Publish
              </Button>
            </>
          ) : (
            <Button className="bg-[#20364D] hover:bg-[#1a2d40]" onClick={next} data-testid="next-step">
              Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ STEP 1: BASIC INFO ═══ */
function StepInfo({ form, update, config }) {
  const categories = (config.categories || []).filter((c) => (typeof c === "object" ? c.active !== false : true));
  // Get subcategories for selected category
  const selectedCat = categories.find((c) => (typeof c === "object" ? c.name : c) === form.category);
  const subcategories = (typeof selectedCat === "object" ? selectedCat?.subcategories : null) || [];

  return (
    <div className="space-y-5" data-testid="step-info">
      <h2 className="text-lg font-semibold text-[#20364D]">Basic Information</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div><Label className="text-xs font-semibold">Product Name *</Label><Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g., HP LaserJet Pro M404n" className="mt-1" data-testid="product-name" /></div>
        <div><Label className="text-xs font-semibold">Category *</Label>
          <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white" value={form.category} onChange={(e) => { update("category", e.target.value); update("subcategory", ""); }} data-testid="product-category">
            <option value="">Select category</option>
            {categories.map((c) => { const name = typeof c === "object" ? c.name : c; return <option key={name} value={name}>{name}</option>; })}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><Label className="text-xs font-semibold">Brand</Label><Input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="e.g., HP, Canon" className="mt-1" data-testid="product-brand" /></div>
        <div><Label className="text-xs font-semibold">Subcategory {subcategories.length > 0 ? "*" : ""}</Label>
          {subcategories.length > 0 ? (
            <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white" value={form.subcategory} onChange={(e) => update("subcategory", e.target.value)} data-testid="product-subcategory">
              <option value="">Select subcategory</option>
              {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="__request_new__">+ Request new subcategory</option>
            </select>
          ) : (
            <Input value={form.subcategory} onChange={(e) => update("subcategory", e.target.value)} placeholder="No subcategories configured for this category" className="mt-1 bg-slate-50" data-testid="product-subcategory" disabled={!form.category} />
          )}
          {form.subcategory === "__request_new__" && (
            <Input value={form.requested_subcategory || ""} onChange={(e) => update("requested_subcategory", e.target.value)} placeholder="Enter requested subcategory name..." className="mt-1 border-amber-300 bg-amber-50" data-testid="request-subcategory-input" />
          )}
        </div>
      </div>
      <div><Label className="text-xs font-semibold">Description</Label><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Product description..." className="mt-1 min-h-[100px]" data-testid="product-description" /></div>
    </div>
  );
}

/* ═══ STEP 2: IMAGES ═══ */
function StepImages({ form, update }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("crop_x", "0");
      formData.append("crop_y", "0");
      formData.append("crop_width", "0");
      formData.append("crop_height", "0");
      const res = await api.post("/api/vendor-ops/images/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const data = res.data;
      const newImg = {
        id: data.image_id,
        original: data.original,
        card: data.variants?.card || "",
        thumbnail: data.variants?.thumbnail || "",
        detail: data.variants?.detail || "",
        url: data.variants?.card || data.original,
      };
      update("images", [...form.images, newImg]);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    }
    setUploading(false);
  };

  const handleFiles = (files) => {
    if (form.images.length >= 5) { toast.error("Maximum 5 images"); return; }
    Array.from(files).slice(0, 5 - form.images.length).forEach(uploadImage);
  };

  const removeImage = (idx) => update("images", form.images.filter((_, i) => i !== idx));
  const setPrimary = (idx) => {
    const imgs = [...form.images];
    const [item] = imgs.splice(idx, 1);
    imgs.unshift(item);
    update("images", imgs);
  };

  return (
    <div className="space-y-4" data-testid="step-images">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#20364D]">Product Images</h2>
        <span className="text-xs text-slate-400">{form.images.length}/5 images</span>
      </div>

      {/* Upload Zone */}
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#D4A843] transition"
        onClick={() => fileRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        data-testid="image-drop-zone"
      >
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        {uploading ? (
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A843] mx-auto" />
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Click or drag images here</p>
            <p className="text-[10px] text-slate-400 mt-1">JPG, PNG. Max 10MB. Auto-converted to WebP.</p>
          </>
        )}
      </div>

      {/* Image Grid */}
      {form.images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3" data-testid="image-grid">
          {form.images.map((img, i) => (
            <div key={img.id || i} className={`relative rounded-xl border-2 overflow-hidden group ${i === 0 ? "border-[#D4A843]" : "border-slate-100"}`}>
              <img src={`${API}${img.card || img.url}`} alt="" className="w-full aspect-square object-cover" />
              {i === 0 && (
                <div className="absolute top-1 left-1 bg-[#D4A843] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="w-2 h-2" /> Primary
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                {i !== 0 && (
                  <button onClick={() => setPrimary(i)} className="p-1.5 bg-white rounded-lg text-[#D4A843]" title="Set as primary"><Star className="w-3.5 h-3.5" /></button>
                )}
                <button onClick={() => removeImage(i)} className="p-1.5 bg-white rounded-lg text-red-500" title="Remove"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {form.images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-2" data-testid="image-preview">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Card Preview (600px)</p>
            <img src={`${API}${form.images[0].card || form.images[0].url}`} alt="" className="w-32 h-32 object-cover rounded-lg mx-auto" />
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Detail Preview (1200px)</p>
            <img src={`${API}${form.images[0].detail || form.images[0].url}`} alt="" className="w-32 h-32 object-cover rounded-lg mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ STEP 3: PRICING ═══ */
function StepPricing({ form, update, config }) {
  const units = config.units || [];
  return (
    <div className="space-y-5" data-testid="step-pricing">
      <h2 className="text-lg font-semibold text-[#20364D]">Pricing & Unit</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div><Label className="text-xs font-semibold">Selling Price (TZS) *</Label><Input type="number" value={form.selling_price} onChange={(e) => update("selling_price", e.target.value)} placeholder="0" className="mt-1" data-testid="selling-price" /></div>
        <div><Label className="text-xs font-semibold">Original Price (TZS)</Label><Input type="number" value={form.original_price} onChange={(e) => update("original_price", e.target.value)} placeholder="0" className="mt-1" data-testid="original-price" /></div>
        <div><Label className="text-xs font-semibold">Vendor Cost (TZS)</Label><Input type="number" value={form.vendor_cost} onChange={(e) => update("vendor_cost", e.target.value)} placeholder="0" className="mt-1" data-testid="vendor-cost" /></div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold">Unit of Measurement *</Label>
          <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white" value={form.unit_of_measurement} onChange={(e) => update("unit_of_measurement", e.target.value)} data-testid="unit-select">
            {units.map((u) => <option key={u.name} value={u.name}>{u.name} ({u.abbr})</option>)}
            {units.length === 0 && <option value="Piece">Piece (pcs)</option>}
          </select>
        </div>
        <div><Label className="text-xs font-semibold">SKU</Label><Input value={form.sku} onChange={(e) => update("sku", e.target.value)} placeholder="Auto-generated if empty" className="mt-1" data-testid="product-sku" /></div>
      </div>
      {form.selling_price && form.vendor_cost && parseFloat(form.vendor_cost) > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700" data-testid="margin-preview">
          Margin: <strong>{money(parseFloat(form.selling_price) - parseFloat(form.vendor_cost))}</strong> ({((1 - parseFloat(form.vendor_cost) / parseFloat(form.selling_price)) * 100).toFixed(1)}%)
        </div>
      )}
      {form.selling_price && form.original_price && parseFloat(form.original_price) > parseFloat(form.selling_price) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700" data-testid="savings-preview">
          Customer saves: <strong>{money(parseFloat(form.original_price) - parseFloat(form.selling_price))}</strong>
        </div>
      )}
    </div>
  );
}

/* ═══ STEP 4: VARIANTS ═══ */
function StepVariants({ variants, setVariants, variantTypes, setVariantTypes, config }) {
  const availableTypes = config.variant_types || ["Size", "Color", "Material"];
  const [hasVariants, setHasVariants] = useState(variantTypes.length > 0);

  const addType = () => {
    if (variantTypes.length >= 2) { toast.error("Maximum 2 variant dimensions"); return; }
    const unused = availableTypes.find((t) => !variantTypes.find((vt) => vt.name === t));
    if (unused) setVariantTypes([...variantTypes, { name: unused, values: [] }]);
  };

  const updateTypeValues = (idx, values) => {
    const updated = [...variantTypes];
    updated[idx] = { ...updated[idx], values };
    setVariantTypes(updated);
    regenerateVariants(updated);
  };

  const removeType = (idx) => {
    const updated = variantTypes.filter((_, i) => i !== idx);
    setVariantTypes(updated);
    regenerateVariants(updated);
  };

  const regenerateVariants = (types) => {
    if (types.length === 0) { setVariants([]); return; }
    const combos = [];
    const t1 = types[0];
    const t2 = types[1];
    for (const v1 of (t1?.values || [])) {
      if (t2 && t2.values.length > 0) {
        for (const v2 of t2.values) {
          combos.push({ attributes: { [t1.name]: v1, [t2.name]: v2 }, stock: 0, price_override: "", sku: "" });
        }
      } else {
        combos.push({ attributes: { [t1.name]: v1 }, stock: 0, price_override: "", sku: "" });
      }
    }
    setVariants(combos);
  };

  return (
    <div className="space-y-4" data-testid="step-variants">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#20364D]">Variants</h2>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={hasVariants} onChange={(e) => { setHasVariants(e.target.checked); if (!e.target.checked) { setVariantTypes([]); setVariants([]); } }} />
          This product has variants
        </label>
      </div>

      {!hasVariants ? (
        <div className="text-center py-8 text-slate-400 text-sm">No variants needed for this product.</div>
      ) : (
        <div className="space-y-4">
          {variantTypes.map((vt, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4" data-testid={`variant-type-${i}`}>
              <div className="flex items-center justify-between mb-2">
                <select className="border rounded-lg px-2 py-1 text-sm" value={vt.name} onChange={(e) => {
                  const updated = [...variantTypes]; updated[i] = { ...updated[i], name: e.target.value }; setVariantTypes(updated);
                }}>
                  {availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={() => removeType(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vt.values.map((val, vi) => (
                  <span key={vi} className="bg-white border rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                    {val} <button onClick={() => updateTypeValues(i, vt.values.filter((_, j) => j !== vi))} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <input
                  className="border rounded-lg px-2 py-1 text-xs w-20"
                  placeholder="Add..."
                  onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { updateTypeValues(i, [...vt.values, e.target.value.trim()]); e.target.value = ""; } }}
                />
              </div>
            </div>
          ))}
          {variantTypes.length < 2 && (
            <Button variant="outline" size="sm" onClick={addType} data-testid="add-variant-type"><Plus className="w-3.5 h-3.5 mr-1" /> Add Variant Type</Button>
          )}

          {/* Generated Combinations */}
          {variants.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{variants.length} Combinations</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white border rounded-lg p-2" data-testid={`variant-row-${i}`}>
                    <span className="text-xs font-medium text-[#20364D] min-w-[120px]">
                      {Object.values(v.attributes).join(" / ")}
                    </span>
                    <Input type="number" placeholder="Stock" className="h-8 w-20 text-xs" value={v.stock}
                      onChange={(e) => { const upd = [...variants]; upd[i] = { ...upd[i], stock: e.target.value }; setVariants(upd); }} />
                    <Input type="number" placeholder="Price override" className="h-8 w-28 text-xs" value={v.price_override}
                      onChange={(e) => { const upd = [...variants]; upd[i] = { ...upd[i], price_override: e.target.value }; setVariants(upd); }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ STEP 5: STOCK & VENDOR ═══ */
function StepStock({ form, update, vendors, variants, setVariants }) {
  return (
    <div className="space-y-5" data-testid="step-stock">
      <h2 className="text-lg font-semibold text-[#20364D]">Stock & Vendor Assignment</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          {variants.length === 0 && (
            <div>
              <Label className="text-xs font-semibold">Total Stock *</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="number" value={form.stock} onChange={(e) => update("stock", e.target.value)} placeholder="0" className="w-40" data-testid="total-stock" />
                <span className="text-xs text-slate-400">{form.unit_of_measurement}s</span>
              </div>
            </div>
          )}
          {variants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Stock per Variant ({form.unit_of_measurement})</p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg p-2">
                    <span className="text-xs font-medium min-w-[120px]">{Object.values(v.attributes).join(" / ")}</span>
                    <Input type="number" placeholder="Stock" className="h-8 w-24 text-xs" value={v.stock}
                      onChange={(e) => { const upd = [...variants]; upd[i] = { ...upd[i], stock: e.target.value }; setVariants(upd); }} />
                    <span className="text-[10px] text-slate-400">{form.unit_of_measurement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs font-semibold">Assign to Vendor</Label>
          <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white" value={form.vendor_id} onChange={(e) => {
            const v = vendors.find((vn) => (vn.id || vn._id) === e.target.value);
            update("vendor_id", e.target.value);
            update("vendor_name", v?.company_name || v?.name || "");
          }} data-testid="vendor-select">
            <option value="">Select vendor (optional)</option>
            {vendors.map((v) => <option key={v.id || v._id} value={v.id || v._id}>{v.company_name || v.name || v.full_name || "Unnamed"}</option>)}
          </select>
          <p className="text-[10px] text-slate-400 mt-2">Vendor assignment controls which vendor fulfills this product. Leave empty if no vendor is assigned yet.</p>
        </div>
      </div>
    </div>
  );
}

/* ═══ STEP 6: REVIEW ═══ */
function StepReview({ form, variants }) {
  return (
    <div className="space-y-5" data-testid="step-review">
      <h2 className="text-lg font-semibold text-[#20364D]">Review & Publish</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Product</p>
          <p className="text-base font-bold text-[#20364D]">{form.name || "Unnamed"}</p>
          <p className="text-xs text-slate-500">{form.category} {form.brand ? `\u2022 ${form.brand}` : ""}</p>
          {form.description && <p className="text-xs text-slate-400 line-clamp-2">{form.description}</p>}
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Pricing</p>
          <p className="text-base font-bold text-[#20364D]">{money(form.selling_price)}</p>
          {form.original_price && <p className="text-xs text-slate-400 line-through">{money(form.original_price)}</p>}
          <p className="text-xs text-slate-500">Unit: {form.unit_of_measurement}</p>
          {form.vendor_cost > 0 && <p className="text-xs text-slate-400">Vendor cost: {money(form.vendor_cost)}</p>}
        </div>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Stock & Vendor</p>
          {variants.length === 0 && <p className="text-base font-bold text-[#20364D]">{form.stock || 0} {form.unit_of_measurement}s</p>}
          {variants.length > 0 && <p className="text-base font-bold text-[#20364D]">{variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)} total across {variants.length} variants</p>}
          {form.vendor_name && <p className="text-xs text-slate-500">Vendor: {form.vendor_name}</p>}
          {!form.vendor_name && <p className="text-xs text-slate-400">No vendor assigned</p>}
        </div>
      </div>
      {form.images.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Images ({form.images.length})</p>
          <div className="flex gap-2">
            {form.images.map((img, i) => (
              <img key={i} src={`${process.env.REACT_APP_BACKEND_URL}${img.thumbnail || img.card || img.url}`} alt="" className="w-16 h-16 rounded-lg object-cover border" loading="lazy" />
            ))}
          </div>
        </div>
      )}
      {variants.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Variants ({variants.length})</p>
          <div className="grid md:grid-cols-2 gap-1">
            {variants.slice(0, 12).map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                <span className="font-medium">{Object.values(v.attributes).join(" / ")}</span>
                <span className="text-slate-400 ml-auto">Stock: {v.stock || 0}</span>
                {v.price_override && <span className="text-slate-400">{money(v.price_override)}</span>}
              </div>
            ))}
            {variants.length > 12 && <p className="text-xs text-slate-400 col-span-2">+{variants.length - 12} more</p>}
          </div>
        </div>
      )}
    </div>
  );
}
