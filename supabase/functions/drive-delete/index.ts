import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken } from "../_shared/driveAuth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { fileId, dbId } = await req.json();

    if (!fileId) {
      return new Response(JSON.stringify({ error: "fileId required" }), {
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
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      await supabase.from("files").delete().eq("id", dbId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
