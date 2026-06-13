import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken } from "../_shared/driveAuth.ts";
import { requireAdmin } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAdmin(req.headers.get("authorization") || "");

    const { fileId, dbId } = await req.json();

    if (!fileId) {
      return new Response(JSON.stringify({ error: "fileId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the admin's Drive token (first user who connected Drive)
    // Fallback: try to get any available token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: tokenUser } = await supabase
      .from("user_tokens")
      .select("user_id")
      .limit(1)
      .single();

    const token = tokenUser ? await getAccessToken(tokenUser.user_id) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "No Drive token available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );

    if (!driveRes.ok && driveRes.status !== 404) {
      return new Response(JSON.stringify({ error: "Drive delete failed" }), {
        status: driveRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dbId) {
      await supabase.from("files").delete().eq("id", dbId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
