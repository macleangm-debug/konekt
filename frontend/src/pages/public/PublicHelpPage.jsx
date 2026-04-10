import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle, ShoppingBag, CreditCard, Truck, UserPlus,
  Wallet, Bell, Shield, Search, ChevronDown, ArrowRight,
  Phone, Mail,
} from "lucide-react";
import PublicPageShell from "../../components/public/PublicPageShell";import { useBranding } from "../../contexts/BrandingContext";

const FAQ_SECTIONS = [
  {
    id: "ordering",
    title: "Ordering",
    Icon: ShoppingBag,
    items: [
      {
        q: "Do I need an account to place an order?",
        a: "No. You can browse the marketplace and place an order as a guest. Creating a free account unlocks order history, tracking, invoices, wallet credits, and reorder functionality.",
      },
      {
        q: "How do I place an order?",
        a: "Browse the marketplace, add items to your cart, and proceed to checkout. Enter your details and place the order. You'll receive bank transfer details and payment instructions on the next step.",
      },
      {
        q: "Can I request a custom quote?",
        a: "Yes. Use the 'Request a Quote' option to describe what you need — including custom branding, specific quantities, or services. Our sales team will respond with pricing and availability within 24 hours.",
      },
      {
        q: "What is the minimum order amount?",
        a: "There is no strict minimum for most products. However, custom-branded items may have minimum quantity requirements as specified by the vendor.",
      },
      {
        q: "Can I modify my order after placing it?",
        a: "Order modifications may be possible before payment verification. Once payment is verified and processing begins, changes are subject to availability. Contact your sales representative for assistance.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    Icon: CreditCard,
    items: [
      {
        q: "How do I pay for my order?",
        a: "After placing your order, you'll see our bank transfer details. Transfer the exact invoiced amount using the order number as the payment reference, then upload your payment proof through the platform.",
      },
      {
        q: "What happens after I submit payment proof?",
        a: "Our admin team reviews and verifies your payment. Once verified, your order moves into processing and vendor assignment. You'll receive a notification when verification is complete.",
      },
      {
        q: "How long does payment verification take?",
        a: "Payment verification typically takes 1–2 business hours during working days (Monday–Friday, 9am–5pm EAT). Proofs submitted outside these hours are processed on the next business day.",
      },
      {
        q: "Can I pay with a credit card or mobile money?",
        a: "Currently, bank transfer is the primary payment method. Card and mobile money payment options may be enabled in the future. Check the checkout page for available methods.",
      },
      {
        q: "What if I pay the wrong amount?",
        a: "If you overpay, the excess amount will be refunded or credited to your account. If you underpay, you'll be asked to transfer the remaining balance before processing begins.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery & Tracking",
    Icon: Truck,
    items: [
      {
        q: "How can I track my order?",
        a: "Use the 'Track Order' feature with your order number and email. Registered users can view all orders and their real-time status directly from the dashboard.",
      },
      {
        q: "What are the delivery timelines?",
        a: "Standard products are typically delivered within 3–7 business days after payment verification. Custom or branded items may take longer depending on production requirements. Services follow the timeline specified in the quote.",
      },
      {
        q: "Do you deliver nationwide?",
        a: "We deliver across supported regions in Tanzania through our logistics partner network. Coverage areas are expanding. Contact us for delivery to remote locations.",
      },
      {
        q: "What if my order arrives damaged?",
        a: "Contact our support team within 48 hours of delivery with photos of the damage. We will coordinate with the vendor for a replacement or refund.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Registration",
    Icon: UserPlus,
    items: [
      {
        q: "How do I create an account?",
        a: "Click 'Register' on the login page. Enter your business name, email, phone number, and create a password. You can optionally set up a 4-digit PIN for quick login from your phone.",
      },
      {
        q: "Can I log in with my phone number?",
        a: "Yes. If you've set up a PIN, you can log in using your phone number and PIN instead of email and password. Go to Account Settings to set up your PIN.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "Click 'Forgot Password' on the login page and enter your registered email address. You'll receive a password reset link.",
      },
      {
        q: "How do I update my business information?",
        a: "Log in to your account and navigate to Settings or My Account. You can update your company name, phone number, delivery address, and notification preferences.",
      },
    ],
  },
  {
    id: "wallet",
    title: "Wallet & Referrals",
    Icon: Wallet,
    items: [
      {
        q: "How does the referral program work?",
        a: "Share your unique referral code with other businesses. When a referred user makes their first verified purchase, you earn wallet credits from the distribution margin. Credits are added to your wallet automatically.",
      },
      {
        q: "How do I use my wallet credits?",
        a: "During checkout, you'll see your available wallet balance. You can apply credits to reduce your order total. There is a maximum percentage of the order that can be covered by wallet credits (set by the administrator).",
      },
      {
        q: "Can I withdraw wallet credits as cash?",
        a: "No. Wallet credits are non-transferable and can only be applied toward future purchases on the platform.",
      },
      {
        q: "Where can I find my referral code?",
        a: "Your referral code is displayed on your Dashboard under the 'Refer & Earn' card, and on the dedicated Referrals page accessible from your account menu.",
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications & Communication",
    Icon: Bell,
    items: [
      {
        q: "What notifications will I receive?",
        a: "You'll receive notifications for order updates, payment verification, delivery status, referral rewards, and system announcements. All notifications appear in the bell icon on your dashboard.",
      },
      {
        q: "Can I customize my notification preferences?",
        a: "Yes. Go to your account settings and navigate to Notification Preferences. You can toggle in-app, email, and WhatsApp notifications for each event type.",
      },
      {
        q: "How do I stop receiving notifications?",
        a: "You can disable specific notification categories from your Notification Preferences. Core order and payment notifications cannot be fully disabled for security reasons.",
      },
    ],
  },
  {
    id: "security",
    title: "Security & Privacy",
    Icon: Shield,
    items: [
      {
        q: "Is my data safe on the platform?",
        a: "Yes. We use HTTPS encryption for all data transmission. Passwords and PINs are one-way hashed. Payment information is handled with strict confidentiality. See our Privacy Policy for full details.",
      },
      {
        q: "Who can see my order information?",
        a: "Your order details are visible to you, your assigned sales representative, and platform administrators. Vendors only see the information necessary to fulfill their portion of the order — they cannot see your pricing, margins, or full contact details.",
      },
      {
        q: "How do I report a security concern?",
        a: "Contact our support team immediately through the Help Center or email. We take security reports seriously and will investigate promptly.",
      },
    ],
  },
];

export default function PublicHelpPage() {
  const { brand_name } = useBranding();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  const toggleItem = (sectionId, idx) => {
    const key = `${sectionId}-${idx}`;
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter FAQs by search
  const filteredSections = searchQuery.trim()
    ? FAQ_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter(
          (item) =>
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.a.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((s) => s.items.length > 0)
    : FAQ_SECTIONS;

  const totalResults = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
      <div data-testid="help-center-page">
        {/* Hero */}
        <section className="bg-[#20364D] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(212,168,67,0.06)_0%,_transparent_50%)]" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Help Center
            </h1>
            <p className="mt-3 text-white/60 max-w-lg mx-auto">
              Find answers to common questions about ordering, payments, delivery, and your account.
            </p>

            {/* Search */}
            <div className="mt-8 max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for answers..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]"
                data-testid="help-search-input"
              />
            </div>

            {searchQuery && (
              <p className="mt-3 text-sm text-white/50">
                {totalResults} result{totalResults !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
        </section>

        {/* Quick nav pills — show when not searching */}
        {!searchQuery && (
          <section className="border-b border-slate-200 bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FAQ_SECTIONS.map((s) => {
                  const Icon = s.Icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setExpandedSection(s.id === expandedSection ? null : s.id);
                        document.getElementById(`faq-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-[#20364D] hover:bg-slate-50 transition-colors shrink-0"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {s.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Sections */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-10">
            {filteredSections.map((section) => {
              const Icon = section.Icon;
              return (
                <div
                  key={section.id}
                  id={`faq-${section.id}`}
                  className="scroll-mt-24"
                  data-testid={`faq-section-${section.id}`}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#20364D]/5 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-[#20364D]" />
                    </div>
                    <h2 className="text-xl font-bold text-[#20364D]">{section.title}</h2>
                    <span className="text-xs text-slate-400 font-medium">
                      {section.items.length} question{section.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Questions */}
                  <div className="space-y-2">
                    {section.items.map((item, idx) => {
                      const key = `${section.id}-${idx}`;
                      const isOpen = expandedItems[key];
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                        >
                          <button
                            onClick={() => toggleItem(section.id, idx)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
                            data-testid={`faq-q-${section.id}-${idx}`}
                          >
                            <span className="text-sm font-medium text-[#20364D] pr-4">{item.q}</span>
                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {searchQuery && filteredSections.length === 0 && (
            <div className="text-center py-16">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-500">No results found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try a different search term or browse the categories above.
              </p>
            </div>
          )}
        </section>

        {/* Contact CTA */}
        <section className="border-t border-slate-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
            <h2 className="text-2xl font-extrabold text-[#20364D]">Still need help?</h2>
            <p className="mt-2 text-slate-500 max-w-md mx-auto">
              Can't find what you're looking for? Our support team is here to assist you.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="rounded-xl bg-[#20364D] text-white px-6 py-3 font-semibold hover:bg-[#1a2d40] transition-colors flex items-center gap-2"
                data-testid="help-contact-btn"
              >
                Contact Support <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/about"
                className="rounded-xl border border-slate-300 text-slate-600 px-6 py-3 font-semibold hover:bg-slate-50 transition-colors"
              >
                About {brand_name}
              </Link>
            </div>
          </div>
        </section>
      </div>
  );
}
