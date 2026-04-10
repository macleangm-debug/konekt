import React from "react";
import { Shield } from "lucide-react";
import LegalPageLayout from "../../components/public/LegalPageLayout";
import { useBranding } from "../../contexts/BrandingContext";

export default function PrivacyPolicyPage() {
  const { brand_name } = useBranding();
  const bn = brand_name || "Konekt";

  const sections = [
    {
      id: "information-we-collect",
      title: "Information We Collect",
      content: (
        <>
          <p>
            When you use {bn}, we collect information you provide directly and information
            generated through your use of the platform. This includes:
          </p>
          <p><strong>Account Information</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Full name, email address, phone number, and company/business name</li>
            <li>Delivery address(es) and billing information</li>
            <li>Account credentials (passwords are securely hashed and never stored in plain text)</li>
            <li>Referral codes and wallet activity</li>
          </ul>
          <p><strong>Transaction Information</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Products and services ordered, quantities, pricing, and order history</li>
            <li>Payment proof uploads (bank transfer receipts)</li>
            <li>Invoices, quotes, and procurement records</li>
          </ul>
          <p><strong>Usage Information</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Pages visited, features used, and interaction patterns</li>
            <li>Device type, browser, and IP address</li>
            <li>Notification preferences and communication history</li>
          </ul>
        </>
      ),
    },
    {
      id: "how-we-use",
      title: "How We Use Your Information",
      content: (
        <>
          <p>We use collected information to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Process and fulfill your orders, quotes, and service requests</li>
            <li>Verify payments and prevent fraudulent transactions</li>
            <li>Communicate order updates, delivery status, and payment confirmations</li>
            <li>Provide customer support and account management</li>
            <li>Calculate and credit referral rewards and wallet balances</li>
            <li>Generate invoices, delivery notes, and procurement documents</li>
            <li>Improve platform features, performance, and reliability</li>
            <li>Send system notifications (configurable via your notification preferences)</li>
          </ul>
        </>
      ),
    },
    {
      id: "information-sharing",
      title: "Information Sharing",
      content: (
        <>
          <p>
            We do <strong>not</strong> sell your personal information to third parties. Information
            is shared only as necessary to operate the platform:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Vendors/Partners:</strong> Receive only the information required to fulfill
              your order (product details, quantities, delivery requirements). They do not receive
              your financial information, pricing margins, or full contact details.
            </li>
            <li>
              <strong>Sales Team:</strong> Your assigned sales representative has access to your
              account details to provide personalized support.
            </li>
            <li>
              <strong>Payment Processors:</strong> If card or mobile money payments are enabled,
              transaction data is shared with the respective processor under their own privacy policies.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may disclose information when required by law,
              regulation, or legal process.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "payment-security",
      title: "Payment Security",
      content: (
        <>
          <p>
            All payment proofs are securely stored and reviewed by authorized admin personnel only.
            We implement the following security measures:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Payment verification is performed by the admin team before order processing</li>
            <li>Bank account details displayed on invoices are verified and controlled by administrators</li>
            <li>All data transmission uses HTTPS/TLS encryption</li>
            <li>Password and PIN credentials are one-way hashed using industry-standard algorithms</li>
          </ul>
        </>
      ),
    },
    {
      id: "data-retention",
      title: "Data Retention",
      content: (
        <p>
          We retain your account information and transaction history for as long as your account
          is active or as needed to provide services. Order records, invoices, and payment history
          are retained for accounting and regulatory compliance purposes. You may request account
          deletion by contacting our support team, after which personal data will be removed within
          30 days, except where retention is legally required.
        </p>
      ),
    },
    {
      id: "cookies",
      title: "Cookies & Local Storage",
      content: (
        <>
          <p>
            {bn} uses browser local storage and session tokens for:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Maintaining your login session (JWT authentication tokens)</li>
            <li>Storing your market/country preference</li>
            <li>Remembering notification and display preferences</li>
          </ul>
          <p>
            We do not use third-party advertising cookies. Analytics, if enabled, use
            privacy-respecting approaches that do not track you across other websites.
          </p>
        </>
      ),
    },
    {
      id: "your-rights",
      title: "Your Rights",
      content: (
        <>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Access and review the personal information we hold about you</li>
            <li>Correct inaccurate information via your account settings</li>
            <li>Request deletion of your account and associated personal data</li>
            <li>Manage your notification preferences at any time</li>
            <li>Withdraw consent for optional data processing</li>
          </ul>
          <p>
            To exercise these rights, contact our support team or update your preferences
            directly from your account settings.
          </p>
        </>
      ),
    },
    {
      id: "third-party-services",
      title: "Third-Party Services",
      content: (
        <p>
          Our platform may integrate with third-party services for payments, messaging, and
          analytics. Each third party operates under their own privacy policy. We encourage you
          to review those policies. {bn} is not responsible for the privacy practices of
          external services.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      content: (
        <p>
          We may update this Privacy Policy from time to time. When we make material changes,
          we will notify active users via the platform notification system. Continued use of the
          platform after changes constitutes acceptance of the updated policy.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact Us",
      content: (
        <p>
          If you have questions about this Privacy Policy or how your data is handled,
          please contact our support team through the Help Center or via your assigned
          sales representative.
        </p>
      ),
    },
  ];

  return (
      <LegalPageLayout
        icon={Shield}
        title="Privacy Policy"
        subtitle={`How ${bn} collects, uses, and protects your information.`}
        lastUpdated="February 2026"
        sections={sections}
      />
  );
}
