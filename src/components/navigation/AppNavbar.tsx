"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const activeHref = useMemo(() => {
    const nonHash = links.filter((l) => !l.href.startsWith("#"));
    return nonHash.find((l) => pathname.startsWith(l.href))?.href;
  }, [links, pathname]);

  const navLinks = links.length ? links : [
    { href: "/", label: "Home" },
    { href: "#about", label: "About" },
    { href: "#docs", label: "Docs" },
  ];

  const ctaNode = (
    <Link
      href={ctaHref}
      className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
    >
      {ctaLabel}
    </Link>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-5">
      <nav
        className="pointer-events-auto flex w-full max-w-6xl items-center justify-between rounded-xl border border-white/30 bg-white/40 px-4 sm:px-6 py-3 shadow-lg shadow-indigo-200/30 backdrop-blur-md transition"
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/50 shadow">
              <img
                src="https://i.pinimg.com/474x/10/cd/a9/10cda9e715b2b6799908fefbacae4d6b.jpg"
                alt="Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-sm font-semibold text-gray-900">CareerOS</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-800">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors",
                activeHref === link.href ? "text-black" : "hover:text-black text-gray-700"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {rightSlot ?? ctaNode}
        </div>

        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/70 border border-white/60 text-gray-700 shadow"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden mt-2 w-full max-w-6xl rounded-xl border border-white/40 bg-white/70 p-4 shadow-lg backdrop-blur-md">
          <div className="flex flex-col gap-3 text-sm font-semibold text-gray-800">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 hover:bg-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-1">{rightSlot ?? ctaNode}</div>
          </div>
        </div>
      )}
    </header>
  );
}
