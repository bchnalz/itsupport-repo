import { getAccessToken } from "../_shared/driveAuth.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "content-disposition, x-filename",
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

    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const meta = await metaRes.json();

    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!fileRes.ok) {
      return new Response(JSON.stringify({ error: "Download failed" }), {
        status: fileRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blob = await fileRes.blob();
    const filename = meta.name || "download";
    return new Response(blob, {
      headers: {
        ...corsHeaders,
        "Content-Type": meta.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Filename": filename,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
