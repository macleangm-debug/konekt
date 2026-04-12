import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, ArrowLeft, Upload, X, Image, FileText, Plus, 
  Package, Wrench, AlertCircle, Check 
} from "lucide-react";
import partnerApi from "../../lib/partnerApi";
import { useCanonicalCategories } from "../../lib/useCanonicalCategories";

const LISTING_TYPES = [
  { value: "product", label: "Product", icon: Package },
  { value: "service", label: "Service", icon: Wrench },
];

const PRODUCT_FAMILIES = [
  { value: "promotional", label: "Promotional Products" },
  { value: "office_equipment", label: "Office Equipment" },
  { value: "stationery", label: "Stationery" },
  { value: "consumables", label: "Consumables" },
  { value: "spare_parts", label: "Spare Parts" },
];

const SERVICE_FAMILIES = [
  { value: "printing", label: "Printing Services" },
  { value: "creative", label: "Creative Services" },
  { value: "maintenance", label: "Maintenance Services" },
  { value: "branding", label: "Branding Services" },
  { value: "installation", label: "Installation Services" },
];

const STATUS_OPTIONS = [
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export default function PartnerListingEditorPage() {
  const navigate = useNavigate();
  const { listingId } = useParams();
  const isEditing = !!listingId;
  const { categories: canonicalCats, subcategoriesFor } = useCanonicalCategories();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  
  const [form, setForm] = useState({
    listing_type: "product",
    product_family: "",
    service_family: "",
    sku: "",
    slug: "",
    name: "",
    short_description: "",
    description: "",
    category: "",
    subcategory: "",
    brand: "",
    base_partner_price: "",
    partner_available_qty: "",
    partner_status: "in_stock",
    lead_time_days: "2",
    images: [],
    documents: [],
  });

  const [errors, setErrors] = useState({});

  // Fetch listing if editing
  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      partnerApi.get(`/api/partner-listings/${listingId}`)
        .then(res => {
          const data = res.data;
          setForm({
            listing_type: data.listing_type || "product",
            product_family: data.product_family || "",
            service_family: data.service_family || "",
            sku: data.sku || "",
            slug: data.slug || "",
            name: data.name || "",
            short_description: data.short_description || "",
            description: data.description || "",
            category: data.category || "",
            subcategory: data.subcategory || "",
            brand: data.brand || "",
            base_partner_price: data.base_partner_price?.toString() || "",
            partner_available_qty: data.partner_available_qty?.toString() || "",
            partner_status: data.partner_status || "in_stock",
            lead_time_days: data.lead_time_days?.toString() || "2",
            images: data.images || [],
            documents: data.documents || [],
          });
        })
        .catch(err => {
          alert("Failed to load listing");
          navigate("/partner/catalog");
        })
        .finally(() => setLoading(false));
    }
  }, [listingId, isEditing, navigate]);

  const generateSlug = useCallback((name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate slug from name
      if (field === "name" && !isEditing) {
        updated.slug = generateSlug(value);
      }
      
      return updated;
    });
    
    // Clear error for field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const uploadImages = async (files) => {
    if (!files.length) return;
    
    setUploadingImages(true);
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("kind", "image");
    
    try {
      const res = await partnerApi.post("/api/media-upload/listing-media/multiple", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const newUrls = res.data.uploaded.map(u => u.url);
      setForm(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
      
      if (res.data.errors?.length > 0) {
        alert(`Some images failed to upload: ${res.data.errors.map(e => e.error).join(", ")}`);
      }
    } catch (err) {
      alert("Failed to upload images");
    } finally {
      setUploadingImages(false);
    }
  };

  const uploadDocuments = async (files) => {
    if (!files.length) return;
    
    setUploadingDocs(true);
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("kind", "document");
    
    try {
      const res = await partnerApi.post("/api/media-upload/listing-media/multiple", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const newUrls = res.data.uploaded.map(u => u.url);
      setForm(prev => ({ ...prev, documents: [...prev.documents, ...newUrls] }));
      
      if (res.data.errors?.length > 0) {
        alert(`Some documents failed to upload: ${res.data.errors.map(e => e.error).join(", ")}`);
      }
    } catch (err) {
      alert("Failed to upload documents");
    } finally {
      setUploadingDocs(false);
    }
  };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const removeDocument = (index) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!form.sku.trim()) newErrors.sku = "SKU is required";
    if (!form.slug.trim()) newErrors.slug = "Slug is required";
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.category.trim()) newErrors.category = "Category is required";
    
    if (form.listing_type === "product" && !form.product_family) {
      newErrors.product_family = "Product family is required for products";
    }
    if (form.listing_type === "service" && !form.service_family) {
      newErrors.service_family = "Service family is required for services";
    }
    
    if (!form.base_partner_price || parseFloat(form.base_partner_price) < 0) {
      newErrors.base_partner_price = "Valid price is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    
    const payload = {
      ...form,
      base_partner_price: parseFloat(form.base_partner_price) || 0,
      partner_available_qty: parseFloat(form.partner_available_qty) || 0,
      lead_time_days: parseInt(form.lead_time_days) || 2,
    };
    
    try {
      if (isEditing) {
        await partnerApi.put(`/api/partner-listings/${listingId}`, payload);
      } else {
        await partnerApi.post("/api/partner-listings", payload);
      }
      navigate("/partner/catalog");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#20364D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="partner-listing-editor-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/partner/catalog")}
          className="p-2 hover:bg-white rounded-xl transition"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#20364D]">
            {isEditing ? "Edit Listing" : "Create New Listing"}
          </h1>
          <p className="text-slate-600">
            {isEditing ? "Update your listing details" : "Add a new product or service to your catalog"}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Listing Type */}
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-bold mb-4">Listing Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {LISTING_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleChange("listing_type", type.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                      form.listing_type === type.value
                        ? "border-[#20364D] bg-[#20364D]/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    data-testid={`type-${type.value}`}
                  >
                    <Icon className={`w-5 h-5 ${form.listing_type === type.value ? "text-[#20364D]" : "text-slate-400"}`} />
                    <span className={form.listing_type === type.value ? "font-semibold text-[#20364D]" : "text-slate-600"}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Family Selection */}
            <div className="mt-4">
              {form.listing_type === "product" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Family <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.product_family}
                    onChange={(e) => handleChange("product_family", e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 ${errors.product_family ? "border-red-500" : ""}`}
                    data-testid="product-family-select"
                  >
                    <option value="">Select a product family</option>
                    {PRODUCT_FAMILIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  {errors.product_family && <p className="text-red-500 text-sm mt-1">{errors.product_family}</p>}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Service Family <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.service_family}
                    onChange={(e) => handleChange("service_family", e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 ${errors.service_family ? "border-red-500" : ""}`}
                    data-testid="service-family-select"
                  >
                    <option value="">Select a service family</option>
                    {SERVICE_FAMILIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  {errors.service_family && <p className="text-red-500 text-sm mt-1">{errors.service_family}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-2xl border bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold">Basic Information</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => handleChange("sku", e.target.value.toUpperCase())}
                  placeholder="e.g., PROMO-MUG-001"
                  className={`w-full border rounded-xl px-4 py-3 ${errors.sku ? "border-red-500" : ""}`}
                  data-testid="sku-input"
                />
                {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => handleChange("slug", e.target.value.toLowerCase().replace(/\s/g, "-"))}
                  placeholder="e.g., branded-white-mug"
                  className={`w-full border rounded-xl px-4 py-3 ${errors.slug ? "border-red-500" : ""}`}
                  data-testid="slug-input"
                />
                {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Branded White Ceramic Mug"
                className={`w-full border rounded-xl px-4 py-3 ${errors.name ? "border-red-500" : ""}`}
                data-testid="name-input"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Short Description
              </label>
              <input
                type="text"
                value={form.short_description}
                onChange={(e) => handleChange("short_description", e.target.value)}
                placeholder="Brief 1-line description (50-100 chars)"
                maxLength={150}
                className="w-full border rounded-xl px-4 py-3"
                data-testid="short-desc-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Detailed description of your product or service..."
                rows={4}
                className="w-full border rounded-xl px-4 py-3"
                data-testid="description-input"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => { handleChange("category", e.target.value); handleChange("subcategory", ""); }}
                  className={`w-full border rounded-xl px-4 py-3 ${errors.category ? "border-red-500" : ""}`}
                  data-testid="category-input"
                >
                  <option value="">Select category</option>
                  {canonicalCats.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subcategory</label>
                <select
                  value={form.subcategory}
                  onChange={(e) => handleChange("subcategory", e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  data-testid="subcategory-input"
                >
                  <option value="">Select subcategory</option>
                  {subcategoriesFor(form.category).map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Brand</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  placeholder="Your brand name"
                  className="w-full border rounded-xl px-4 py-3"
                  data-testid="brand-input"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Availability */}
          <div className="rounded-2xl border bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold">Pricing & Availability</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Price (TZS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.base_partner_price}
                  onChange={(e) => handleChange("base_partner_price", e.target.value)}
                  placeholder="0"
                  min="0"
                  className={`w-full border rounded-xl px-4 py-3 ${errors.base_partner_price ? "border-red-500" : ""}`}
                  data-testid="price-input"
                />
                {errors.base_partner_price && <p className="text-red-500 text-sm mt-1">{errors.base_partner_price}</p>}
                <p className="text-xs text-slate-500 mt-1">This is your price to us. Customer price is set by admin.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Available Quantity
                </label>
                <input
                  type="number"
                  value={form.partner_available_qty}
                  onChange={(e) => handleChange("partner_available_qty", e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full border rounded-xl px-4 py-3"
                  data-testid="qty-input"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Stock Status</label>
                <select
                  value={form.partner_status}
                  onChange={(e) => handleChange("partner_status", e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                  data-testid="status-select"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lead Time (Days)</label>
                <input
                  type="number"
                  value={form.lead_time_days}
                  onChange={(e) => handleChange("lead_time_days", e.target.value)}
                  placeholder="2"
                  min="1"
                  className="w-full border rounded-xl px-4 py-3"
                  data-testid="lead-time-input"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl border bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold">Images</h2>
            <p className="text-sm text-slate-500">Upload product/service images (JPG, PNG, WebP)</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {form.images.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={url}
                    alt={`Image ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-xl border"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    data-testid={`remove-image-${idx}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      Hero
                    </span>
                  )}
                </div>
              ))}
              
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer hover:border-[#20364D] transition">
                {uploadingImages ? (
                  <div className="w-6 h-6 border-2 border-[#20364D] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Image className="w-6 h-6 text-slate-400" />
                    <span className="text-xs text-slate-500 mt-1">Add Image</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadImages(Array.from(e.target.files || []))}
                  disabled={uploadingImages}
                  data-testid="image-upload-input"
                />
              </label>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold">Documents</h2>
            <p className="text-sm text-slate-500">Upload spec sheets, catalogs, or certificates (PDF, DOC)</p>
            
            <div className="space-y-2">
              {form.documents.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-sm truncate max-w-[200px]">{url.split('/').pop()}</span>
                  </div>
                  <button
                    onClick={() => removeDocument(idx)}
                    className="text-red-500 hover:text-red-700"
                    data-testid={`remove-doc-${idx}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3 cursor-pointer hover:border-[#20364D] transition">
                {uploadingDocs ? (
                  <div className="w-5 h-5 border-2 border-[#20364D] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-500">Add Document</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadDocuments(Array.from(e.target.files || []))}
                  disabled={uploadingDocs}
                  data-testid="doc-upload-input"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Save Card */}
          <div className="rounded-2xl border bg-white p-6 space-y-4 sticky top-6">
            <h3 className="font-bold">Save & Submit</h3>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Listings are submitted for review before publishing.
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#20364D] text-white rounded-xl py-3 font-semibold hover:bg-[#2a4a68] disabled:opacity-50 transition"
              data-testid="save-btn"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {isEditing ? "Update Listing" : "Submit for Review"}
                </>
              )}
            </button>
            
            <button
              onClick={() => navigate("/partner/catalog")}
              className="w-full border rounded-xl py-3 font-semibold hover:bg-slate-50 transition"
              data-testid="cancel-btn"
            >
              Cancel
            </button>
          </div>

          {/* Status Info */}
          {isEditing && (
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="font-bold mb-3">Listing Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium">Submitted</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU</span>
                  <span className="font-mono">{form.sku}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
