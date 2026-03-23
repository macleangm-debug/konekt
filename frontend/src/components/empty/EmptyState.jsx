import React from "react";
import { Link } from "react-router-dom";
import { FileText, ShoppingCart, Receipt, Package, Inbox } from "lucide-react";

const ICONS = {
  quotes: FileText,
  orders: ShoppingCart,
  invoices: Receipt,
  products: Package,
  default: Inbox,
};

export default function EmptyState({ 
  title = "Nothing here yet", 
  message = "Start by taking an action", 
  link = "/", 
  button = "Get Started",
  icon = "default",
  variant = "default"  // default, minimal, card
}) {
  const IconComponent = ICONS[icon] || ICONS.default;
  
  if (variant === "minimal") {
    return (
      <div className="text-center py-12" data-testid="empty-state">
        <IconComponent className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">{message}</p>
        {link && button && (
          <Link to={link} className="inline-block mt-3 text-[#20364D] font-medium text-sm hover:underline">
            {button} →
          </Link>
        )}
      </div>
    );
  }
  
  return (
    <div className="text-center p-10 border rounded-2xl bg-white" data-testid="empty-state">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <IconComponent className="w-8 h-8 text-slate-400" />
      </div>
      <h2 className="text-xl font-bold text-[#20364D]">{title}</h2>
      <p className="text-slate-600 mt-2 max-w-sm mx-auto">{message}</p>
      {link && button && (
        <Link 
          to={link} 
          className="inline-flex items-center gap-2 mt-6 bg-[#20364D] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#2a4563] transition"
        >
          {button}
        </Link>
      )}
    </div>
  );
}

// Specialized empty states
export function EmptyQuotes() {
  return (
    <EmptyState
      title="No quotes yet"
      message="Request a service or browse products to get your first quote."
      link="/account/services"
      button="Request Service"
      icon="quotes"
    />
  );
}

export function EmptyOrders() {
  return (
    <EmptyState
      title="No orders yet"
      message="Once you complete a checkout, your orders will appear here."
      link="/account/marketplace"
      button="Browse Marketplace"
      icon="orders"
    />
  );
}

export function EmptyInvoices() {
  return (
    <EmptyState
      title="No invoices yet"
      message="Invoices will appear here after you pay for quotes."
      link="/dashboard/quotes"
      button="View Quotes"
      icon="invoices"
    />
  );
}

export function EmptyCart() {
  return (
    <EmptyState
      title="Your cart is empty"
      message="Add products from the marketplace to get started."
      link="/account/marketplace"
      button="Browse Products"
      icon="products"
    />
  );
}
