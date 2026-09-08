import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface BadgeProps {
  status: BadgeStatus;
  /** Overrides the default status label — e.g. reusing the "paid" (green)
   * styling for a customer's "Active" status, which has no canonical entry. */
  children?: ReactNode;
  className?: string;
}

const statusLabels: Record<BadgeStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const statusClasses: Record<BadgeStatus, string> = {
  draft: "bg-badge-draft text-badge-draft-foreground",
  sent: "bg-badge-sent text-badge-sent-foreground",
  paid: "bg-badge-paid text-badge-paid-foreground",
  overdue: "bg-badge-overdue text-badge-overdue-foreground",
  cancelled: "bg-badge-cancelled text-badge-cancelled-foreground",
};

export function Badge({ status, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusClasses[status],
        className
      )}
    >
      {children ?? statusLabels[status]}
    </span>
  );
}
