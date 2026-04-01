import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * CustomerLinkCell — Clickable customer name cell.
 * Opens the Customer 360 drawer (via onClickDrawer callback) or navigates to profile page.
 *
 * Props:
 *   customerId   - the customer's uid
 *   customerName - display name
 *   onClickDrawer - (optional) callback(customerId) to open the drawer
 *   className     - extra CSS classes
 */
export default function CustomerLinkCell({ customerId, customerName, onClickDrawer, className = "" }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClickDrawer) {
      onClickDrawer(customerId);
    } else {
      navigate(`/admin/customers/${customerId}`);
    }
  };

  if (!customerName || customerName === "-") {
    return <span className={`text-sm text-slate-400 ${className}`}>-</span>;
  }

  return (
    <button
      onClick={handleClick}
      data-testid={`customer-link-${customerId}`}
      className={`text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline underline-offset-2 transition-colors text-left truncate max-w-[180px] ${className}`}
      title={customerName}
    >
      {customerName}
    </button>
  );
}
