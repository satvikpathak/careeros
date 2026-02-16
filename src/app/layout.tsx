import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerOS — AI-Powered Career Intelligence",
  description:
    "AI-driven career analysis, resume parsing, job matching, and career simulations. Your intelligent career copilot.",
  keywords: ["career", "AI", "resume", "jobs", "career intelligence", "job matching"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${outfit.variable} ${geistMono.variable} font-sans antialiased`}
        >
          <QueryProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </QueryProvider>

          {/* Global SVG Filters for Liquid Glass Effect */}
          <svg style={{ display: 'none' }}>
            <defs>
              <filter id="container-glass" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
                <feGaussianBlur in="noise" stdDeviation="0.02" result="blur" />
                <feDisplacementMap in="SourceGraphic" in2="blur" scale="40" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <filter id="btn-glass" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02 0.02" numOctaves="3" seed="42" result="noise" />
              <feGaussianBlur in="noise" stdDeviation="0.08" result="blur" />
              <feDisplacementMap in="SourceGraphic" in2="blur" scale="25" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="shimmer-filter">
              <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="2" seed="5">
                <animate attributeName="seed" from="1" to="100" dur="10s" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="5" />
            </filter>
            </defs>
          </svg>
        </body>
      </html>
    </ClerkProvider>
  );
}
