/**
 * Ambient type declarations for the "cloudflare:test" virtual module
 * provided by @cloudflare/vitest-pool-workers at test runtime.
 *
 * Only the exports actually used by the test suite are declared here.
 */

declare module "cloudflare:test" {
  interface D1MigrationEntry {
    name: string;
    queries: string[];
  }

  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1MigrationEntry[];
  }

  export const env: ProvidedEnv;
  export function applyD1Migrations(
    db: D1Database,
    migrations: D1MigrationEntry[],
  ): Promise<void>;
}
