import React, { useState } from "react";
import AccountCartPanel from "../../components/account/AccountCartPanel";

const initialItems = [
  { id: "p1", name: "Executive Office Chair", price: "TZS 450,000", numericPrice: 450000 },
  { id: "p2", name: "A4 Copier Paper Box", price: "TZS 95,000", numericPrice: 95000 },
];

export default function AccountCartPage() {
  const [items, setItems] = useState(initialItems);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">My Cart</div>
        <div className="text-slate-600 mt-2">Keep building your order without leaving your account shell.</div>
      </div>

      <AccountCartPanel items={items} onRemove={(id) => setItems((prev) => prev.filter((x) => x.id !== id))} />
    </div>
  );
}
