"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Briefcase,
  Sparkles,
  BookOpen,
  Map,
} from "lucide-react";
import AppNavbar from "@/components/navigation/AppNavbar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/chat", label: "AI Interview", icon: Bot },
  { href: "/dashboard/resume", label: "Intelligence Audit", icon: FileText },
  { href: "/dashboard/jobs", label: "Job Radar", icon: Briefcase },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen },
  { href: "/dashboard/roadmap", label: "Roadmap", icon: Map },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen gradient-bg">
      <AppNavbar
        links={navItems}
        rightSlot={
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 border border-white/70 text-sm font-semibold text-gray-800 hover:-translate-y-0.5 transition"
          >
            <Sparkles className="w-4 h-4" />
            Explore Landing
          </Link>
        }
      />

      <main className="pt-28 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
