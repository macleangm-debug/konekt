import React, { useEffect, useState } from "react";
import adminApi from "../../lib/adminApi";
import FilterBar from "../../components/admin/shared/FilterBar";
import DetailDrawer from "../../components/admin/shared/DetailDrawer";
import EmptyState from "../../components/admin/shared/EmptyState";
import { Package, Layers, Tag, Briefcase } from "lucide-react";

function money(v) { return `TZS ${Number(v || 0).toLocaleString()}`; }

const TABS = [
  { key: "products", label: "Products", icon: Package },
  { key: "promo", label: "Promo Items", icon: Tag },
  { key: "services", label: "Services", icon: Briefcase },
  { key: "groups", label: "Groups", icon: Layers },
];

export default function ProductsServicesPage() {
  const [tab, setTab] = useState("products");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    const fetcher = tab === "products" ? adminApi.getCatalogProducts({ search: search || undefined })
      : tab === "promo" ? adminApi.getCatalogPromoItems()
      : tab === "services" ? adminApi.getCatalogServices()
      : adminApi.getCatalogGroups();
    fetcher
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);
  useEffect(() => { if (tab === "products") { const t = setTimeout(load, 300); return () => clearTimeout(t); } }, [search]);

  return (
    <div data-testid="products-services-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#20364D]">Products & Services</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage product catalog, promotional items, services, and category groups.</p>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" data-testid="catalog-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-[#20364D] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            data-testid={`tab-${t.key}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === "products" && <FilterBar search={search} onSearchChange={setSearch} />}

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
      ) : rows.length > 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid={`${tab}-table`}>
              <thead>
                <tr className="text-left border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Name</th>
                  {(tab === "products" || tab === "promo") && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">SKU</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Price</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Category</th>
                  </>)}
                  {tab === "services" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Base Price</th>
                  </>)}
                  {tab === "groups" && (<>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Items</th>
                  </>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} onClick={() => setSelected(row)} className="hover:bg-slate-50 transition-colors cursor-pointer" data-testid={`${tab}-row-${idx}`}>
                    <td className="px-4 py-3 font-semibold text-[#20364D]">{row.name || row.title || row.group_name || "-"}</td>
                    {(tab === "products" || tab === "promo") && (<>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.sku || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(row.price || row.unit_price)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.category || "-"}</td>
                    </>)}
                    {tab === "services" && (<>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.service_type || row.type || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(row.base_price || row.price)}</td>
                    </>)}
                    {tab === "groups" && (<>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.group_type || row.type || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{row.items?.length || row.service_count || 0}</td>
                    </>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={TABS.find(t => t.key === tab)?.icon || Package} title={`No ${tab} found`} description={`${tab} catalog items will appear here.`} />
      )}

      <DetailDrawer open={!!selected} onClose={() => setSelected(null)} title="Item Detail" subtitle={selected?.name || selected?.title}>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
              {Object.entries(selected).filter(([k]) => !["_id","id","images","variants"].includes(k)).slice(0,12).map(([k,v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500 capitalize">{k.replace(/_/g," ")}</span>
                  <span className="font-medium text-[#20364D] text-right max-w-[220px] truncate">{Array.isArray(v) ? v.join(", ") : String(v ?? "-")}</span>
                </div>
              ))}
            </div>
            {selected.description && <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.description}</p></div>}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
