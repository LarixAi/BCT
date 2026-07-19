export function getSupabaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing VITE_SUPABASE_URL");
  return url;
}

export function getSupabaseAnonKey() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing VITE_SUPABASE_ANON_KEY");
  return key;
}
