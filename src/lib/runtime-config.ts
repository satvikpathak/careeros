/**
 * Shared route configuration for API endpoints that call Gemini, parse PDFs,
 * upload to S3, or otherwise run longer than the default 10s edge limit.
 *
 * Next.js (Turbopack) requires route segment config to be static literals,
 * so routes cannot re-export these values directly. Instead, import this
 * type to maintain the linkage, then declare the literals inline:
 *
 *   import type { HeavyRouteConfig } from "@/lib/runtime-config";
 *   // satisfies static-analysis linkage
 *   export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
 *   export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
 *   export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";
 */
export const runtime = "nodejs" as const;
export const maxDuration = 60 as const;
export const dynamic = "force-dynamic" as const;

/** Type exported for routes to declare a nominal linkage to this config. */
export type HeavyRouteConfig = {
  runtime: typeof runtime;
  maxDuration: typeof maxDuration;
  dynamic: typeof dynamic;
};
