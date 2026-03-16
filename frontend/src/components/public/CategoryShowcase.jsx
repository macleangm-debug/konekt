import React from "react";
import { Link } from "react-router-dom";
import { Package, Printer, Briefcase, Palette } from "lucide-react";

export default function CategoryShowcase() {
  const items = [
    {
      title: "Promotional Products",
      description: "Branded corporate gifts, apparel, giveaways, and event materials.",
      href: "/marketplace?category=promotional",
      icon: Package,
    },
    {
      title: "Office Equipment",
      description: "Machines, devices, supplies, and accessories for productive teams.",
      href: "/marketplace?category=office_equipment",
      icon: Briefcase,
    },
    {
      title: "Printing Services",
      description: "Brochures, business cards, banners, branded documents, and packaging.",
      href: "/services?category=printing",
      icon: Printer,
    },
    {
      title: "Creative & Design",
      description: "Design, copywriting, branding, and business content support.",
      href: "/services?category=creative",
      icon: Palette,
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 space-y-6" data-testid="category-showcase">
      <div className="max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-[#20364D]">
          Everything businesses need, in one place.
        </h2>
        <p className="text-slate-600 mt-3 text-lg">
          From products to services, Konekt helps businesses order faster and operate better.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.href}
              className="group rounded-3xl border bg-white p-6 hover:shadow-lg hover:-translate-y-0.5 transition duration-200"
              data-testid={`category-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#20364D]/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-[#20364D]" />
              </div>
              <div className="text-xl font-bold text-[#20364D]">{item.title}</div>
              <div className="text-slate-600 mt-3">{item.description}</div>
              <div className="mt-5 font-semibold text-[#20364D] group-hover:translate-x-1 transition">
                Explore →
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
