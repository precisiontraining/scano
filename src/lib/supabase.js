import { createClient } from '@supabase/supabase-js'

// Single shared browser Supabase client.
//
// Calling createClient() in multiple modules spawns multiple GoTrueClient
// instances in the same window. They each maintain their own auth state,
// fight over localStorage tokens, and a write started by a client without
// the session attached returns 400/401 against RLS policies. Always import
// this re-export — never call createClient() at module scope elsewhere.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)
