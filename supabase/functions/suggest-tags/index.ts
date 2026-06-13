import { getUserId } from "../_shared/auth.ts";

const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY")!;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authentication
    getUserId(req.headers.get("authorization") || "");

    const { title, fileName } = await req.json();
    if (!title) {
      return new Response(JSON.stringify({ tags: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Generate exactly 4 concise tags for this file. Tags: lowercase, 1-3 words each. Focus on: software name, type, version, use case, format, department. Return ONLY a JSON array of exactly 4 strings. No other text.

Title: ${title}
Filename: ${fileName || title}

Example: ["excel", "laporan", "keuangan", "2025"]`;

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
      return new Response(JSON.stringify({ tags: fallback(title, fileName) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    try {
      const tags: string[] = JSON.parse(data.choices[0].message.content);
      return new Response(JSON.stringify({ tags: tags.filter(t => t.length > 1).slice(0, 4) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ tags: fallback(title, fileName) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function fallback(title: string, fileName: string): string[] {
  const words = (fileName || title)
    .replace(/\.[^.]+$/, "")
    .split(/[\s_\-.,;:]+/)
    .filter(w => w.length > 1)
    .map(w => w.toLowerCase());
  return [...new Set(words)].slice(0, 4);
}
