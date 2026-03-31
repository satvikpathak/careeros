"use client";

import { motion } from "framer-motion";
import { Search, Bell, RefreshCw } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export default function DashboardHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
      className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-50 px-6 lg:px-8 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Left: Search */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-md w-full hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-[#020617] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#005BB7]/30 focus:ring-2 focus:ring-[#005BB7]/10 transition-all"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563] hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563] hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          </motion.button>

          <div className="w-px h-8 bg-gray-100 mx-1" />

          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9 rounded-xl",
              },
            }}
          />
        </div>
      </div>
    </motion.header>
  );
}
