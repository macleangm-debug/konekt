import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, DollarSign, FileText, Receipt } from "lucide-react";
import api from "../../lib/api";

export default function CustomerAccountsPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const [usersRes, customersRes] = await Promise.all([
        api.get("/api/admin/users?role=customer&limit=200"),
        api.get("/api/admin/customers?limit=200"),
      ]);
      
      const userEmails = new Set((usersRes.data.users || []).map(u => u.email));
      const customerEmails = new Set((customersRes.data.customers || []).map(c => c.email));
      
      const allEmails = [...new Set([...userEmails, ...customerEmails])];
      
      const combined = allEmails.map(email => {
        const user = (usersRes.data.users || []).find(u => u.email === email);
        const customer = (customersRes.data.customers || []).find(c => c.email === email);
        return {
          email,
          name: user?.full_name || customer?.name || email,
          company: user?.company || customer?.company || "-",
          phone: user?.phone || customer?.phone || "-",
          createdAt: user?.created_at || customer?.created_at,
        };
      });
      
      setCustomers(combined);
    } catch (error) {
      console.error("Failed to load customers", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.email?.toLowerCase().includes(term) ||
      c.name?.toLowerCase().includes(term) ||
      c.company?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="customer-accounts-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2D3E50]">Customer Accounts</h1>
          <p className="text-slate-600 mt-1">360-degree view of customer commercial activity</p>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border rounded-xl"
              data-testid="search-customers-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No customers found</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((customer) => (
              <Link
                key={customer.email}
                to={`/admin/customer-accounts/${encodeURIComponent(customer.email)}`}
                className="rounded-2xl border bg-slate-50 p-5 hover:bg-slate-100 transition-colors block"
                data-testid={`customer-card-${customer.email}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D3E50] text-white flex items-center justify-center font-semibold">
                    {customer.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{customer.name}</div>
                    <div className="text-sm text-slate-500 truncate">{customer.email}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>{customer.company}</div>
                  <div>{customer.phone}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
