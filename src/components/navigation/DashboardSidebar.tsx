"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  FileSearch,
  Radar,
  BookOpen,
  Map,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/chat", label: "AI Interview", icon: MessageSquare },
  { href: "/dashboard/resume", label: "Intelligence Audit", icon: FileSearch },
  { href: "/dashboard/jobs", label: "Job Radar", icon: Radar },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen },
  { href: "/dashboard/roadmap", label: "Roadmap", icon: Map },
];

const sidebarVariants: Variants = {
  hidden: { x: -260, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <motion.div
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-full"
    >
      {/* Logo */}
      <motion.div variants={itemVariants} className="px-6 py-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#005BB7] to-[#020617] flex items-center justify-center shadow-lg shadow-blue-200/50">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <h1 className="text-[15px] font-bold text-[#020617] tracking-tight">CareerOS</h1>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.15em]">Intelligence</p>
          </motion.div>
        )}
      </motion.div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gray-100 mb-2" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {sidebarItems.map((item) => {
          const active = isActive(item.href);
          return (
            <motion.div key={item.href} variants={itemVariants}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  active
                    ? "text-[#005BB7]"
                    : "text-[#4B5563] hover:text-[#020617] hover:bg-gray-50/80"
                )}
              >
                {/* Active indicator background */}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-[#EFF6FF] rounded-xl border border-[#005BB7]/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Icon container */}
                <div
                  className={cn(
                    "relative z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                    active
                      ? "bg-[#005BB7]/10 text-[#005BB7]"
                      : "bg-transparent text-[#9CA3AF] group-hover:text-[#4B5563] group-hover:bg-gray-100"
                  )}
                >
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: active ? 0 : -5 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                  </motion.div>
                </div>

                {/* Label */}
                {!collapsed && (
                  <span className="relative z-10 font-semibold text-[13px]">
                    {item.label}
                  </span>
                )}

                {/* Active dot */}
                {active && !collapsed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#005BB7] z-10"
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Upgrade Card */}
      {!collapsed && (
        <motion.div
          variants={itemVariants}
          className="mx-4 mb-4"
        >
          <motion.div
            whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,91,183,0.15)" }}
            className="bg-gradient-to-br from-[#005BB7] to-[#004B99] rounded-2xl p-5 text-white relative overflow-hidden"
          >
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200">Pro Plan</span>
              </div>
              <p className="text-sm font-bold leading-tight mb-3">
                Unlock advanced AI career insights
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2 bg-white text-[#005BB7] rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-shadow"
              >
                Upgrade Now
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Collapse toggle */}
      <motion.div variants={itemVariants} className="px-3 pb-4 hidden lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-xl text-sm font-medium text-[#9CA3AF] hover:text-[#4B5563] hover:bg-gray-50 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-[13px]">Collapse</span>}
        </button>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[100] w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center text-[#4B5563] hover:text-[#020617] transition-colors"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/20 z-[90] backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-gray-100 z-[90] transition-all duration-300 flex flex-col",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
