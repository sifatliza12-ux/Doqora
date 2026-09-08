"use client";

import { useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "./icons";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({
  className,
  label,
  error,
  id,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "h-10 w-full appearance-none rounded-input border border-border bg-surface ps-3 pe-9 text-sm text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-emerald focus:border-emerald",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus:ring-danger focus:border-danger",
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
