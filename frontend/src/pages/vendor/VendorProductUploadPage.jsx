import React, { useEffect, useState, useCallback, useRef } from "react";
import { Package, Plus, X, Loader2, CheckCircle2, AlertCircle, Upload, Trash2, Image as ImageIcon, GripVertical } from "lucide-react";
import api from "@/lib/api";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

function authHeaders() {
  const token = localStorage.getItem("partner_token") || localStorage.getItem("konekt_token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

function ImageThumb({ src, onRemove, isPrimary }) {
  const url = src.startsWith("http") ? src : `${API_BASE}/api/files/serve/${src}`;
  return (
    <div className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200 flex-shrink-0" data-testid="image-thumb">
      <img src={url} alt="product" className="w-full h-full object-cover" onError={e => { e.target.src = ""; e.target.className = "hidden"; }} />
      {isPrimary && <span className="absolute top-0.5 left-0.5 bg-[#20364D] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">PRIMARY</span>}
      <button type="button" onClick={onRemove}
        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
        data-testid="remove-image-thumb">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function VendorProductUploadPage() {
  const [taxonomy, setTaxonomy] = useState({ groups: [], categories: [], subcategories: [] });
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  const [product, setProduct] = useState({
    product_name: "", brand: "", short_description: "", full_description: "",
  });
  // Images now stored as storage paths (from /api/files/upload)
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const [supply, setSupply] = useState({
    base_price_vat_inclusive: "", lead_time_days: "", supply_mode: "in_stock",
    default_quantity: "1", vendor_product_code: "", allocated_quantity: "",
  });
  const [variants, setVariants] = useState([]);

  const loadTaxonomy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/vendor/products/taxonomy", { headers: authHeaders() });
      const data = res.data || {};
      if (data.blocked) {
        setBlocked(true);
        setBlockReason(data.reason || "You are not authorized to upload products.");
      } else {
        setTaxonomy(data);
      }
    } catch (err) {
      setError("Failed to load taxonomy");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTaxonomy(); }, [loadTaxonomy]);

  const filteredCategories = taxonomy.categories.filter(c => !selectedGroupId || c.group_id === selectedGroupId);
  const filteredSubcategories = taxonomy.subcategories.filter(s => s.category_id === selectedCategoryId);

  const onGroupChange = (gid) => {
    setSelectedGroupId(gid);
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
  };

  // ── File Upload Logic ──
  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    const remaining = 10 - uploadedImages.length;
    if (remaining <= 0) { setUploadError("Maximum 10 images allowed"); return; }

    const toUpload = Array.from(files).slice(0, remaining);
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    setUploadError("");
    setUploading(true);

    for (const file of toUpload) {
      if (!allowed.includes(file.type)) {
        setUploadError(`"${file.name}" is not a supported image type. Use JPEG, PNG, GIF, or WebP.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds 10MB limit.`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "products");
        const res = await api.post("/api/files/upload", formData, {
          headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
        });
        if (res.data?.storage_path) {
          setUploadedImages(prev => [...prev, {
            storage_path: res.data.storage_path,
            original_filename: res.data.original_filename,
            file_id: res.data.file_id,
          }]);
        }
      } catch (err) {
        setUploadError(`Failed to upload "${file.name}": ${err.response?.data?.detail || err.message}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUploadedImage = (idx) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  // ── Variants ──
  const addVariant = () => {
    setVariants([...variants, { sku: "", size: "", color: "", model: "", quantity: 0, price_override: "", image_url: "" }]);
  };
  const updateVariant = (idx, field, val) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [field]: val };
    setVariants(updated);
  };
  const removeVariant = (idx) => { setVariants(variants.filter((_, i) => i !== idx)); };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!product.product_name.trim()) { setError("Product name is required"); return; }
    if (!selectedCategoryId) { setError("Category is required"); return; }
    const price = parseFloat(supply.base_price_vat_inclusive);
    if (!price || price <= 0) { setError("Base price must be greater than 0"); return; }

    const allocQty = parseInt(supply.allocated_quantity) || 0;
    if (allocQty < 0) { setError("Allocated quantity cannot be negative"); return; }

    setSubmitting(true);
    try {
      const imagePaths = uploadedImages.map(img => img.storage_path);
      const payload = {
        product: {
          product_name: product.product_name,
          brand: product.brand,
          group_id: selectedGroupId || undefined,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubcategoryId || undefined,
          short_description: product.short_description,
          full_description: product.full_description,
          images: imagePaths,
        },
        supply: {
          base_price_vat_inclusive: price,
          lead_time_days: parseInt(supply.lead_time_days) || 0,
          supply_mode: supply.supply_mode,
          default_quantity: parseInt(supply.default_quantity) || 1,
          vendor_product_code: supply.vendor_product_code,
          allocated_quantity: allocQty,
        },
        variants: variants.map(v => ({
          sku: v.sku, size: v.size || undefined, color: v.color || undefined,
          model: v.model || undefined, quantity: parseInt(v.quantity) || 0,
          price_override: v.price_override ? parseFloat(v.price_override) : undefined,
          image_url: v.image_url || undefined,
        })),
      };
      await api.post("/api/vendor/products/upload", payload, { headers: authHeaders() });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    }
    setSubmitting(false);
  };

  // ── Render States ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="upload-loading">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12" data-testid="upload-blocked">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-amber-800">Product Upload Not Available</h2>
          <p className="text-sm text-amber-700 mt-2">{blockReason}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12" data-testid="upload-success">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-green-800">Product Submitted for Review</h2>
          <p className="text-sm text-green-700 mt-2">Your product has been submitted and is pending admin review.</p>
          <button onClick={() => { setSubmitted(false); setProduct({ product_name: "", brand: "", short_description: "", full_description: "" }); setUploadedImages([]); setSupply({ base_price_vat_inclusive: "", lead_time_days: "", supply_mode: "in_stock", default_quantity: "1", vendor_product_code: "", allocated_quantity: "" }); setVariants([]); setSelectedGroupId(""); setSelectedCategoryId(""); setSelectedSubcategoryId(""); }}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
            data-testid="upload-another-btn">
            Upload Another Product
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6" data-testid="vendor-product-upload-page">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Add Product</h1>
          <p className="text-sm text-slate-500">Submit a product for admin review</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700" data-testid="upload-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Taxonomy */}
        <section className="rounded-xl border bg-white p-5" data-testid="taxonomy-section">
          <h2 className="text-base font-semibold text-slate-800 mb-3">1. Taxonomy</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Group</label>
              <select value={selectedGroupId} onChange={e => onGroupChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" data-testid="group-select">
                <option value="">All Groups</option>
                {taxonomy.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Category *</label>
              <select value={selectedCategoryId} onChange={e => { setSelectedCategoryId(e.target.value); setSelectedSubcategoryId(""); }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" data-testid="category-select">
                <option value="">Select Category</option>
                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Subcategory</label>
              <select value={selectedSubcategoryId} onChange={e => setSelectedSubcategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" data-testid="subcategory-select"
                disabled={!selectedCategoryId}>
                <option value="">Select Subcategory</option>
                {filteredSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* 2. Product Details */}
        <section className="rounded-xl border bg-white p-5" data-testid="product-details-section">
          <h2 className="text-base font-semibold text-slate-800 mb-3">2. Product Details</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Product Name *</label>
              <input value={product.product_name} onChange={e => setProduct({ ...product, product_name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. HP LaserJet Pro M404dn"
                data-testid="product-name-input" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Brand</label>
              <input value={product.brand} onChange={e => setProduct({ ...product, brand: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. HP"
                data-testid="product-brand-input" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Short Description</label>
              <textarea value={product.short_description} onChange={e => setProduct({ ...product, short_description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} placeholder="Brief summary..."
                data-testid="short-desc-input" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Full Description</label>
              <textarea value={product.full_description} onChange={e => setProduct({ ...product, full_description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} placeholder="Detailed product description..."
                data-testid="full-desc-input" />
            </div>
          </div>
        </section>

        {/* 3. Product Images — File Upload */}
        <section className="rounded-xl border bg-white p-5" data-testid="images-section">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">3. Product Images</h2>
              <p className="text-xs text-slate-400 mt-0.5">First image becomes the primary. Max 10 images. JPEG, PNG, GIF, WebP up to 10MB each.</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">{uploadedImages.length}/10</span>
          </div>

          {/* Drag-and-drop zone */}
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#20364D]/40 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            data-testid="image-dropzone"
          >
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple
              className="hidden" onChange={e => handleFileSelect(e.target.files)} data-testid="image-file-input" />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-[#20364D] animate-spin" />
                <p className="text-sm text-slate-600 font-medium">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-slate-300" />
                <p className="text-sm text-slate-600 font-medium">Click to select or drag & drop images</p>
                <p className="text-xs text-slate-400">JPEG, PNG, GIF, WebP — max 10MB each</p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" data-testid="image-upload-error">
              {uploadError}
            </div>
          )}

          {/* Uploaded image thumbnails */}
          {uploadedImages.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" data-testid="uploaded-images-grid">
              {uploadedImages.map((img, idx) => (
                <ImageThumb
                  key={img.file_id || idx}
                  src={img.storage_path}
                  isPrimary={idx === 0}
                  onRemove={() => removeUploadedImage(idx)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 4. Vendor Supply */}
        <section className="rounded-xl border bg-white p-5" data-testid="supply-section">
          <h2 className="text-base font-semibold text-slate-800 mb-3">4. Vendor Supply</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Base Price (VAT incl.) *</label>
              <input type="number" min="0" step="0.01" value={supply.base_price_vat_inclusive}
                onChange={e => setSupply({ ...supply, base_price_vat_inclusive: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. 15000"
                data-testid="base-price-input" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Allocated Quantity *</label>
              <input type="number" min="0" value={supply.allocated_quantity}
                onChange={e => setSupply({ ...supply, allocated_quantity: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. 100"
                data-testid="allocated-qty-input" />
              <p className="text-[10px] text-slate-400 mt-0.5">Total units available for this product</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Lead Time (days)</label>
              <input type="number" min="0" value={supply.lead_time_days}
                onChange={e => setSupply({ ...supply, lead_time_days: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. 5"
                data-testid="lead-time-input" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Supply Mode</label>
              <select value={supply.supply_mode} onChange={e => setSupply({ ...supply, supply_mode: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                data-testid="supply-mode-select">
                <option value="in_stock">In Stock</option>
                <option value="made_to_order">Made to Order</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Default Quantity</label>
              <input type="number" min="1" value={supply.default_quantity}
                onChange={e => setSupply({ ...supply, default_quantity: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="1"
                data-testid="default-qty-input" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Vendor Product Code</label>
              <input value={supply.vendor_product_code}
                onChange={e => setSupply({ ...supply, vendor_product_code: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. HP-LJ-001"
                data-testid="vendor-code-input" />
            </div>
          </div>
        </section>

        {/* 5. Variants */}
        <section className="rounded-xl border bg-white p-5" data-testid="variants-section">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">5. Variants</h2>
              <p className="text-xs text-slate-400">Optional. Add size/color/model variants with individual quantities and pricing.</p>
            </div>
            <button type="button" onClick={addVariant}
              className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              data-testid="add-variant-btn">
              <Plus className="w-3.5 h-3.5" /> Add Variant
            </button>
          </div>

          {variants.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No variants added. Click "Add Variant" to create size/color/model combinations.</p>
          ) : (
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3" data-testid={`variant-row-${i}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600">Variant {i + 1}</span>
                    <button type="button" onClick={() => removeVariant(i)} className="text-slate-400 hover:text-red-500"
                      data-testid={`remove-variant-btn-${i}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                    <input value={v.sku} onChange={e => updateVariant(i, "sku", e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" placeholder="SKU"
                      data-testid={`variant-sku-${i}`} />
                    <input value={v.size} onChange={e => updateVariant(i, "size", e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" placeholder="Size"
                      data-testid={`variant-size-${i}`} />
                    <input value={v.color} onChange={e => updateVariant(i, "color", e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" placeholder="Color"
                      data-testid={`variant-color-${i}`} />
                    <input value={v.model} onChange={e => updateVariant(i, "model", e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" placeholder="Model"
                      data-testid={`variant-model-${i}`} />
                    <input type="number" min="0" value={v.quantity} onChange={e => updateVariant(i, "quantity", e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" placeholder="Quantity"
                      data-testid={`variant-qty-${i}`} />
                    <input type="number" min="0" step="0.01" value={v.price_override} onChange={e => updateVariant(i, "price_override", e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs" placeholder="Price Override"
                      data-testid={`variant-price-${i}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex justify-end">
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            data-testid="submit-product-btn">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            Submit for Review
          </button>
        </div>
      </form>
    </div>
  );
}
