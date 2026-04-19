const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const isSupabaseAdminConfigured = Boolean(
  supabaseUrl && supabaseServiceRoleKey,
)

const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
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
