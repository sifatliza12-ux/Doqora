import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-table border border-border">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-surface", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors hover:bg-surface/60", className)} {...props} />
  );
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-align per the Design System's numeric-alignment rule. */
  numeric?: boolean;
}

export function TableHead({ className, numeric = false, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        numeric ? "text-end" : "text-start",
        className
      )}
      {...props}
    />
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Right-align per the Design System's numeric-alignment rule. */
  numeric?: boolean;
}

export function TableCell({ className, numeric = false, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-foreground",
        numeric ? "text-end" : undefined,
        className
      )}
      {...props}
    />
  );
}
