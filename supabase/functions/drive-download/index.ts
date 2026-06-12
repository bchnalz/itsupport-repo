import { getAccessToken } from "../_shared/driveAuth.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { fileId } = await req.json();
  if (!fileId) {
    return new Response(JSON.stringify({ error: "fileId required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink,webViewLink`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
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
});
