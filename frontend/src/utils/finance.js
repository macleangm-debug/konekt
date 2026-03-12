/**
 * Konekt Finance Utilities
 * Shared helpers for money formatting and tax calculations
 */

export function formatMoney(value, currency = "TZS") {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

export function calculateTotals({ lineItems, discount = 0, taxRate = 0, taxEnabled = true }) {
  const subtotal = (lineItems || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );

  const cleanDiscount = Number(discount || 0);
  const taxableAmount = Math.max(subtotal - cleanDiscount, 0);
  const tax = taxEnabled ? taxableAmount * (Number(taxRate || 0) / 100) : 0;
  const total = taxableAmount + tax;

  return {
    subtotal,
    discount: cleanDiscount,
    tax,
    total,
  };
}
