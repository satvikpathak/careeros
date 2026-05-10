"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900/20 aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
  {
    variants: {
      variant: {
        default: "bg-neutral-950 text-white hover:bg-neutral-800 shadow-sm",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        outline: "border border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-50 shadow-sm",
        secondary: "bg-neutral-100 text-neutral-950 hover:bg-neutral-200",
        ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
        link: "text-neutral-950 underline-offset-4 hover:underline",
        glass: "bg-white/30 text-neutral-900 border border-white/50 backdrop-blur-xl hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

const RawButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : "button"

    return (
      <Comp
        ref={asChild ? undefined : ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

RawButton.displayName = "RawButton"

function Button({ disabled, ...props }: ButtonProps) {
  const hover = disabled ? undefined : { y: -1 }
  const tap = disabled ? undefined : { y: 0, scale: 0.98 }

  return (
    <motion.div
      whileHover={hover}
      whileTap={tap}
      transition={{ type: "spring", stiffness: 320, damping: 24, mass: 0.8 }}
      className="inline-flex"
    >
      <RawButton disabled={disabled} {...props} />
    </motion.div>
  )
}

export { Button, buttonVariants }
