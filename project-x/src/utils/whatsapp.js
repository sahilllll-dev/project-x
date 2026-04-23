const WHATSAPP_PHONE_PATTERN = /^[1-9]\d{7,14}$/

export const INVALID_WHATSAPP_PHONE_MESSAGE =
  'Use a full WhatsApp number with country code. Example: 919876543210'

export function normalizeWhatsAppPhone(value) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .replace(/^00/, '')
}

export function isValidWhatsAppPhone(value) {
  return WHATSAPP_PHONE_PATTERN.test(normalizeWhatsAppPhone(value))
}

export function getWhatsAppPhoneError(value) {
  const normalizedPhone = normalizeWhatsAppPhone(value)

  if (!normalizedPhone) {
    return 'Phone number is required when WhatsApp chat is enabled'
  }

  if (!WHATSAPP_PHONE_PATTERN.test(normalizedPhone)) {
    return INVALID_WHATSAPP_PHONE_MESSAGE
  }

  return ''
}

export function buildWhatsAppLink(phone, message) {
  const normalizedPhone = normalizeWhatsAppPhone(phone)

  if (!WHATSAPP_PHONE_PATTERN.test(normalizedPhone)) {
    return ''
  }

  const normalizedMessage = String(message ?? '').trim()

  if (!normalizedMessage) {
    return `https://wa.me/${normalizedPhone}`
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(normalizedMessage)}`
}
