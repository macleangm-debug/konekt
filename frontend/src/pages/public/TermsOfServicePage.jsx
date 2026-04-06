import React from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10" data-testid="terms-of-service-page">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-[#20364D]" />
        </div>
        <h1 className="text-3xl font-bold text-[#20364D]">Terms of Service</h1>
      </div>

      <p className="text-sm text-slate-500 mb-8">Last updated: April 2026</p>

      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-[#20364D]">1. Acceptance of Terms</h2>
          <p className="text-slate-600 leading-relaxed">
            By using the Konekt platform, you agree to these Terms of Service. Konekt provides a
            B2B marketplace connecting businesses with verified fulfillment partners for products and services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">2. Ordering & Payment</h2>
          <p className="text-slate-600 leading-relaxed">
            Orders placed on Konekt are subject to payment verification. All payments must be verified
            by our admin team before orders are processed and assigned for fulfillment. Konekt reserves
            the right to reject orders or payment proofs that do not meet verification requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">3. Pricing & Currency</h2>
          <p className="text-slate-600 leading-relaxed">
            All prices are displayed in the local currency of the operating market (e.g., TZS for
            Tanzania). Prices are inclusive of applicable taxes unless otherwise stated. Konekt
            reserves the right to update pricing at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">4. Fulfillment & Delivery</h2>
          <p className="text-slate-600 leading-relaxed">
            Konekt coordinates fulfillment through its verified supply network. Delivery timelines
            are estimates and may vary based on product availability, location, and logistics.
            Konekt will communicate any delays through your registered contact details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">5. Fulfillment Network</h2>
          <p className="text-slate-600 leading-relaxed">
            Fulfillment partners on the Konekt platform are independently vetted. While Konekt manages the
            ordering and payment process, individual product quality and fulfillment are the
            responsibility of the assigned fulfillment partner under Konekt's oversight.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">6. Guest Orders</h2>
          <p className="text-slate-600 leading-relaxed">
            Konekt allows guest checkout without account creation. Guest orders are tracked by
            email and order number. Creating an account provides access to order history, tracking,
            and reorder functionality.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">7. Cancellations & Refunds</h2>
          <p className="text-slate-600 leading-relaxed">
            Orders may be cancelled before payment verification is complete. After verification,
            cancellation requests are handled on a case-by-case basis. Refunds, when applicable,
            are processed within 7-14 business days through the original payment method.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">8. Limitation of Liability</h2>
          <p className="text-slate-600 leading-relaxed">
            Konekt acts as a platform and coordinator. While we strive to ensure quality and
            timely delivery, Konekt's liability is limited to the value of the specific order
            in question.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">9. Contact</h2>
          <p className="text-slate-600 leading-relaxed">
            For questions about these terms, contact us at{" "}
            <a href="mailto:info@konekt.co.tz" className="text-[#20364D] underline">info@konekt.co.tz</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
