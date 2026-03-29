import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Clock, Package, MapPin, CheckCircle, AlertCircle, Send } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import BrandButton from "../../components/ui/BrandButton";
import DynamicFormRenderer from "../../components/services/DynamicFormRenderer";
import { getServiceBySlug, getServiceDetail, createSiteVisit } from "../../lib/serviceCatalogApi";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

// Helper to safely get auth from localStorage (no hooks needed)
const getAuthFromStorage = () => {
  const storedToken = localStorage.getItem('konekt_token');
  return { user: null, token: storedToken };
};

export default function ServiceDetailContent() {
  const { groupSlug, serviceSlug } = useParams();
  const navigate = useNavigate();
  
  // Safely check for auth - don't require it for public pages
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  
  useEffect(() => {
    // Try to get auth from localStorage
    const storedToken = localStorage.getItem('konekt_token');
    setToken(storedToken);
    // We won't fetch user profile here to avoid complexity
    // Just check if there's a token
  }, []);
  
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formValues, setFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  
  // Contact info (always required)
  const [contactInfo, setContactInfo] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  useEffect(() => {
    async function fetchService() {
      try {
        setLoading(true);
        // Try to fetch by slug first
        let data;
        try {
          data = await getServiceBySlug(serviceSlug);
        } catch {
          // Fallback to key
          data = await getServiceDetail(serviceSlug);
        }
        setService(data);
        
        // Pre-fill contact info from user if logged in
        if (user) {
          setContactInfo(prev => ({
            ...prev,
            name: user.full_name || "",
            email: user.email || "",
            phone: user.phone || "",
            company: user.company || "",
          }));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [serviceSlug, user]);

  const validateForm = () => {
    const errors = {};
    
    // Validate contact info
    if (!contactInfo.name.trim()) errors.contact_name = "Name is required";
    if (!contactInfo.email.trim()) errors.contact_email = "Email is required";
    if (!contactInfo.phone.trim()) errors.contact_phone = "Phone is required";
    
    // Validate dynamic form fields
    if (service?.form_template?.fields) {
      service.form_template.fields.forEach((field) => {
        if (field.required && !formValues[field.key]) {
          errors[field.key] = `${field.label} is required`;
        }
      });
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const payload = {
        service_key: service.key,
        customer_name: contactInfo.name,
        customer_email: contactInfo.email,
        customer_phone: contactInfo.phone,
        company: contactInfo.company,
        notes: contactInfo.notes,
        form_data: formValues,
        country_code: "TZ", // Default for now
      };
      
      // If site visit is required, create a site visit
      if (service.site_visit_required) {
        await createSiteVisit({
          ...payload,
          customer_id: user?.id,
        }, token);
        toast.success("Site visit request submitted successfully!");
      } else {
        // Create a regular service request
        const res = await fetch(`${API}/api/service-requests`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to submit request");
        }
        
        toast.success("Service request submitted successfully!");
      }
      
      // Navigate to success or dashboard
      if (user) {
        navigate("/account/service-requests");
      } else {
        navigate("/services", { state: { success: true } });
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10" data-testid="service-detail-loading">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#20364D]" />
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10" data-testid="service-detail-error">
        <SurfaceCard className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold text-[#20364D] mb-2">Service Not Found</h2>
          <p className="text-slate-600 mb-6">{error || "The requested service does not exist."}</p>
          <BrandButton onClick={() => navigate("/services")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </BrandButton>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10" data-testid="service-detail-page">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link 
          to={groupSlug ? `/services/${groupSlug}` : "/services"} 
          className="inline-flex items-center text-slate-600 hover:text-[#20364D] transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {groupSlug || "services"}
        </Link>
      </div>

      <PageHeader 
        title={service.name}
        subtitle={service.description || service.short_description}
      />

      {/* Service Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {service.site_visit_required && (
          <SurfaceCard className="flex items-center gap-3 bg-blue-50">
            <MapPin className="w-6 h-6 text-blue-600" />
            <div>
              <div className="font-semibold text-[#20364D]">Site Visit Required</div>
              <div className="text-sm text-slate-600">We'll schedule an inspection</div>
            </div>
          </SurfaceCard>
        )}
        
        {service.visit_fee > 0 && (
          <SurfaceCard className="flex items-center gap-3 bg-amber-50">
            <Clock className="w-6 h-6 text-amber-600" />
            <div>
              <div className="font-semibold text-[#20364D]">Visit Fee</div>
              <div className="text-sm text-slate-600">TZS {service.visit_fee.toLocaleString()}</div>
            </div>
          </SurfaceCard>
        )}
        
        {service.has_product_blanks && (
          <SurfaceCard className="flex items-center gap-3 bg-green-50">
            <Package className="w-6 h-6 text-green-600" />
            <div>
              <div className="font-semibold text-[#20364D]">Product Selection</div>
              <div className="text-sm text-slate-600">Choose from catalog</div>
            </div>
          </SurfaceCard>
        )}
      </div>

      {/* Request Form */}
      <form onSubmit={handleSubmit}>
        <SurfaceCard className="mb-6">
          <h2 className="text-xl font-bold text-[#20364D] mb-6">Your Information</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#20364D]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactInfo.name}
                onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none ${
                  formErrors.contact_name ? "border-red-500" : "border-slate-200"
                }`}
                placeholder="Your full name"
                data-testid="contact-name-input"
              />
              {formErrors.contact_name && (
                <p className="text-xs text-red-500">{formErrors.contact_name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#20364D]">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none ${
                  formErrors.contact_email ? "border-red-500" : "border-slate-200"
                }`}
                placeholder="your@email.com"
                data-testid="contact-email-input"
              />
              {formErrors.contact_email && (
                <p className="text-xs text-red-500">{formErrors.contact_email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#20364D]">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none ${
                  formErrors.contact_phone ? "border-red-500" : "border-slate-200"
                }`}
                placeholder="+255 xxx xxx xxx"
                data-testid="contact-phone-input"
              />
              {formErrors.contact_phone && (
                <p className="text-xs text-red-500">{formErrors.contact_phone}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#20364D]">Company</label>
              <input
                type="text"
                value={contactInfo.company}
                onChange={(e) => setContactInfo({ ...contactInfo, company: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none"
                placeholder="Your company name (optional)"
                data-testid="contact-company-input"
              />
            </div>
          </div>
        </SurfaceCard>

        {/* Dynamic Form Fields */}
        {service.form_template && (service.form_template.sections?.length > 0 || service.form_template.fields?.length > 0) && (
          <SurfaceCard className="mb-6">
            <h2 className="text-xl font-bold text-[#20364D] mb-6">Service Details</h2>
            <DynamicFormRenderer
              template={service.form_template}
              values={formValues}
              onChange={setFormValues}
              errors={formErrors}
              disabled={submitting}
            />
          </SurfaceCard>
        )}

        {/* Product Selection for blanks */}
        {service.has_product_blanks && service.blank_products?.length > 0 && (
          <SurfaceCard className="mb-6">
            <h2 className="text-xl font-bold text-[#20364D] mb-6">Select Products</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {service.blank_products.slice(0, 6).map((product) => (
                <div 
                  key={product.id}
                  className={`p-4 border rounded-xl cursor-pointer transition ${
                    formValues.selected_products?.includes(product.id)
                      ? "border-[#20364D] bg-[#20364D]/5"
                      : "border-slate-200 hover:border-[#20364D]/50"
                  }`}
                  onClick={() => {
                    const current = formValues.selected_products || [];
                    const updated = current.includes(product.id)
                      ? current.filter(id => id !== product.id)
                      : [...current, product.id];
                    setFormValues({ ...formValues, selected_products: updated });
                  }}
                  data-testid={`product-select-${product.id}`}
                >
                  {product.images?.[0] && (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                  )}
                  <div className="font-medium text-[#20364D]">{product.name}</div>
                  <div className="text-sm text-slate-500">{product.category}</div>
                  {formValues.selected_products?.includes(product.id) && (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-2" />
                  )}
                </div>
              ))}
            </div>
          </SurfaceCard>
        )}

        {/* Additional Notes */}
        <SurfaceCard className="mb-6">
          <h2 className="text-xl font-bold text-[#20364D] mb-4">Additional Notes</h2>
          <textarea
            value={contactInfo.notes}
            onChange={(e) => setContactInfo({ ...contactInfo, notes: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#20364D]/20 focus:border-[#20364D] outline-none"
            rows={4}
            placeholder="Any additional details or requirements..."
            data-testid="notes-textarea"
          />
        </SurfaceCard>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <BrandButton 
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </BrandButton>
          
          <BrandButton 
            type="submit"
            variant="gold"
            disabled={submitting}
            data-testid="submit-service-request"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {service.site_visit_required ? "Request Site Visit" : "Submit Request"}
              </>
            )}
          </BrandButton>
        </div>
      </form>

      {/* Login prompt if not authenticated */}
      {!user && (
        <SurfaceCard className="mt-6 bg-slate-50 text-center">
          <p className="text-slate-600">
            <Link to="/auth" className="text-[#20364D] font-semibold hover:underline">
              Sign in
            </Link>{" "}
            to track your service requests and get faster responses.
          </p>
        </SurfaceCard>
      )}
    </div>
  );
}
