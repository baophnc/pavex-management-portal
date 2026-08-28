import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-3 focus:ring-brand/10 ${className}`}
      {...props}
    />
  );
});
