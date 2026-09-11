import Link from "next/link";
import { OrganizationSwitcher } from "@clerk/nextjs";
import type { BadgeStatus } from "@/components/ui/Badge";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { resolvePeriod } from "@/lib/tax-report-period";
import { getTaxReportData, type TaxReportInvoiceRow } from "@/server/tax-report";
import { TaxReportPeriodPicker } from "./TaxReportPeriodPicker";

export const metadata = {
  title: "Tax Report — Doqora",
};

function formatCurrency(amount: number, currencyCode: string): string {
  return `${currencyCode} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusToBadge(status: TaxReportInvoiceRow["status"]): BadgeStatus {
  return status.toLowerCase() as BadgeStatus;
}

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const result = await getTaxReportData(period.from, period.to);

  if (result.status === "no-organization") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active organization</CardTitle>
          <CardDescription>
            Select an existing organization or create a new one to see your tax report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/tax-report"
            afterSelectOrganizationUrl="/tax-report"
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

  const { currencyCode, totals, invoices } = result;

  const stats: { label: string; value: string }[] = [
    { label: "Total sales", value: formatCurrency(totals.subtotal, currencyCode) },
    { label: "VAT collected", value: formatCurrency(totals.vatAmount, currencyCode) },
    { label: "Net total", value: formatCurrency(totals.totalAmount, currencyCode) },
    { label: "Invoices", value: String(totals.invoiceCount) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-foreground">Tax Report</h1>
        <TaxReportPeriodPicker
          preset={period.preset}
          fromInput={period.fromInput}
          toInput={period.toInput}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-end text-lg font-semibold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="border-b border-border" />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Invoices included ({invoices.length})
        </p>
        {invoices.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No qualifying invoices in this period</CardTitle>
              <CardDescription>
                Only Sent, Paid, and Overdue invoices with an issue date in the selected
                range count toward VAT owed.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Invoice #</TableHead>
                <TableHead className="whitespace-nowrap">Customer</TableHead>
                <TableHead className="whitespace-nowrap">Issue date</TableHead>
                <TableHead numeric className="whitespace-nowrap">
                  Subtotal
                </TableHead>
                <TableHead numeric className="whitespace-nowrap">
                  VAT
                </TableHead>
                <TableHead numeric className="whitespace-nowrap">
                  Total
                </TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {invoice.customerName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(invoice.issueDate)}
                  </TableCell>
                  <TableCell numeric className="whitespace-nowrap">
                    {formatCurrency(invoice.subtotal, currencyCode)}
                  </TableCell>
                  <TableCell numeric className="whitespace-nowrap">
                    {formatCurrency(invoice.vatAmount, currencyCode)}
                  </TableCell>
                  <TableCell numeric className="whitespace-nowrap">
                    {formatCurrency(invoice.totalAmount, currencyCode)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge status={statusToBadge(invoice.status)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
