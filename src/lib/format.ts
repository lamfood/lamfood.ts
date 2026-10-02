/** Format a number with Persian digits and thousands separator (e.g. 1250 → «۱٬۲۵۰»). */
export function faNumber(n: number): string {
  try {
    return new Intl.NumberFormat("fa-IR").format(n)
  } catch {
    return String(n)
  }
}

/**
 * Format a menu price. Prices are stored as integers in «هزار تومان» units,
 * e.g. 200 → «۲۰۰ هزار تومان».
 */
export function formatPrice(price: number): string {
  return `${faNumber(price)} هزار تومان`
}
