import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { withGlobalLogout } from './logoutFetch'

let client: SupabaseClient | null = null

export function createClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    client = createSupabaseClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!, {
      global: { fetch: withGlobalLogout(url, globalThis.fetch.bind(globalThis)) },
    })
  }
  return client
}
