import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken } from "../_shared/driveAuth.ts";

const DRIVE_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseJWT(authHeader: string): { sub: string; email: string } | null {
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { sub: payload.sub, email: payload.email || "" };
  } catch {
    return null;
  }
}

async function generateTags(
  title: string,
  fileName: string,
  notes: string
): Promise<string[]> {
  const prompt = `Extract 3-5 concise, searchable tags from this file. Tags should be lowercase, single words or short phrases (max 3 words). Focus on: software name, document type, version, department, year, format.

Title: ${title}
Filename: ${fileName}
Notes: ${notes || "none"}

Return ONLY a JSON array of strings, e.g. ["excel", "laporan", "2025"]. No other text.`;

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 80,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    console.error("DeepSeek error:", await res.text());
    return fallbackTags(fileName);
  }

  const data = await res.json();
  try {
    const tags: string[] = JSON.parse(data.choices[0].message.content);
    return tags.filter((t) => t.length > 1 && t.length < 40).slice(0, 5);
  } catch {
    return fallbackTags(fileName);
  }
}

function fallbackTags(fileName: string): string[] {
  return fileName
    .replace(/\.[^.]+$/, "")
    .split(/[\s_\-.,;:]+/)
    .filter((w) => w.length > 1)
    .map((w) => w.toLowerCase())
    .slice(0, 5);
}

async function saveTags(supabase: ReturnType<typeof createClient>, fileId: string, tagNames: string[]) {
  for (const name of tagNames) {
    const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9\s\-]/g, "").substring(0, 50);
    if (!cleanName) continue;

    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("name", cleanName)
      .single();

    let tagId = existing?.id;
    if (!tagId) {
      const { data: created } = await supabase
        .from("tags")
        .insert({ name: cleanName })
        .select("id")
        .single();
      tagId = created?.id;
    }

    if (tagId) {
      await supabase.from("file_tags").upsert(
        { file_id: fileId, tag_id: tagId },
        { onConflict: "file_id,tag_id" }
      );
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const jwt = parseJWT(req.headers.get("authorization") || "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveToken = await getAccessToken(jwt.sub);

    const formData = await req.formData();
    const file = formData.get("file");
    const title = formData.get("title")?.toString() || file.name;
    const notes = formData.get("notes")?.toString() || "";
    const tagsJson = formData.get("tags")?.toString() || "[]";
    let tags: string[] = [];

    try { tags = JSON.parse(tagsJson) } catch {}

    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = { name: file.name, parents: [DRIVE_FOLDER_ID] };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      { method: "POST", headers: { Authorization: `Bearer ${driveToken}` }, body: form }
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

    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        title,
        notes: notes || null,
        drive_file_id: driveFile.id,
        file_size: file.size,
        mime_type: file.type,
        file_name: file.name,
        uploaded_by: jwt.sub,
        uploaded_by_email: jwt.email,
      })
      .select("id")
      .single();

    if (dbError || !fileRecord) {
      return new Response(JSON.stringify({ error: "Database insert failed", detail: dbError?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tags.length === 0) {
      tags = await generateTags(title, file.name, notes);
    }
    await saveTags(supabase, fileRecord.id, tags);

    return new Response(JSON.stringify({ success: true, fileId: driveFile.id, tags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Function error", detail: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
