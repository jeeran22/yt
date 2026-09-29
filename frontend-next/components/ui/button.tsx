import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-glowcyan",
        violet: "bg-violet-500 text-white hover:bg-violet-400 shadow-glowviolet",
        secondary: "border border-slate-600/70 bg-slate-800/70 text-slate-100 hover:border-slate-500 hover:bg-slate-700/70",
        ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
        danger: "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
