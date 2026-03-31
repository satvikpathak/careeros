"use client";

import DashboardSidebar from "@/components/navigation/DashboardSidebar";
import DashboardHeader from "@/components/navigation/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAFBFF]">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content area — shifted right by sidebar width */}
      <div className="lg:ml-[260px] min-h-screen flex flex-col transition-all duration-300">
        {/* Top Header */}
        <DashboardHeader />

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
