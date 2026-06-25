/**
 * MishiPass Worker — minimal entrypoint.
 * Route handlers, auth, and dashboard logic are not yet implemented.
 * This stub satisfies the wrangler.toml `main` entry so the vitest
 * pool-workers environment can boot the D1 binding for integration tests.
 */

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    return new Response("MishiPass worker is not yet serving requests.", {
      status: 503,
    });
  },
};
