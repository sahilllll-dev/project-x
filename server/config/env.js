const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  missing.forEach((key) => {
    console.error(`Missing ENV: ${key}`)
  })
  process.exit(1)
}

const ENV = Object.freeze({
  PORT: Number(process.env.PORT) || 5001,
  FRONTEND_URL: process.env.FRONTEND_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || '',
  ORDER_NOTIFICATION_EMAIL: process.env.ORDER_NOTIFICATION_EMAIL || '',
})

console.log('ENV Loaded:', {
  supabase: Boolean(ENV.SUPABASE_URL),
})

module.exports = {
  ENV,
}
