"use client";

import { useMemo, useState } from "react";
import type { BadgeStatus } from "@/components/ui/Badge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { CustomerWithStats } from "@/server/customers";
import { CustomerFormModal } from "./CustomerFormModal";
import { DeleteCustomerModal } from "./DeleteCustomerModal";

function getStatusBadge(customer: CustomerWithStats): { status: BadgeStatus; label: string } | null {
  if (customer.hasOverdueInvoice) return { status: "overdue", label: "Overdue" };
  if (customer.invoiceCount > 0) return { status: "paid", label: "Active" };
  return null;
}

export function CustomersView({ customers }: { customers: CustomerWithStats[] }) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerWithStats | null>(null);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        (customer.companyName?.toLowerCase().includes(query) ?? false) ||
        (customer.vatNumber?.toLowerCase().includes(query) ?? false)
    );
  }, [customers, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-foreground">Customers</h1>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Search customers"
            placeholder="Search customers…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
          />
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No customers yet</CardTitle>
            <CardDescription>
              Add your first customer to start creating invoices for them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              New customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Customer</TableHead>
              <TableHead className="whitespace-nowrap">VAT</TableHead>
              <TableHead numeric className="whitespace-nowrap">
                Invoices
              </TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No customers match your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
                const badge = getStatusBadge(customer);
                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => setEditingCustomer(customer)}
                  >
                    <TableCell className="whitespace-nowrap font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {customer.vatNumber || "—"}
                    </TableCell>
                    <TableCell numeric className="whitespace-nowrap">
                      {customer.invoiceCount}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {badge ? (
                        <Badge status={badge.status}>{badge.label}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No invoices</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <IconButton
                        aria-label={`Delete ${customer.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletingCustomer(customer);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      <CustomerFormModal mode="create" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <CustomerFormModal
        key={editingCustomer?.id ?? "edit-empty"}
        mode="edit"
        customer={editingCustomer}
        isOpen={editingCustomer !== null}
        onClose={() => setEditingCustomer(null)}
      />
      <DeleteCustomerModal
        key={deletingCustomer?.id ?? "delete-empty"}
        customer={deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
      />
    </div>
  );
}
