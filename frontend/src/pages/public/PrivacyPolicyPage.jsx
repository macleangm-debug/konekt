import React from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10" data-testid="privacy-policy-page">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#20364D] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#20364D]/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#20364D]" />
        </div>
        <h1 className="text-3xl font-bold text-[#20364D]">Privacy Policy</h1>
      </div>

      <p className="text-sm text-slate-500 mb-8">Last updated: April 2026</p>

      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-[#20364D]">1. Information We Collect</h2>
          <p className="text-slate-600 leading-relaxed">
            When you use Konekt, we collect information you provide directly, including your name,
            email address, phone number, company name, delivery address, and payment information.
            We also collect order details such as products ordered, quantities, and transaction amounts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">2. How We Use Your Information</h2>
          <p className="text-slate-600 leading-relaxed">We use the information we collect to:</p>
          <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
            <li>Process and fulfill your orders</li>
            <li>Verify payments and prevent fraud</li>
            <li>Communicate order updates and confirmations</li>
            <li>Coordinate fulfillment and manage delivery</li>
            <li>Provide customer support</li>
            <li>Improve our platform and services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">3. Information Sharing</h2>
          <p className="text-slate-600 leading-relaxed">
            We share order-relevant information with our verified supply network solely for the purpose
            of fulfilling your orders. Fulfillment partners receive only the minimum information needed to complete
            their assigned work. We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">4. Payment Security</h2>
          <p className="text-slate-600 leading-relaxed">
            All payment proofs are securely stored and reviewed by our admin team. Payment information
            is handled with strict confidentiality. We use industry-standard security measures to
            protect your financial data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">5. Data Retention</h2>
          <p className="text-slate-600 leading-relaxed">
            We retain your account and order data for as long as your account is active or as needed
            to provide services. You may request deletion of your account by contacting our support team.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">6. Your Rights</h2>
          <p className="text-slate-600 leading-relaxed">
            You have the right to access, update, or delete your personal information at any time.
            You can manage your account details through your dashboard or contact us at{" "}
            <a href="mailto:info@konekt.co.tz" className="text-[#20364D] underline">info@konekt.co.tz</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#20364D]">7. Contact Us</h2>
          <p className="text-slate-600 leading-relaxed">
            If you have questions about this Privacy Policy, contact us at{" "}
            <a href="mailto:info@konekt.co.tz" className="text-[#20364D] underline">info@konekt.co.tz</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
