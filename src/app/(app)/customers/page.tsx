import type { BadgeStatus } from "@/components/ui/Badge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

export const metadata = {
  title: "Customers — Doqora",
};

interface Customer {
  name: string;
  vatNumber: string;
  invoiceCount: number;
  status: "active" | "overdue";
}

const customers: Customer[] = [
  {
    name: "Saudi Radwa Food Co.",
    vatNumber: "300281871800003",
    invoiceCount: 6,
    status: "active",
  },
  {
    name: "ABC Trading Co.",
    vatNumber: "300112233440003",
    invoiceCount: 3,
    status: "active",
  },
  {
    name: "Al Khaleej Services",
    vatNumber: "300998877660003",
    invoiceCount: 1,
    status: "overdue",
  },
];

// Customer status has no canonical badge entry of its own — "active" reuses
// the "paid" (green) token/styling, "overdue" reuses the invoice one as-is.
const statusBadge: Record<Customer["status"], { status: BadgeStatus; label: string }> = {
  active: { status: "paid", label: "Active" },
  overdue: { status: "overdue", label: "Overdue" },
};

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-foreground">Customers</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search customers"
            className="rounded-button p-2 text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          <Button variant="primary">
            <PlusIcon className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Customer</TableHead>
            <TableHead className="whitespace-nowrap">VAT</TableHead>
            <TableHead numeric className="whitespace-nowrap">
              Invoices
            </TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const badge = statusBadge[customer.status];
            return (
              <TableRow key={customer.vatNumber}>
                <TableCell className="whitespace-nowrap font-medium">
                  {customer.name}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {customer.vatNumber}
                </TableCell>
                <TableCell numeric className="whitespace-nowrap">
                  {customer.invoiceCount}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge status={badge.status}>{badge.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
