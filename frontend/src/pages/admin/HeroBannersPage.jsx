import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, Trash2, Image, Link as LinkIcon, Eye, EyeOff, 
  GripVertical, Loader2, RefreshCw, Save, Calendar
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { heroBannerApi } from "../../lib/heroBannerApi";
import { useConfirmModal } from "../../contexts/ConfirmModalContext";

const initialForm = {
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  mobile_image_url: "",
  primary_cta_label: "",
  primary_cta_url: "",
  secondary_cta_label: "",
  secondary_cta_url: "",
  badge_text: "",
  theme: "dark",
  position: 0,
  is_active: true,
  starts_at: "",
  ends_at: "",
};

export default function HeroBannersPage() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { confirmAction } = useConfirmModal();

  const load = async () => {
    setLoading(true);
    try {
      const res = await heroBannerApi.getAdminHeroBanners();
      setBanners(res.data?.banners || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load hero banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title || !form.image_url) {
      toast.error("Title and image URL are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        position: Number(form.position || 0),
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };

      if (editingId) {
        await heroBannerApi.updateHeroBanner(editingId, payload);
        toast.success("Hero banner updated");
      } else {
        await heroBannerApi.createHeroBanner(payload);
        toast.success("Hero banner created");
      }
      
      resetForm();
      load();
    } catch (error) {
      console.error(error);
      toast.error(editingId ? "Failed to update banner" : "Failed to create banner");
    } finally {
      setSaving(false);
    }
  };

  const editBanner = (banner) => {
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      description: banner.description || "",
      image_url: banner.image_url || "",
      mobile_image_url: banner.mobile_image_url || "",
      primary_cta_label: banner.primary_cta_label || "",
      primary_cta_url: banner.primary_cta_url || "",
      secondary_cta_label: banner.secondary_cta_label || "",
      secondary_cta_url: banner.secondary_cta_url || "",
      badge_text: banner.badge_text || "",
      theme: banner.theme || "dark",
      position: banner.position || 0,
      is_active: banner.is_active !== false,
      starts_at: banner.starts_at ? banner.starts_at.slice(0, 16) : "",
      ends_at: banner.ends_at ? banner.ends_at.slice(0, 16) : "",
    });
    setEditingId(banner.id);
  };

  const removeBanner = async (bannerId) => {
    confirmAction({
      title: "Delete Banner?",
      message: "This hero banner will be permanently deleted.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        try {
          await heroBannerApi.deleteHeroBanner(bannerId);
          toast.success("Banner deleted");
          load();
        } catch (error) {
          console.error(error);
          toast.error("Failed to delete banner");
        }
      },
    });
  };

  const toggleBannerActive = async (banner) => {
    try {
      await heroBannerApi.updateHeroBanner(banner.id, { is_active: !banner.is_active });
      toast.success(banner.is_active ? "Banner deactivated" : "Banner activated");
      load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update banner");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="hero-banners-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Hero Banners</h1>
          <p className="text-muted-foreground">Manage rotating hero banners on the landing page</p>
        </div>
        <Button onClick={load} variant="outline" className="rounded-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid xl:grid-cols-[500px_1fr] gap-6">
        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5 h-fit"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary">
              {editingId ? "Edit Banner" : "Create New Banner"}
            </h2>
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g., New Year Sale - 20% Off"
                className="mt-1"
                data-testid="banner-title-input"
              />
            </div>
            
            <div>
              <Label>Subtitle</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                placeholder="e.g., Limited time offer"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Brief description for the banner..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" /> Desktop Image URL *
              </Label>
              <Input
                value={form.image_url}
                onChange={(e) => update("image_url", e.target.value)}
                placeholder="https://..."
                className="mt-1"
                data-testid="banner-image-input"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" /> Mobile Image URL (Optional)
              </Label>
              <Input
                value={form.mobile_image_url}
                onChange={(e) => update("mobile_image_url", e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Badge Text</Label>
              <Input
                value={form.badge_text}
                onChange={(e) => update("badge_text", e.target.value)}
                placeholder="e.g., New, Sale, Limited"
                className="mt-1"
              />
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <Label className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Call-to-Actions
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={form.primary_cta_label}
                onChange={(e) => update("primary_cta_label", e.target.value)}
                placeholder="Primary CTA Label"
              />
              <Input
                value={form.primary_cta_url}
                onChange={(e) => update("primary_cta_url", e.target.value)}
                placeholder="Primary CTA URL"
              />
              <Input
                value={form.secondary_cta_label}
                onChange={(e) => update("secondary_cta_label", e.target.value)}
                placeholder="Secondary CTA Label"
              />
              <Input
                value={form.secondary_cta_url}
                onChange={(e) => update("secondary_cta_url", e.target.value)}
                placeholder="Secondary CTA URL"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Position</Label>
                <Input
                  type="number"
                  value={form.position}
                  onChange={(e) => update("position", e.target.value)}
                  className="mt-1"
                  min="0"
                />
              </div>
              <div>
                <Label>Theme</Label>
                <Select value={form.theme} onValueChange={(v) => update("theme", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => update("is_active", checked)}
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Start Date
                </Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => update("starts_at", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> End Date
                </Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => update("ends_at", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {form.image_url && (
            <div className="pt-2 border-t border-slate-100">
              <Label>Preview</Label>
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={saving} data-testid="save-banner-btn">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {editingId ? "Update Banner" : "Create Banner"}
              </>
            )}
          </Button>
        </motion.form>

        {/* Existing Banners List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 p-6"
        >
          <h2 className="text-lg font-bold text-primary mb-6">
            Existing Banners ({banners.length})
          </h2>

          {banners.length === 0 ? (
            <div className="text-center py-12">
              <Image className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No hero banners yet</h3>
              <p className="text-muted-foreground">Create your first hero banner to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {banners.map((banner, idx) => (
                <motion.div
                  key={banner.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border p-4 transition-all ${
                    banner.is_active 
                      ? 'border-slate-200 bg-white' 
                      : 'border-slate-100 bg-slate-50 opacity-70'
                  }`}
                  data-testid={`banner-card-${banner.id}`}
                >
                  <div className="flex gap-4">
                    {/* Drag Handle & Image */}
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-5 h-5 text-muted-foreground mt-1 cursor-grab" />
                      {banner.image_url ? (
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-32 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Image className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-primary truncate">{banner.title}</h3>
                          {banner.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">{banner.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">
                            #{banner.position}
                          </Badge>
                          <Badge className={banner.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                            {banner.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => editBanner(banner)}
                          data-testid={`edit-banner-${banner.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBannerActive(banner)}
                        >
                          {banner.is_active ? (
                            <><EyeOff className="w-4 h-4 mr-1" /> Hide</>
                          ) : (
                            <><Eye className="w-4 h-4 mr-1" /> Show</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBanner(banner.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-banner-${banner.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
