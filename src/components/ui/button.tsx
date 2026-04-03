"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-black text-white border border-black shadow-md hover:bg-zinc-800",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-gray-200/70 bg-white/70 backdrop-blur-md text-gray-700 hover:-translate-y-0.5 hover:shadow-md",
        secondary:
          "bg-white/60 text-gray-900 border border-white/70 hover:-translate-y-0.5 hover:shadow-md",
        ghost:
          "text-gray-700 hover:bg-white/60 hover:text-gray-900 border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "bg-white/30 text-gray-900 border border-white/50 backdrop-blur-xl hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        xs: "h-7 gap-1 rounded-lg px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-lg gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-11 rounded-xl px-7 has-[>svg]:px-5",
        icon: "size-10",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
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
  const hover = disabled ? undefined : { y: -2, scale: 1.01 }
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
