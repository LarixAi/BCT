import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Splash AccentButton — Midnight · 52px · 14r · extrabold sentence-case */
        default:
          "rounded-[14px] bg-primary text-primary-foreground font-extrabold shadow hover:bg-primary/90",
        destructive:
          "rounded-[14px] bg-destructive text-destructive-foreground font-extrabold shadow-sm hover:bg-destructive/90",
        outline:
          "rounded-[14px] border border-input bg-card font-bold shadow-sm hover:bg-secondary/60",
        secondary:
          "rounded-[14px] border border-border bg-[#F2F4F7] text-foreground font-bold shadow-sm hover:bg-[#E8EBF0]",
        /** Splash soft SecondaryButton — Soft well · Driver Blue label */
        soft: "rounded-[14px] border border-driver-blue/25 bg-driver-blue-soft text-driver-blue font-bold shadow-sm hover:bg-driver-blue-soft/80",
        ghost: "rounded-[14px] font-bold hover:bg-secondary/60",
      },
      size: {
        default: "min-h-[52px] px-4 py-3.5",
        sm: "min-h-10 rounded-[12px] px-3 text-xs",
        lg: "min-h-[52px] rounded-[14px] px-8 text-base font-extrabold",
        icon: "size-11 rounded-[14px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
