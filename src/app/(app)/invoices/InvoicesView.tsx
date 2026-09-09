"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { InvoiceStatus } from "@prisma/client";
import type { BadgeStatus } from "@/components/ui/Badge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PlusIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { InvoiceListRow } from "@/server/invoices";

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

function statusToBadge(status: InvoiceStatus): BadgeStatus {
  return status.toLowerCase() as BadgeStatus;
}

const STATUS_OPTIONS: { value: "all" | InvoiceStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function InvoicesView({ invoices }: { invoices: InvoiceListRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesQuery =
        !query ||
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.customerName.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-foreground">Invoices</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | InvoiceStatus)}
            className="w-40"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            aria-label="Search invoices"
            placeholder="Search invoices…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
          />
          <Link href="/invoices/new">
            <Button variant="primary">
              <PlusIcon className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No invoices yet</CardTitle>
            <CardDescription>Create your first invoice to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/invoices/new">
              <Button variant="primary">
                <PlusIcon className="h-4 w-4" />
                New Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Invoice #</TableHead>
              <TableHead className="whitespace-nowrap">Customer</TableHead>
              <TableHead numeric className="whitespace-nowrap">
                Amount
              </TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No invoices match your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                >
                  <TableCell className="whitespace-nowrap font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {invoice.customerName}
                  </TableCell>
                  <TableCell numeric className="whitespace-nowrap">
                    {formatCurrency(invoice.totalAmount, invoice.currencyCode)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge status={statusToBadge(invoice.status)} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(invoice.issueDate)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
