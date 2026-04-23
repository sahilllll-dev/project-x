const { ENV } = require('./config/env')

const { createClient } = require('@supabase/supabase-js')

const isSupabaseAdminConfigured = Boolean(
  ENV.SUPABASE_URL && ENV.SUPABASE_KEY,
)

const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase admin is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  return supabaseAdmin
}

module.exports = {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
  supabaseAdmin,
}
