import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-ring p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[15px] font-bold tracking-tight text-white", className)} {...props} />;
}

export function CardSub({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-[13px] leading-relaxed text-slate-400", className)} {...props} />;
}

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[12.5px] font-semibold uppercase tracking-wider text-slate-300">{children}</span>
      {hint ? <span className="text-[11.5px] text-slate-500">{hint}</span> : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20",
        props.className
      )}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full appearance-none rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20",
        props.className
      )}
    />
  );
}
