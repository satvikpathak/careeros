"use client";

import { useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import AppNavbar from "@/components/navigation/AppNavbar";
import { useRoadmapStore } from "@/stores/roadmap-store";
import { UsageChip } from "@/components/ui/usage-chip";

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userId } = useAuth();
  const bindToUser = useRoadmapStore((s) => s.bindToUser);

  useEffect(() => {
    bindToUser(userId ?? null);
  }, [userId, bindToUser]);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/resume", label: "Resume" },
    { href: "/dashboard/history", label: "History" },
    { href: "/dashboard/roadmap", label: "Roadmap" },
    { href: "/dashboard/jobs", label: "Jobs" },
    { href: "/dashboard/applications", label: "Applications" },
    { href: "/dashboard/resources", label: "Resources" },
    { href: "/dashboard/chat", label: "AI Interview" },
    { href: "/dashboard/settings", label: "Settings" },
    { href: "/dashboard/billing", label: "Billing" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppNavbar
        links={navLinks}
        rightSlot={(
          <div className="flex items-center gap-3">
            <UsageChip />
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: { userButtonAvatarBox: "w-9 h-9 border border-neutral-200" },
              }}
            />
          </div>
        )}
      />

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 pb-8 pt-32 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
