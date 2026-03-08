import { corsResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return corsResponse();
  return jsonResponse({ ok: true });
});
