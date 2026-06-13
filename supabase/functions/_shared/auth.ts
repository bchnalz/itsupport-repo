import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getUserId(authHeader: string): string {
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch {
    throw new Error("Authentication required");
  }
}

async function requireAdmin(authHeader: string): Promise<string> {
  const userId = getUserId(authHeader);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (data?.role !== "admin") {
    throw new Error("Admin access required");
  }
  return userId;
}

export { getUserId, requireAdmin };
