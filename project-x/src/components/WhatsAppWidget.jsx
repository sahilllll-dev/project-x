import { MessageCircle } from 'lucide-react'
import { buildWhatsAppLink } from '../utils/whatsapp.js'

function WhatsAppWidget({ phone, message, position = 'right' }) {
  const href = buildWhatsAppLink(phone, message)

  if (!href) {
    return null
  }

  return (
    <a
      className={`whatsapp-widget whatsapp-widget--${position === 'left' ? 'left' : 'right'}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
    >
      <span className="whatsapp-widget__icon" aria-hidden="true">
        <MessageCircle size={20} strokeWidth={2.4} />
      </span>
      <span className="whatsapp-widget__label">WhatsApp us</span>
    </a>
  )
}

export default WhatsAppWidget
