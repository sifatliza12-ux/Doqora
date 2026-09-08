"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  /** Background shown on hover. Use "background" when the button sits on a
   * surface-colored container (e.g. a Modal header) so the hover state
   * still reads against it. Defaults to "surface". */
  hoverBackground?: "surface" | "background";
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "p-1",
  md: "p-1.5",
  lg: "p-2",
};

const hoverBackgroundClasses: Record<"surface" | "background", string> = {
  surface: "hover:bg-surface",
  background: "hover:bg-background",
};

export function IconButton({
  className,
  size = "md",
  hoverBackground = "surface",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-button text-muted-foreground hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald",
        sizeClasses[size],
        hoverBackgroundClasses[hoverBackground],
        className
      )}
      {...props}
    />
  );
}
