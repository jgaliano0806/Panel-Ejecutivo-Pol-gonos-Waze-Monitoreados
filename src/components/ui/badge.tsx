import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-100 text-primary-700 hover:bg-primary-200",
        secondary: "border-transparent bg-secondary-100 text-secondary-700 hover:bg-secondary-200",
        success: "border-transparent bg-green-100 text-green-700 hover:bg-green-200 shadow-sm",
        warning: "border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-200 shadow-sm",
        danger: "border-transparent bg-red-100 text-red-700 hover:bg-red-200 shadow-sm",
        outline: "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
        critical: "border-2 border-red-400 bg-red-500 text-white font-black animate-pulse shadow-lg",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
        xl: "px-6 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
