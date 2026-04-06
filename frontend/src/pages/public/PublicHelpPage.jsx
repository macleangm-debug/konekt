import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ShoppingBag, CreditCard, Truck, UserPlus,
  HelpCircle, Mail, Phone, ArrowRight
} from "lucide-react";

const FAQ_SECTIONS = [
  {
    title: "Ordering",
    Icon: ShoppingBag,
    items: [
      {
        q: "Do I need an account to place an order?",
        a: "No. You can browse the marketplace and place an order as a guest. Creating an account lets you track orders, view history, and reorder."
      },
      {
        q: "How do I place an order?",
        a: "Browse the marketplace, add items to your cart, then go to checkout. Fill in your details and place the order. You'll receive payment instructions on the next step."
      },
      {
        q: "Can I request a custom quote?",
        a: "Yes. Use the 'Request a Quote' option to describe what you need. Our team will respond with pricing and availability."
      },
    ],
  },
  {
    title: "Payment",
    Icon: CreditCard,
    items: [
      {
        q: "How do I pay for my order?",
        a: "After placing your order, you'll see bank transfer details. Transfer the exact amount using the order number as reference, then upload your payment proof."
      },
      {
        q: "What happens after I submit payment proof?",
        a: "Our admin team reviews and verifies your payment. Once verified, your order moves into managed fulfillment."
      },
      {
        q: "How long does payment verification take?",
        a: "Payment verification typically takes 1-2 business hours during working days."
      },
    ],
  },
  {
    title: "Delivery",
    Icon: Truck,
    items: [
      {
        q: "How can I track my order?",
        a: "Use the 'Track Order' feature with your order number and email. If you have an account, all orders are visible in your dashboard."
      },
      {
        q: "What are the delivery timelines?",
        a: "Delivery times vary by product and fulfillment partner. Standard orders are typically fulfilled within 3-7 business days."
      },
    ],
  },
  {
    title: "Account",
    Icon: UserPlus,
    items: [
      {
        q: "What are the benefits of creating an account?",
        a: "With an account you can: track all orders, view invoices, reorder quickly, and access your complete order history."
      },
      {
        q: "How do I create an account?",
        a: "Click 'Login' in the top navigation, then register with your email. If you've placed a guest order, you can link it to your new account."
      },
    ],
  },
];

export default function PublicHelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10" data-testid="public-help-page">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-[#20364D]" />
        </div>
        <h1 className="text-3xl font-bold text-[#20364D]">Help Center</h1>
      </div>
      <p className="text-slate-600 mb-8">Find answers to common questions about using Konekt.</p>

      <div className="space-y-8">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title} data-testid={`help-section-${section.title.toLowerCase()}`}>
            <div className="flex items-center gap-2 mb-4">
              <section.Icon className="w-5 h-5 text-[#D4A843]" />
              <h2 className="text-xl font-bold text-[#20364D]">{section.title}</h2>
            </div>
            <div className="space-y-3">
              {section.items.map((item, i) => (
                <details key={i} className="group rounded-xl border bg-white overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-medium text-[#20364D] hover:bg-slate-50 transition list-none">
                    <span>{item.q}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90 flex-shrink-0" />
                  </summary>
                  <div className="px-5 pb-4 text-slate-600 text-sm leading-relaxed border-t">
                    <p className="pt-3">{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Still need help */}
      <div className="mt-12 rounded-2xl bg-slate-50 border p-6 text-center" data-testid="help-contact">
        <h2 className="text-xl font-bold text-[#20364D] mb-2">Still need help?</h2>
        <p className="text-slate-600 mb-4">Our team is ready to assist you.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="mailto:sales@konekt.co.tz"
            className="inline-flex items-center gap-2 rounded-xl bg-[#20364D] text-white px-5 py-2.5 font-semibold hover:bg-[#2a4a66] transition"
            data-testid="help-email-btn">
            <Mail className="w-4 h-4" /> Email Support
          </a>
          <a href="tel:+255759110453"
            className="inline-flex items-center gap-2 rounded-xl border border-[#20364D] text-[#20364D] px-5 py-2.5 font-semibold hover:bg-[#20364D] hover:text-white transition"
            data-testid="help-phone-btn">
            <Phone className="w-4 h-4" /> Call Us
          </a>
        </div>
      </div>
    </div>
  );
}
