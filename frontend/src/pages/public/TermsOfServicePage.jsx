import React from "react";
import { FileText } from "lucide-react";
import LegalPageLayout from "../../components/public/LegalPageLayout";
import { useBranding } from "../../contexts/BrandingContext";

export default function TermsOfServicePage() {
  const { brand_name } = useBranding();
  const bn = brand_name || "Konekt";

  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      content: (
        <p>
          By accessing or using the {bn} platform ("Platform"), you agree to be bound by these
          Terms of Service ("Terms"). {bn} provides a B2B commerce platform where businesses
          can order products, request services, and manage procurement through a single, structured
          system. If you do not agree to these Terms, you must not use the Platform.
        </p>
      ),
    },
    {
      id: "services-provided",
      title: "Services Provided",
      content: (
        <p>
          {bn} offers businesses a unified ordering system for products and services including,
          but not limited to, office equipment, stationery, promotional materials, printing,
          business services, equipment maintenance, and event logistics. {bn} handles the complete
          order lifecycle: from product sourcing and payment verification to order processing and
          delivery coordination.
        </p>
      ),
    },
    {
      id: "account-registration",
      title: "Account Registration",
      content: (
        <>
          <p>
            The Platform supports both guest checkout (no account required) and registered accounts.
            Guest orders are tracked by email address and order number. By creating a registered
            account, you gain access to order history, tracking, invoices, referral rewards, wallet
            balance, and reorder functionality.
          </p>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials —
            including email/password and phone/PIN combinations — and for all activity that occurs
            under your account. You must notify us immediately of any unauthorized use.
          </p>
        </>
      ),
    },
    {
      id: "ordering-payment",
      title: "Ordering & Payment",
      content: (
        <>
          <p>
            All orders placed through the Platform are subject to product availability and payment
            verification. The ordering process works as follows:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>You browse the marketplace or submit a custom quote request</li>
            <li>For marketplace orders, you add items to your cart and proceed to checkout</li>
            <li>You receive bank transfer details and transfer the exact invoiced amount</li>
            <li>You upload proof of payment through the Platform</li>
            <li>Our admin team verifies the payment</li>
            <li>Once verified, the order moves into processing, sourcing, and delivery</li>
          </ol>
          <p>
            Prices shown on the Platform are in Tanzanian Shillings (TZS) unless otherwise stated.
            Quoted prices are valid for the period specified on the quote document. All payments
            are subject to verification before orders are processed.
          </p>
        </>
      ),
    },
    {
      id: "wallet-referrals",
      title: "Wallet Credits & Referrals",
      content: (
        <>
          <p>
            Registered users may earn wallet credits through the referral program. Wallet credits
            can be applied toward future purchases subject to the following rules:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Wallet credits are non-transferable and cannot be redeemed for cash</li>
            <li>Maximum wallet usage per order is capped (as configured by platform administrators)</li>
            <li>Credits are earned only when a referred user completes a verified purchase</li>
            <li>{bn} reserves the right to modify, suspend, or terminate the referral program at any time</li>
          </ul>
        </>
      ),
    },
    {
      id: "delivery",
      title: "Delivery & Fulfillment",
      content: (
        <>
          <p>
            Delivery timelines vary by product type, availability, and delivery location. Standard
            orders are typically delivered within 3–7 business days after payment verification.
            Custom orders and services may require longer lead times as specified in the quote.
          </p>
          <p>
            {bn} coordinates delivery through its partner network. You will receive status updates
            as your order moves through processing stages. Delivery schedules are estimates and
            may be affected by supply chain or logistics factors outside our control.
          </p>
        </>
      ),
    },
    {
      id: "pricing-taxes",
      title: "Pricing & Taxes",
      content: (
        <p>
          All prices include applicable VAT unless explicitly stated otherwise. {bn} reserves the
          right to adjust pricing for products and services at any time. Price changes do not affect
          orders that have already been confirmed and paid for. Custom quotes are valid for the
          duration specified on the quote document.
        </p>
      ),
    },
    {
      id: "cancellations-refunds",
      title: "Cancellations & Refunds",
      content: (
        <>
          <p>
            Orders may be cancelled before payment verification. Once payment is verified and the
            order enters processing, cancellation is subject to the following conditions:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Standard products: Cancellation may be possible if production has not started</li>
            <li>Custom/branded products: Orders cannot be cancelled once production begins</li>
            <li>Services: Cancellation terms are as specified in the service quote</li>
          </ul>
          <p>
            Refunds, when approved, are processed via bank transfer to the original payment account.
            Refund processing times may vary depending on the banking institution.
          </p>
        </>
      ),
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property",
      content: (
        <p>
          All content on the Platform — including but not limited to text, graphics, logos, icons,
          images, and software — is the property of {bn} or its licensors and is protected by
          applicable intellectual property laws. You may not reproduce, distribute, or create
          derivative works from Platform content without prior written permission.
        </p>
      ),
    },
    {
      id: "prohibited-use",
      title: "Prohibited Use",
      content: (
        <>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Use the Platform for any unlawful purpose</li>
            <li>Submit fraudulent orders or payment proofs</li>
            <li>Attempt to access other users' accounts or data</li>
            <li>Abuse the referral or wallet credit system (e.g., self-referrals, fake accounts)</li>
            <li>Interfere with the Platform's operation or security</li>
            <li>Scrape, crawl, or extract data from the Platform without authorization</li>
          </ul>
        </>
      ),
    },
    {
      id: "limitation-liability",
      title: "Limitation of Liability",
      content: (
        <>
          <p>
            {bn} acts as a platform connecting businesses with products, services, and fulfillment
            partners. While we coordinate the entire order lifecycle, the following limitations apply:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>{bn} is not liable for delays caused by third-party vendors or logistics partners</li>
            <li>Our liability for any order does not exceed the amount paid for that specific order</li>
            <li>{bn} is not responsible for product defects attributable to partner manufacturing</li>
          </ul>
          <p>
            We will make commercially reasonable efforts to resolve any issues and work with our
            partner network to ensure quality and timely delivery.
          </p>
        </>
      ),
    },
    {
      id: "changes-to-terms",
      title: "Changes to Terms",
      content: (
        <p>
          We may update these Terms from time to time. Material changes will be communicated via
          the Platform notification system. Continued use of the Platform after changes are posted
          constitutes acceptance of the updated Terms. We recommend reviewing this page periodically.
        </p>
      ),
    },
    {
      id: "governing-law",
      title: "Governing Law",
      content: (
        <p>
          These Terms are governed by and construed in accordance with the laws of the United
          Republic of Tanzania. Any disputes arising from or relating to these Terms or your use
          of the Platform shall be subject to the exclusive jurisdiction of the courts of Tanzania.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      content: (
        <p>
          For questions about these Terms of Service, please contact our support team through the
          Help Center or reach out to your assigned sales representative.
        </p>
      ),
    },
  ];

  return (
      <LegalPageLayout
        icon={FileText}
        title="Terms of Service"
        subtitle={`The terms and conditions governing your use of the ${bn} platform.`}
        lastUpdated="February 2026"
        sections={sections}
      />
  );
}
