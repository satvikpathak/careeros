import Link from "next/link";
import { Mail, TrendingUp, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

const TOOLS = [
  {
    href: "/dashboard/tools/outreach",
    icon: Mail,
    title: "Outreach drafts",
    description: "Generate a cold email + LinkedIn DM tailored to a JD. Copy-only — we never send for you.",
  },
  {
    href: "/dashboard/tools/simulate",
    icon: TrendingUp,
    title: "Career simulation",
    description: "Project how readiness and market match change if you learn specific skills.",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Tools" title="Pro toolkit" description="Two AI helpers for outreach and planning." />

      <div className="grid gap-4 md:grid-cols-2">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="p-6 hover:border-neutral-300 transition-colors h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                  <t.icon className="h-5 w-5 text-neutral-700" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  <Sparkles className="h-2.5 w-2.5" /> Pro
                </span>
              </div>
              <h3 className="text-base font-semibold text-neutral-950">{t.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{t.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
