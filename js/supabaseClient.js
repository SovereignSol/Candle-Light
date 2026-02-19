window.Supa = (() => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG || {};

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || String(SUPABASE_URL).includes("YOUR-PROJECT-REF")) {
    console.warn("Supabase config is not set yet. Update /js/config.js.");
  }

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return { client };
})();
