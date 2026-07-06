import { createClient } from "@supabase/supabase-js";

// Env vars are inlined at build time. If they're missing (e.g. not configured on the
// deploy target), fall back to a valid-format placeholder so createClient never THROWS at
// module load — that would white-screen the app before the ErrorBoundary can mount.
// Network calls will simply fail and the app runs fully in guest mode.
const supabaseUrl     = (import.meta.env.VITE_SUPABASE_URL as string)      || "https://placeholder.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "public-anon-key-placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
