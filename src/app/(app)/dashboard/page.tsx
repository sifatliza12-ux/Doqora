import { OrganizationSwitcher } from "@clerk/nextjs";
import type { BadgeStatus } from "@/components/ui/Badge";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getCurrentBusiness } from "@/server/business";
import { type DashboardRecentInvoice, getDashboardData } from "@/server/dashboard";
import { OnboardingModal } from "./OnboardingModal";

export const metadata = {
  title: "Dashboard — Doqora",
};

function formatCurrency(amount: number, currencyCode: string): string {
  return `${currencyCode} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusToBadge(status: DashboardRecentInvoice["status"]): BadgeStatus {
  return status.toLowerCase() as BadgeStatus;
}

export default async function DashboardPage() {
  const [result, currentBusiness] = await Promise.all([getDashboardData(), getCurrentBusiness()]);

  if (result.status === "no-organization") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active organization</CardTitle>
          <CardDescription>
            Select an existing organization or create a new one to see your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
          />
        </CardContent>
      </Card>
    );
  }

  if (result.status === "not-found") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setting up your workspace</CardTitle>
          <CardDescription>
            We&apos;re still finishing setup for this organization. Try refreshing in a
            moment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stats: { label: string; value: string; tone?: "success" | "danger" }[] = [
    { label: "Revenue", value: formatCurrency(result.revenue, result.currencyCode) },
    { label: "Outstanding", value: formatCurrency(result.outstanding, result.currencyCode) },
    { label: "Paid", value: String(result.paidCount), tone: "success" },
    { label: "Overdue", value: String(result.overdueCount), tone: "danger" },
  ];

  const toneClasses: Record<"success" | "danger", string> = {
    success: "text-success",
    danger: "text-danger",
  };

  // Minimal "never touched their profile" signal — address and CR number are
  // both things a real business fills in during actual setup, so both being
  // empty is a reliable sign Settings has never been visited. Gated on
  // onboardingDismissedAt so a Skip (which leaves the profile empty on
  // purpose) doesn't re-trigger the modal on the next login.
  const showOnboarding =
    currentBusiness.status === "ok" &&
    !currentBusiness.business.onboardingDismissedAt &&
    !currentBusiness.business.address &&
    !currentBusiness.business.crNumber;

  return (
    <div className="flex flex-col gap-6">
      {showOnboarding && currentBusiness.status === "ok" && (
        <OnboardingModal business={currentBusiness.business} />
      )}
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
        {result.recentInvoices.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No invoices yet</CardTitle>
              <CardDescription>Invoices you create will show up here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {result.recentInvoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {invoice.invoiceNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {invoice.customerName}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(invoice.totalAmount, result.currencyCode)}
                    </span>
                    <Badge status={statusToBadge(invoice.status)} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
