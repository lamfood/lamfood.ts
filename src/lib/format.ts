/** Format a number with Persian digits and thousands separator (e.g. 1250 → «۱٬۲۵۰»). */
export function faNumber(n: number): string {
  try {
    return new Intl.NumberFormat("fa-IR").format(n)
  } catch {
    return String(n)
  }
}

/**
 * Format a menu price. Prices are stored as integers in «هزار تومان» units.
 *
 * - Below 1000: «۲۵۰ هزار تومان» (250,000 Toman)
 * - 1000 or above: «۱.۲۵۵ میلیون تومان» (1,255,000 Toman = 1.255 million)
 *   Whole millions show without decimals: «۲ میلیون تومان».
 */
export function formatPrice(price: number): string {
  if (price < 1000) {
    return `${faNumber(price)} هزار تومان`
  }
  const millions = price / 1000
  // Whole number → no decimals; otherwise show up to 3 decimal places.
  const faMillions = new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(millions)
  return `${faMillions} میلیون تومان`
}
