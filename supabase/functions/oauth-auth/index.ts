const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const REDIRECT_URI = "https://vufzatynwjzbuwtkdquv.supabase.co/functions/v1/oauth-callback";

Deno.serve((req) => {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return Response.redirect(url.toString(), 302);
});
