import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const REDIRECT_URI = "https://vufzatynwjzbuwtkdquv.supabase.co/functions/v1/oauth-callback";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://itsupport-repo.vercel.app";

function renderPage(title: string, heading: string, message: string, isSuccess: boolean): string {
  const icon = isSuccess
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      padding: 1rem;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 10px 40px rgba(0,0,0,0.06);
      max-width: 400px;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon { margin-bottom: 1.25rem; }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 0.5rem;
    }
    p {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.5rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
      background: #0f172a;
      color: #ffffff;
      border: none;
      cursor: pointer;
    }
    .btn:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,23,42,0.2); }
    .btn:active { transform: translateY(0); }
    .btn-outline {
      background: transparent;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }
    .btn-outline:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #cbd5e1;
      box-shadow: none;
    }
    .actions { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
    .close-link {
      font-size: 0.75rem;
      color: #94a3b8;
      text-decoration: none;
      cursor: pointer;
    }
    .close-link:hover { color: #475569; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${heading}</h1>
    <p>${message}</p>
    <div class="actions">
      <a href="${APP_URL}" class="btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Back to App
      </a>
      <a class="close-link" href="javascript:window.close()">Close this window</a>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const state = url.searchParams.get("state") || "";

  if (oauthError) {
    return new Response(
      renderPage("Connection Failed", "Connection Failed", oauthError === "access_denied"
        ? "You denied the Google Drive connection request. To use file uploads, you need to grant access."
        : `OAuth error: ${oauthError}`
      , false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new Response(
      renderPage("Error", "Missing Authorization Code", "The callback didn't receive an authorization code. Please try connecting again from the app.", false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
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
    return new Response(
      renderPage("Error", "Token Exchange Failed", "Google couldn't verify the authorization. Please try connecting again.", false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!tokens.refresh_token) {
    return new Response(
      renderPage("Error", "No Refresh Token", "Google didn't return a refresh token. Please revoke app access in your Google account settings and try again.", false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  let userId = "";
  try {
    const payload = JSON.parse(atob(state.split(".")[1]));
    userId = payload.sub;
  } catch {
    return new Response(
      renderPage("Error", "Invalid Session", "Your session expired while connecting. Please go back to the app and try connecting again.", false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!userId) {
    return new Response(
      renderPage("Error", "Unknown User", "Could not identify your account. Please log out and log in again, then retry.", false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error: upsertError } = await supabase
    .from("user_tokens")
    .upsert({ user_id: userId, refresh_token: tokens.refresh_token }, { onConflict: "user_id" });

  if (upsertError) {
    return new Response(
      renderPage("Error", "Failed to Save Connection", upsertError.message, false),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  return new Response(
    renderPage("Connected", "Google Drive Connected", "Your Google Drive is now linked. You can upload files directly to the repository.", true),
    { headers: { "Content-Type": "text/html" } }
  );
});
