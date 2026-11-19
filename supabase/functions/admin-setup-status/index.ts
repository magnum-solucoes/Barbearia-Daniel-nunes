import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Public, read-only endpoint. It ONLY reports whether an administrator
// already exists, so the frontend knows whether to show the first-run
// setup form. It never exposes emails, ids or any personal data.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      return json({ error: "SERVER_ERROR", message: "Servidor mal configurado." }, 500);
    }

    const client = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { count, error } = await client
      .from("admin_users")
      .select("user_id", { count: "exact", head: true });

    if (error) {
      return json({ error: "QUERY_FAILED", message: "Não foi possível verificar o estado." }, 500);
    }

    return json({ ok: true, configured: (count ?? 0) > 0 });
  } catch (e) {
    return json({ error: "SERVER_ERROR", message: String(e) }, 500);
  }
});
