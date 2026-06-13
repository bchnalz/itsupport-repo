import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const REDIRECT_URI = "https://vufzatynwjzbuwtkdquv.supabase.co/functions/v1/oauth-callback";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`OAuth error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok) {
    return new Response(JSON.stringify({ error: "Token exchange failed", detail: tokens }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  if (tokens.refresh_token) {
    const { error: upsertError } = await supabase
      .from("app_settings")
      .upsert({ key: "google_refresh_token", value: tokens.refresh_token }, { onConflict: "key" });

    if (upsertError) {
      return new Response(JSON.stringify({ error: "Failed to save token", detail: upsertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(
    `<!DOCTYPE html><html><head><title>Connected</title></head><body style="font-family:sans-serif;text-align:center;padding-top:4rem"><h1 style="color:#080">Google Drive Connected</h1><p>itsupport-repo now has Drive access.</p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
});
