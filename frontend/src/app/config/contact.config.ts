/** Admin WhatsApp number (country code + number, no + or spaces). */
export const ADMIN_WHATSAPP = '919959913288';

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
