"use client";

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

interface GlossyButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'glass' | 'liquid';
  className?: string;
  asChild?: boolean;
}

const GlossyButton = React.forwardRef<HTMLButtonElement, GlossyButtonProps>(
  ({ children, variant = 'primary', className, asChild = false, ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-to-br from-indigo-500/80 to-purple-600/80 text-white border-white/20",
      secondary: "bg-white/10 text-white border-white/10 backdrop-blur-md",
      glass: "glossy-bubble text-white border-white/40 shadow-xl",
      liquid: "btn-liquid text-white border-white/20 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-105 transition-all duration-500",
    };

    const Comp = asChild ? Slot : "button";
    
    // We use a regular motion component if not asChild, 
    // but if asChild, we need to be careful with motion + slot.
    // The safest way is to wrap the Slot in a motion div if asChild, 
    // or just use motion.button if not.
    
    if (asChild) {
      return (
        <motion.div
          whileHover={{ y: -4, scale: 1.02, rotateX: 5 }}
          whileTap={{ y: 0, scale: 0.98 }}
          className={cn(
            "relative inline-flex items-center justify-center rounded-full transition-all duration-300",
            "border overflow-hidden group",
            variants[variant],
            "shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
            className
          )}
        >
          <Slot ref={ref} {...(props as any)}>
            {children}
          </Slot>
          
          {/* Shine Animation overlay - now safe as it's a sibling of Slot, not a child */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45 group-hover:animate-shimmer" />
          </div>
        </motion.div>
      );
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -4, scale: 1.02, rotateX: 5 }}
        whileTap={{ y: 0, scale: 0.98 }}
        className={cn(
          "relative px-8 py-3 rounded-full font-medium transition-all duration-300",
          "border overflow-hidden group flex items-center justify-center gap-2",
          variants[variant],
          "shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
          className
        )}
        {...(props as any)}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>

        {/* Shine Animation */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45 group-hover:animate-shimmer" />
        </div>
      </motion.button>
    );
  }
);

GlossyButton.displayName = "GlossyButton";

export default GlossyButton;
