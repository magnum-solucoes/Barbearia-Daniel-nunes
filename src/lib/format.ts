export function formatBRL(value: number | null | undefined): string {
  const n = typeof value === 'number' ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

export function formatPhoneBR(value: string | null | undefined): string {
  const d = onlyDigits(value || '');
  if (d.length === 13 && d.startsWith('55')) {
    return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return value || '';
}

/** Builds a wa.me link. The user must still tap send inside WhatsApp. */
export function whatsappLink(phone: string | null | undefined, message: string): string {
  const digits = onlyDigits(phone || '');
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Normalizes a Brazilian phone for wa.me. Returns the digits with the country
 * code (55) prefixed exactly once, or null when the number is missing/invalid.
 * Handles a leading trunk "0" and avoids duplicating the country code.
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  let d = onlyDigits(phone || '');
  if (!d) return null;
  // Remove a leading national trunk code (e.g. 0 before the DDD).
  d = d.replace(/^0+/, '');

  if (d.startsWith('55')) {
    const local = d.slice(2);
    // Already carries the country code: local number must be 10 (landline) or 11 (mobile).
    if (local.length === 10 || local.length === 11) return `55${local}`;
    return null;
  }

  // Local number without country code.
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return null;
}

/** Validated wa.me link. Returns null when the phone is missing/invalid. */
export function whatsappHref(
  phone: string | null | undefined,
  message: string,
): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export const WEEKDAYS_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function hhmm(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}