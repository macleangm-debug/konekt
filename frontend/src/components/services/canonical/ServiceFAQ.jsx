import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

/**
 * Service FAQ — Expandable FAQ section.
 */
export function ServiceFAQ({ items = [] }) {
  const [expanded, setExpanded] = useState({});
  if (!items.length) return null;

  const toggle = (idx) => setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <section className="bg-white border-y border-slate-200" data-testid="service-faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#20364D] mb-2">
            Frequently asked questions
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Quick answers to the most common questions about this service.
          </p>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => {
            const q = item.q || item.question;
            const a = item.a || item.answer;
            const isOpen = expanded[idx];
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
                  data-testid={`service-faq-q-${idx}`}
                >
                  <span className="flex items-center gap-2.5 text-sm font-medium text-[#20364D] pr-4">
                    <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    {q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 pl-11">
                    {a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ServiceFAQ;
