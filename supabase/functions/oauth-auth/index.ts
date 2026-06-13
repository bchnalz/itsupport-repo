const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const REDIRECT_URI = "https://vufzatynwjzbuwtkdquv.supabase.co/functions/v1/oauth-callback";

Deno.serve((req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", token);

  return Response.redirect(authUrl.toString(), 302);
});
