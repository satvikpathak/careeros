"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Syne } from "next/font/google";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const syne = Syne({ subsets: ["latin"], weight: ["800"] });

type NavLink = {
  href: string;
  label: string;
};

interface AppNavbarProps {
  links: NavLink[];
  ctaHref?: string;
  ctaLabel?: string;
  rightSlot?: ReactNode;
}

export default function AppNavbar({ links, ctaHref = "/sign-up", ctaLabel = "Sign Up", rightSlot }: AppNavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHomePage = pathname === "/";

  const activeHref = useMemo(() => {
    const nonHash = links.filter((l) => !l.href.startsWith("#"));
    return nonHash.find((l) => pathname.startsWith(l.href))?.href;
  }, [links, pathname]);

  const navLinks = links.length ? links : [
    { href: "/", label: "Home" },
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
  ];

  const ctaNode = (
    <motion.div
      key="navbar-cta"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link
        href={ctaHref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition",
          isHomePage
            ? "border border-white/50 bg-white/30 text-gray-900 shadow-md backdrop-blur-md hover:bg-white/45"
            : "bg-black text-white shadow-md hover:shadow-lg"
        )}
      >
        {ctaLabel}
      </Link>
    </motion.div>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-5">
      <div className="flex justify-center">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-auto flex w-full max-w-6xl items-center justify-between rounded-xl px-4 py-3 backdrop-blur-md transition sm:px-6",
            isHomePage
              ? "border border-white/30 bg-white/40 shadow-lg shadow-indigo-200/30"
              : "border border-black/10 bg-white/80 shadow-md"
          )}
        >
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className={cn(syne.className, "text-2xl leading-none font-extrabold tracking-tight text-gray-900")}>cresco</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-800">
            {navLinks.map((link) => (
              <motion.div
                key={link.href}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                <Link
                  href={link.href}
                  className={cn(
                    "transition-colors",
                    activeHref === link.href ? "text-black" : "hover:text-black text-gray-700"
                  )}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {rightSlot ?? ctaNode}
          </div>

          <button
            className={cn(
              "md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-700",
              isHomePage
                ? "border border-white/50 bg-white/50 shadow"
                : "border border-black/15 bg-white shadow-sm"
            )}
            onClick={() => setOpen((o: boolean) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </motion.nav>
      </div>

      <AnimatePresence>
        {open && (
          <div className="flex justify-center w-full">
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "md:hidden mt-2 w-full max-w-6xl rounded-xl p-4 backdrop-blur-md",
                isHomePage
                  ? "border border-white/40 bg-white/70 shadow-lg"
                  : "border border-black/10 bg-white/95 shadow-md"
              )}
            >
              <div className="flex flex-col gap-3 text-sm font-semibold text-gray-800">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-2 py-2 transition-colors hover:bg-black/5"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div 
                  key="mobile-cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: navLinks.length * 0.05 }}
                  className="pt-1"
                >
                  {rightSlot ?? ctaNode}
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
