/**
 * Wyzie Worker - Cloudflare Worker Proxy
 * Injects NITRO_API_TOKEN server-side and protects it with NITRO_WORKER_KEY Bearer auth.
 *
 * Deploy to Cloudflare Workers with two secrets:
 * - NITRO_API_TOKEN: Your Wyzie API Key
 * - NITRO_WORKER_KEY: A custom secret Bearer key you choose
 *
 * Request Flow:
 * CineVerse Backend -> your-worker.workers.dev/search?id=... (with Authorization: Bearer <NITRO_WORKER_KEY>)
 * Worker           -> sub.wyzie.io/search?id=...&key=<NITRO_API_TOKEN>
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
      });
    }

    // 1. Verify NITRO_WORKER_KEY is configured in worker environment
    if (!env.NITRO_WORKER_KEY) {
      return new Response(
        JSON.stringify({ error: "Service Unavailable: NITRO_WORKER_KEY secret is not set." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Validate Authorization: Bearer <NITRO_WORKER_KEY>
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${env.NITRO_WORKER_KEY}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing NITRO_WORKER_KEY Bearer token." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Verify NITRO_API_TOKEN is configured in worker environment
    if (!env.NITRO_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Service Unavailable: NITRO_API_TOKEN secret is not set." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Forward request to sub.wyzie.io with the Wyzie API token attached
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(`https://sub.wyzie.io${incomingUrl.pathname}${incomingUrl.search}`);
    targetUrl.searchParams.set("key", env.NITRO_API_TOKEN);

    try {
      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: {
          "User-Agent": "CineVerse-WyzieWorker/1.0",
          Accept: "application/json, text/plain, */*",
        },
      });

      // Forward response with permissive CORS for backend ingestion
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Wyzie upstream fetch failed: " + err.message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
