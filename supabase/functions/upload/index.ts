import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken } from "../_shared/driveAuth.ts";

const DRIVE_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID")!;
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
    const token = await getAccessToken();
    const formData = await req.formData();
    const file = formData.get("file");
    const title = formData.get("title")?.toString() || file.name;
    const categoryId = formData.get("categoryId")?.toString() || null;
    const notes = formData.get("notes")?.toString() || "";

    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = {
      name: file.name,
      parents: [DRIVE_FOLDER_ID],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return new Response(JSON.stringify({ error: "Drive upload failed", detail: err }), {
        status: uploadRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveFile = await uploadRes.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error: dbError } = await supabase.from("files").insert({
      title,
      category_id: categoryId || null,
      notes: notes || null,
      drive_file_id: driveFile.id,
      file_size: file.size,
      mime_type: file.type,
    });

    if (dbError) {
      return new Response(JSON.stringify({ error: "Database insert failed", detail: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, fileId: driveFile.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Function error", detail: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
