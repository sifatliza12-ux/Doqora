import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FormSectionProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  className,
  ...props
}: FormSectionProps) {
  return (
    <div
      className={cn("border-b border-border pb-6 last:border-b-0 last:pb-0", className)}
      {...props}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
