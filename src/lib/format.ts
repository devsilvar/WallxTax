/**
 * Financial Formatting Utilities for PayMyTax Frontend
 * Handles currency (NGN), compact numbers, and localized date presentation.
 */

export function formatNaira(
  amount: number | string | undefined | null,
  compact = false
): string {
  if (amount === undefined || amount === null || amount === '') return '₦0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₦0.00';

  if (compact) {
    if (Math.abs(num) >= 1_000_000) {
      return `₦${(num / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(num) >= 1_000) {
      return `₦${(num / 1_000).toFixed(1)}K`;
    }
  }

  return `₦${num.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
