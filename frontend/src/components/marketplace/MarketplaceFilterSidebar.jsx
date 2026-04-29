import React, { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function MarketplaceFilterSidebar({ groups = [], categories = [], subcategories = [], selectedFilters = {}, onChange }) {
  const [open, setOpen] = useState(false);
  const filteredCategories = useMemo(() => !selectedFilters.group_id ? categories : categories.filter((c) => c.group_id === selectedFilters.group_id), [categories, selectedFilters.group_id]);
  const filteredSubcategories = useMemo(() => !selectedFilters.category_id ? subcategories : subcategories.filter((s) => s.category_id === selectedFilters.category_id), [subcategories, selectedFilters.category_id]);
  const handleGroupChange = (val) => onChange({ group_id: val || null, category_id: null, subcategory_id: null });
  const handleCategoryChange = (val) => onChange({ ...selectedFilters, category_id: val || null, subcategory_id: null });
  const handleSubcategoryChange = (val) => onChange({ ...selectedFilters, subcategory_id: val || null });
  const hasFilters = selectedFilters.group_id || selectedFilters.category_id || selectedFilters.subcategory_id;

  const FilterFields = (
    <div className="space-y-4">
      <div><label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Group</label><select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={selectedFilters.group_id || ""} onChange={(e) => handleGroupChange(e.target.value)} data-testid="filter-group"><option value="">All groups</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
      <div><label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</label><select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={selectedFilters.category_id || ""} onChange={(e) => handleCategoryChange(e.target.value)} data-testid="filter-category"><option value="">All categories</option>{filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Subcategory</label><select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={selectedFilters.subcategory_id || ""} onChange={(e) => handleSubcategoryChange(e.target.value)} data-testid="filter-subcategory"><option value="">All subcategories</option>{filteredSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    </div>
  );

  return (<>
    <div className="md:hidden mb-3">
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-[#20364D] flex items-center justify-between" data-testid="open-filter-sheet"><span className="inline-flex items-center gap-2"><Filter className="w-4 h-4" />Filters</span><span className="text-xs text-slate-500">{hasFilters ? "Active" : "All"}</span></button>
      <Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" className="rounded-t-2xl"><SheetHeader><SheetTitle>Refine</SheetTitle></SheetHeader><div className="mt-4">{FilterFields}</div></SheetContent></Sheet>
    </div>
    <aside className="hidden md:block w-full rounded-2xl border bg-white p-5" data-testid="marketplace-filter-sidebar"><div className="flex items-center justify-between mb-5"><h3 className="text-sm font-bold text-[#20364D] flex items-center gap-2"><Filter className="w-4 h-4" /> Refine</h3>{hasFilters && <button type="button" onClick={() => onChange({ group_id: null, category_id: null, subcategory_id: null })} className="text-xs text-[#D4A843] font-medium hover:underline" data-testid="clear-filters-btn">Clear all</button>}</div>{FilterFields}</aside>
  </>);
}
