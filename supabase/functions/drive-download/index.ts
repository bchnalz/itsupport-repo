import { getAccessToken } from "../_shared/driveAuth.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getUserId(authHeader: string): string {
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch {
    throw new Error("Authentication required");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserId(req.headers.get("authorization") || "");
    const token = await getAccessToken(userId);
    const { fileId } = await req.json();

    if (!fileId) {
      return new Response(JSON.stringify({ error: "fileId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink,webViewLink`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to get file" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ url: data.webContentLink || data.webViewLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
