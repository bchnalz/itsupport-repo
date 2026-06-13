const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cache = new Map<string, { token: string; expires: number }>();

async function getAccessToken(userId: string): Promise<string> {
  const cached = cache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.token;
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from("user_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Google Drive not connected. Go to Settings to connect your Google account.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    cache.delete(userId);
    const err = await res.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const tokenData = await res.json();
  cache.set(userId, {
    token: tokenData.access_token,
    expires: Date.now() + (tokenData.expires_in || 3600) * 1000 - 60000,
  });
  return tokenData.access_token;
}

export { getAccessToken };
