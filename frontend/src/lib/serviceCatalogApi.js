/**
 * Service Catalog API - Fetches dynamic service data
 */
const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Get all active service groups
 */
export async function getServiceGroups() {
  const res = await fetch(`${API}/api/public-services/groups`);
  if (!res.ok) throw new Error("Failed to fetch service groups");
  return res.json();
}

/**
 * Get all active service types, optionally filtered by group
 */
export async function getServiceTypes(groupKey = null) {
  const params = groupKey ? `?group_key=${groupKey}` : "";
  const res = await fetch(`${API}/api/public-services/types${params}`);
  if (!res.ok) throw new Error("Failed to fetch service types");
  return res.json();
}

/**
 * Get detailed info for a specific service by key
 */
export async function getServiceDetail(serviceKey) {
  const res = await fetch(`${API}/api/public-services/types/${serviceKey}`);
  if (!res.ok) throw new Error("Service not found");
  return res.json();
}

/**
 * Get service detail by slug
 */
export async function getServiceBySlug(slug) {
  const res = await fetch(`${API}/api/public-services/by-slug/${slug}`);
  if (!res.ok) throw new Error("Service not found");
  return res.json();
}

/**
 * Get public blank products (for printing/uniform selection)
 */
export async function getPublicBlankProducts(category = null) {
  const params = category ? `?category=${category}` : "";
  const res = await fetch(`${API}/api/public-services/blank-products${params}`);
  if (!res.ok) throw new Error("Failed to fetch blank products");
  return res.json();
}

/**
 * Get blank product categories
 */
export async function getBlankProductCategories() {
  const res = await fetch(`${API}/api/public-services/blank-products/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

/**
 * Create a site visit booking
 */
export async function createSiteVisit(data, token) {
  const res = await fetch(`${API}/api/site-visits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create site visit");
  }
  return res.json();
}

// Admin APIs for service management
export const adminServiceApi = {
  // Service Groups
  async getGroups(token) {
    const res = await fetch(`${API}/api/admin/service-catalog/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch groups");
    return res.json();
  },

  async createGroup(data, token) {
    const res = await fetch(`${API}/api/admin/service-catalog/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create group");
    return res.json();
  },

  async updateGroup(groupId, data, token) {
    const res = await fetch(`${API}/api/admin/service-catalog/groups/${groupId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update group");
    return res.json();
  },

  async deleteGroup(groupId, token) {
    const res = await fetch(`${API}/api/admin/service-catalog/groups/${groupId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete group");
    return res.json();
  },

  // Service Types
  async getTypes(groupKey, token) {
    const params = groupKey ? `?group_key=${groupKey}` : "";
    const res = await fetch(`${API}/api/admin/service-catalog/types${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch types");
    return res.json();
  },

  async createType(data, token) {
    const res = await fetch(`${API}/api/admin/service-catalog/types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create type");
    return res.json();
  },

  async updateType(typeId, data, token) {
    const res = await fetch(`${API}/api/admin/service-catalog/types/${typeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update type");
    return res.json();
  },

  async deleteType(typeId, token) {
    const res = await fetch(`${API}/api/admin/service-catalog/types/${typeId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete type");
    return res.json();
  },

  // Form Templates
  async getFormTemplate(serviceKey, token) {
    const res = await fetch(`${API}/api/admin/service-form-templates/${serviceKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch form template");
    return res.json();
  },

  async saveFormTemplate(data, token) {
    const res = await fetch(`${API}/api/admin/service-form-templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save form template");
    return res.json();
  },

  // Blank Products
  async getBlankProducts(token, category = null) {
    const params = category ? `?category=${category}` : "";
    const res = await fetch(`${API}/api/admin/blank-products${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch blank products");
    return res.json();
  },

  async createBlankProduct(data, token) {
    const res = await fetch(`${API}/api/admin/blank-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create blank product");
    return res.json();
  },

  async updateBlankProduct(productId, data, token) {
    const res = await fetch(`${API}/api/admin/blank-products/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update blank product");
    return res.json();
  },

  async deleteBlankProduct(productId, token) {
    const res = await fetch(`${API}/api/admin/blank-products/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete blank product");
    return res.json();
  },

  // Partner Capabilities
  async getPartnerCapabilities(token, partnerId = null, serviceKey = null) {
    let params = [];
    if (partnerId) params.push(`partner_id=${partnerId}`);
    if (serviceKey) params.push(`service_key=${serviceKey}`);
    const query = params.length ? `?${params.join("&")}` : "";
    const res = await fetch(`${API}/api/admin/partner-capabilities${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch partner capabilities");
    return res.json();
  },

  async createPartnerCapability(data, token) {
    const res = await fetch(`${API}/api/admin/partner-capabilities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create partner capability");
    return res.json();
  },

  // Delivery Partners
  async getDeliveryPartners(token, countryCode = null) {
    const params = countryCode ? `?country_code=${countryCode}` : "";
    const res = await fetch(`${API}/api/admin/delivery-partners${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch delivery partners");
    return res.json();
  },

  async createDeliveryPartner(data, token) {
    const res = await fetch(`${API}/api/admin/delivery-partners`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create delivery partner");
    return res.json();
  },

  // Product Insights
  async getFastMovingProducts(token) {
    const res = await fetch(`${API}/api/admin/product-insights/fast-moving`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch fast moving products");
    return res.json();
  },

  async getHighMarginProducts(token) {
    const res = await fetch(`${API}/api/admin/product-insights/high-margin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch high margin products");
    return res.json();
  },

  async getServiceDemand(token) {
    const res = await fetch(`${API}/api/admin/product-insights/service-demand`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch service demand");
    return res.json();
  },
};
