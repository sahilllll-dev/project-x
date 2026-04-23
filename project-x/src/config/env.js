const requiredEnv = ['VITE_API_BASE_URL']
const missingEnv = requiredEnv.filter((key) => !import.meta.env[key])

if (missingEnv.length > 0) {
  throw new Error(`Missing ENV variable: ${missingEnv.join(', ')}`)
}

const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''

export const ENV = Object.freeze({
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_KEY: supabaseKey,
  IS_DEV: import.meta.env.DEV,
})
