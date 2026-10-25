/** Admin WhatsApp number (country code + number, no + or spaces). */
export const ADMIN_WHATSAPP = '919100664083';

export const PRIMARY_PHONE = '9100664083';
export const SECONDARY_PHONE = '9100696424';
export const ADDRESS_LINE = '8-5-199, Mallikarjuna Colony, Old Bowenpally, Hyderabad 500011';

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export function buildCallUrl(phone = PRIMARY_PHONE): string {
  return `tel:+91${phone.replace(/\D/g, '')}`;
}

export function buildMapsUrl(address = ADDRESS_LINE): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
