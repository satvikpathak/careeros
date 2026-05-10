/**
 * Shared route configuration for API endpoints that call Gemini, parse PDFs,
 * upload to S3, or otherwise run longer than the default 10s edge limit.
 *
 * Re-export these constants from any heavy route handler:
 *
 *   export { runtime, maxDuration, dynamic } from "@/lib/runtime-config";
 */
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
