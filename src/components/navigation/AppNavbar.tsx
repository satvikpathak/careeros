"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Sparkles, X } from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode, type ElementType } from "react";
import { cn } from "@/lib/utils";

export type NavLink = {
  href: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
};

interface AppNavbarProps {
  links: NavLink[];
  rightSlot?: ReactNode;
  className?: string;
  variant?: "light" | "dark";
}

const linkHover = {
  rest: { y: 0, opacity: 0.8 },
  hover: { y: -2, opacity: 1 },
};

export function AppNavbar({ links, rightSlot, className, variant = "light" }: AppNavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeHref = useMemo(() => {
    const nonHashLinks = links.filter((l) => !l.href.startsWith("#"));
    const match = nonHashLinks.find((l) => pathname.startsWith(l.href));
    return match?.href;
  }, [links, pathname]);

  const textColor = variant === "dark" ? "text-white" : "text-gray-900";
  const subtleText = variant === "dark" ? "text-white/70" : "text-gray-500";

  return (
    <header className={cn("fixed top-0 left-0 right-0 z-50 pointer-events-none", className)}>
      <div className="flex justify-center px-4 pt-5">
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={cn(
            "max-w-6xl w-full glass-premium glass-liquid rounded-full shadow-2xl shadow-indigo-200/30",
            "backdrop-blur-xl border border-white/40 px-4 sm:px-6 py-2.5 flex items-center gap-3",
            "pointer-events-auto"
          )}
        >
          <Link href="/" className="flex items-center gap-2 group">
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-300/50">
              <Sparkles className="h-4 w-4 text-white" />
              <motion.span
                layoutId="brand-glow"
                className="absolute inset-0 rounded-2xl bg-white/15 blur-lg"
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              />
            </span>
            <span className={cn("text-base font-semibold tracking-tight", textColor)}>
              Career<span className="text-indigo-500">OS</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 mx-auto">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = activeHref ? activeHref === link.href : link.href.startsWith("#") ? false : pathname === link.href;
              const isHash = link.href.startsWith("#");
              const Comp: ElementType = isHash ? "a" : Link;

              return (
                <motion.div key={link.href} variants={linkHover} initial="rest" whileHover="hover" animate="rest" className="relative">
                  <Comp
                    href={link.href}
                    className={cn(
                      "relative px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors",
                      isActive ? "text-indigo-600" : subtleText,
                      "hover:text-indigo-600"
                    )}
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl bg-indigo-50/80 border border-indigo-100"
                        transition={{ type: "spring", stiffness: 280, damping: 24 }}
                      />
                    )}
                  </Comp>
                </motion.div>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2">{rightSlot}</div>

          <button
            className="md:hidden ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60 border border-white/70 text-gray-700 shadow-sm"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </motion.nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="md:hidden px-4"
          >
            <div className="max-w-6xl mx-auto mt-3 glass-card rounded-3xl border border-white/60 shadow-xl overflow-hidden">
              <div className="divide-y divide-white/50">
                <div className="p-3 flex flex-col gap-1">
                  {links.map((link) => {
                    const Icon = link.icon;
                    const isHash = link.href.startsWith("#");
                    const Comp: ElementType = isHash ? "a" : Link;
                    const isActive = activeHref ? activeHref === link.href : pathname === link.href;

                    return (
                      <Comp
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-colors",
                          isActive ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                        {link.label}
                      </Comp>
                    );
                  })}
                </div>
                {rightSlot ? <div className="p-3 bg-white/60">{rightSlot}</div> : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default AppNavbar;
