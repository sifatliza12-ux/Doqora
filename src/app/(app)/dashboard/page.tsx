import type { BadgeStatus } from "@/components/ui/Badge";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Dashboard — Doqora",
};

interface StatItem {
  label: string;
  value: string;
  tone?: "success" | "danger";
}

const stats: StatItem[] = [
  { label: "Revenue", value: "SAR 1,284,500.00" },
  { label: "Outstanding", value: "SAR 328,400.00" },
  { label: "Paid", value: "72", tone: "success" },
  { label: "Overdue", value: "14", tone: "danger" },
];

const toneClasses: Record<"success" | "danger", string> = {
  success: "text-success",
  danger: "text-danger",
};

interface RecentInvoice {
  number: string;
  customer: string;
  amount: string;
  status: BadgeStatus;
}

const recentInvoices: RecentInvoice[] = [
  {
    number: "INV-0124",
    customer: "Saudi Radwa Food Co.",
    amount: "SAR 283,110.68",
    status: "paid",
  },
  {
    number: "INV-0123",
    customer: "ABC Trading Co.",
    amount: "SAR 45,200.00",
    status: "sent",
  },
  {
    number: "INV-0121",
    customer: "Al Khaleej Services",
    amount: "SAR 12,850.00",
    status: "overdue",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p
                className={cn(
                  "text-end text-lg font-semibold",
                  stat.tone ? toneClasses[stat.tone] : "text-foreground"
                )}
              >
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="border-b border-border" />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Recent invoices</p>
        <Card>
          <ul className="divide-y divide-border">
            {recentInvoices.map((invoice) => (
              <li
                key={invoice.number}
                className="flex items-start justify-between gap-4 p-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {invoice.number}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {invoice.customer}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {invoice.amount}
                  </span>
                  <Badge status={invoice.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
