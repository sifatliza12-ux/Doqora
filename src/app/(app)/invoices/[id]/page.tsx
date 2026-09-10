import { OrganizationSwitcher } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getInvoiceForEdit } from "@/server/invoices";
import { InvoiceBuilder } from "../InvoiceBuilder";

export const metadata = {
  title: "Edit invoice — Doqora",
};

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoiceForEdit(id);

  if (result.status === "no-organization") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active organization</CardTitle>
          <CardDescription>
            Select an existing organization or create a new one to manage invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/invoices" />
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

  if (result.status === "invoice-not-found") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice not found</CardTitle>
          <CardDescription>
            This invoice doesn&apos;t exist, or you don&apos;t have access to it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Keying on status too (not just id) forces a remount on every status
  // transition, discarding any in-progress-but-unsaved form edits rather
  // than leaving them visible-but-disabled after the invoice becomes
  // read-only — status actions never touch content server-side, so the
  // fresh mount always reflects the actually-saved data.
  return (
    <InvoiceBuilder
      key={`${result.invoice.id}-${result.invoice.status}`}
      context={result.context}
      invoice={result.invoice}
    />
  );
}
