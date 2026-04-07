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
            By accessing or using the Konekt platform ("Platform"), you agree to be bound by these
            Terms of Service ("Terms"). Konekt provides a B2B commerce platform where businesses
            can order products, request services, and manage procurement through a single, structured system.
            If you do not agree to these Terms, you must not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">2. Services Provided</h2>
          <p className="text-slate-600 leading-relaxed">
            Konekt offers businesses a unified ordering system for products and services including,
            but not limited to, office equipment, stationery, promotional materials, printing, and
            business services. Konekt handles the complete order lifecycle: from product sourcing
            and payment verification to order processing and delivery coordination.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">3. Account Registration</h2>
          <p className="text-slate-600 leading-relaxed">
            The Platform supports both guest checkout (no account required) and registered accounts.
            Guest orders are tracked by email address and order number. By creating a registered account,
            you gain access to order history, tracking, invoices, and reorder functionality. You are
            responsible for maintaining the confidentiality of your account credentials and for all
            activity that occurs under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">4. Ordering & Payment</h2>
          <p className="text-slate-600 leading-relaxed">
            All orders placed through the Platform are subject to availability and payment verification.
            The ordering process works as follows:
          </p>
          <ol className="list-decimal list-inside text-slate-600 space-y-2 mt-3">
            <li><strong>Order Placement:</strong> You select products, specify quantities, and submit your order through the checkout system.</li>
            <li><strong>Payment Submission:</strong> After placing your order, you transfer the indicated amount to Konekt's designated bank account using the order number as payment reference.</li>
            <li><strong>Payment Verification:</strong> Konekt's admin team reviews and verifies your payment proof. This typically takes 1-2 business hours during working days.</li>
            <li><strong>Order Processing:</strong> Once payment is verified, Konekt processes your order and begins sourcing and preparing your items for delivery.</li>
          </ol>
          <p className="text-slate-600 leading-relaxed mt-3">
            Konekt reserves the right to reject orders or payment proofs that do not meet verification
            requirements or that contain incomplete or inaccurate information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">5. Pricing, Currency & Taxes</h2>
          <p className="text-slate-600 leading-relaxed">
            All prices displayed on the Platform are in the local currency of the operating market
            (e.g., TZS for Tanzania). Prices are exclusive of VAT unless explicitly stated otherwise.
            Applicable VAT is calculated and displayed at checkout. Konekt reserves the right to update
            product pricing at any time without prior notice. Pricing at the time of order placement
            is final for that specific order.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">6. Delivery & Timelines</h2>
          <p className="text-slate-600 leading-relaxed">
            Konekt manages the complete delivery process for all orders. Delivery timelines are estimates
            and may vary based on product type, availability, and delivery location. Standard orders
            are typically delivered within 3-7 business days after payment verification. Konekt will
            communicate any delays through your registered email or phone number. Delivery is available
            within the operating regions specified on the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">7. Product Quality & Returns</h2>
          <p className="text-slate-600 leading-relaxed">
            Konekt is committed to delivering products that meet described specifications and quality
            standards. If you receive a product that is damaged, defective, or materially different
            from what was ordered, you must notify Konekt within 48 hours of delivery. Konekt will
            investigate the issue and, at its discretion, arrange for a replacement, credit, or refund.
            Products that have been used, altered, or damaged by the customer after delivery are not
            eligible for returns.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">8. Cancellations & Refunds</h2>
          <p className="text-slate-600 leading-relaxed">
            Orders may be cancelled without charge before payment verification is complete. After
            payment has been verified and the order enters processing, cancellation requests are
            handled on a case-by-case basis. If a cancellation is approved after payment, refunds
            are processed within 7-14 business days through the original payment method. Konekt
            may deduct reasonable administrative costs from the refund amount for orders that have
            already entered the processing stage.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">9. Intellectual Property</h2>
          <p className="text-slate-600 leading-relaxed">
            All content on the Platform, including but not limited to text, graphics, logos, images,
            software, and design, is the property of Konekt or its licensors and is protected by
            applicable intellectual property laws. You may not reproduce, distribute, modify, or
            create derivative works from any Platform content without prior written permission from Konekt.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">10. User Responsibilities</h2>
          <p className="text-slate-600 leading-relaxed">
            When using the Platform, you agree to:
          </p>
          <ul className="list-disc list-inside text-slate-600 space-y-1.5 mt-2">
            <li>Provide accurate and complete information when placing orders or creating an account</li>
            <li>Use the Platform only for lawful business purposes</li>
            <li>Not attempt to bypass payment verification or security measures</li>
            <li>Not misrepresent your identity, company, or order details</li>
            <li>Respond promptly to communications regarding your orders</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">11. Limitation of Liability</h2>
          <p className="text-slate-600 leading-relaxed">
            To the maximum extent permitted by law, Konekt's total liability for any claim arising
            from or related to the use of the Platform or any order placed through it shall not
            exceed the total value of the specific order in question. Konekt shall not be liable
            for any indirect, incidental, consequential, or punitive damages, including but not
            limited to loss of profits, business interruption, or data loss.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">12. Dispute Resolution</h2>
          <p className="text-slate-600 leading-relaxed">
            Any disputes arising from the use of the Platform or these Terms shall first be addressed
            through Konekt's customer support team. If the dispute cannot be resolved through direct
            communication within 30 days, either party may pursue resolution through the appropriate
            legal channels under the laws of the United Republic of Tanzania.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">13. Modifications to Terms</h2>
          <p className="text-slate-600 leading-relaxed">
            Konekt reserves the right to modify these Terms at any time. Material changes will be
            communicated through the Platform or via email to registered users. Continued use of the
            Platform after changes are posted constitutes acceptance of the modified Terms. We recommend
            reviewing these Terms periodically.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">14. Governing Law</h2>
          <p className="text-slate-600 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the United
            Republic of Tanzania, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">15. Contact</h2>
          <p className="text-slate-600 leading-relaxed">
            For questions, concerns, or requests regarding these Terms of Service, contact us at{" "}
            <a href="mailto:info@konekt.co.tz" className="text-[#20364D] underline">info@konekt.co.tz</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
