import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseJWT(authHeader: string): { sub: string; email: string } | null {
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { sub: payload.sub, email: payload.email || "" };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = parseJWT(req.headers.get("authorization") || "");
    if (!jwt) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { title, notes, driveFileId, fileSize, mimeType, fileName, tags } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: fileRecord, error: dbError } = await supabase.from("files").insert({
      title, notes: notes || null, drive_file_id: driveFileId, file_size: fileSize,
      mime_type: mimeType, file_name: fileName, uploaded_by: jwt.sub, uploaded_by_email: jwt.email,
    }).select("id").single();

    if (dbError || !fileRecord) {
      return new Response(JSON.stringify({ error: dbError?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (tags?.length) {
      for (const name of tags) {
        const clean = name.toLowerCase().trim();
        let { data: tag } = await supabase.from("tags").select("id").eq("name", clean).single();
        if (!tag) { const { data: c } = await supabase.from("tags").insert({ name: clean }).select("id").single(); tag = c; }
        if (tag) await supabase.from("file_tags").upsert({ file_id: fileRecord.id, tag_id: tag.id }, { onConflict: "file_id,tag_id" });
      }
    }

    return new Response(JSON.stringify({ success: true, fileId: driveFileId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
