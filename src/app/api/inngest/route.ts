import { serve } from "inngest/next";
import { inngest, inngestFunctions } from "@/lib/jobs/inngest";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export const { GET, POST, PUT } = serve({ client: inngest, functions: inngestFunctions });
